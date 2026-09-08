"""Gestion des abondements employeurs : créditer les comptes salariés.

C'est la seule route de l'application qui **crée** de l'argent sur un compte.
Tout le reste en dépense. Trois conséquences, et elles expliquent la forme de
ce fichier :

1. **Une clé d'idempotence est obligatoire.** Un double-clic, un réseau qui
   repart, un onglet rechargé : sans clé, chacun crédite une seconde fois, et
   une écriture d'argent en double ne se rattrape pas — le schéma n'a pas de
   suppression d'abondement. La clé est portée par `abondements.reference`,
   unique en base, et un renvoi de la même clé rend la **même** réponse avec
   `rejoue: true` plutôt qu'une erreur : c'est ce que le client attend d'une
   reprise.
2. **Un compte fermé ne se crédite pas.** Suspendu ou clôturé, le titulaire ne
   peut pas dépenser : l'abonder reviendrait à immobiliser de l'argent public
   sur un compte que personne ne peut utiliser.
3. **Le montant est plafonné.** Pas par prudence morale, mais parce qu'une
   saisie au clavier confond un jour les euros et les centimes, et que
   `CheckConstraint("montant > 0")` n'attrape que le signe.

Le crédit part de l'employeur du salarié, pas d'un employeur choisi à l'écran :
c'est une donnée du compte, et la laisser saisir permettrait d'imputer la
dépense au mauvais donneur d'ordre.
"""

import re
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from accounts import nom_affiche
from decorators import admin_required
from flask_jwt_extended import get_jwt_identity
from models import Abondement, CompteStatut, Salaries, db
from services.audit_service import record_event

admin_abondements_bp = Blueprint('admin_abondements', __name__)

#: Le plafond d'une saisie unitaire, en centimes. Cinq mille euros.
#:
#: Aucune règle du dispositif ne le fixe ; c'est un garde-fou de saisie. Le
#: dépasser n'est pas interdit, c'est fractionné — et le refus dit le plafond,
#: pour qu'on sache quoi faire plutôt que de réessayer au hasard.
PLAFOND_CENTS = 500_000

#: La forme admise d'une clé d'idempotence.
#:
#: Restreinte, et pas seulement par hygiène : la clé d'un lot est cherchée au
#: rejeu par un `LIKE "<clé>:%"`, où « % » et « _ » sont des jokers. Une clé
#: qui en contiendrait ferait correspondre les saisies des autres. Un
#: identifiant tiré côté navigateur tient dans ce jeu.
CLE_VALIDE = re.compile(r"^[A-Za-z0-9-]{8,120}$")


def _agent_courant():
    identite = get_jwt_identity() or ""
    _, _, brut = str(identite).partition(":")
    return int(brut) if brut.isdigit() else None


def _ligne(abondement):
    salarie = abondement.salarie
    return {
        "id": abondement.id,
        "salarieId": abondement.salarie_id,
        "salarie": nom_affiche(salarie) if salarie else f"Salarié #{abondement.salarie_id}",
        "montantCents": round(abondement.montant * 100),
        "at": abondement.horodatage.isoformat() if abondement.horodatage else None,
        "employeur": (
            abondement.employeur.raison_sociale if abondement.employeur else ""
        ),
        "agentId": abondement.agent_admin_id,
        "reference": abondement.reference or "",
    }


@admin_abondements_bp.route('/abondements', methods=['GET'])
@admin_required
def lister_abondements():
    """Les crédits versés, du plus récent au plus ancien.

    `?salarie=<id>` restreint à un compte. `?limite=<n>` borne la liste, à 200
    par défaut : l'écran en affiche une page, et rendre les cinquante et un
    abondements du seed plus tous ceux saisis depuis n'apprendrait rien de plus.
    """
    query = Abondement.query

    brut = (request.args.get('salarie') or '').strip()
    if brut.isdigit():
        query = query.filter_by(salarie_id=int(brut))

    try:
        limite = min(max(int(request.args.get('limite', 200)), 1), 1000)
    except (TypeError, ValueError):
        limite = 200

    lignes = query.order_by(Abondement.horodatage.desc()).limit(limite).all()
    return jsonify({
        "abondements": [_ligne(a) for a in lignes],
        "plafondCents": PLAFOND_CENTS,
    }), 200


@admin_abondements_bp.route('/abondements', methods=['POST'])
@admin_required
def crediter():
    """Créditer un ou plusieurs comptes salariés du même montant.

        POST /api/admin/abondements
        { "salarieIds": [1, 2, 3], "montantCents": 5000, "reference": "..." }

    Plusieurs comptes en un appel parce que c'est le geste réel : une dotation
    se verse à une promotion, pas à une personne. Le lot est **atomique** — si
    un seul compte est fermé ou inconnu, rien n'est écrit et la réponse dit
    lequel. Créditer la moitié d'une liste et laisser l'agent deviner ce qui est
    passé serait pire que de tout refuser.

    Codes : 200 écrit (ou rejoué), 400 saisie invalide, 404 compte inconnu,
    409 compte fermé, 422 clé d'idempotence manquante.
    """
    data = request.get_json(silent=True) or {}

    reference = str(data.get("reference") or "").strip()
    if not reference:
        # 422 et non 400 : la requête est bien formée, il lui manque la clé qui
        # rend le renvoi sûr. L'écran en pose une par saisie.
        return jsonify({
            "error": (
                "Référence de saisie manquante : créditer sans clé "
                "d'idempotence exposerait à un double versement."
            )
        }), 422
    if not CLE_VALIDE.match(reference):
        return jsonify({
            "error": (
                "Référence de saisie invalide : 8 à 120 caractères, lettres, "
                "chiffres et tirets."
            )
        }), 422

    # Rejeu : la même clé rend la même réponse. Le client qui n'a pas vu passer
    # la première réponse redemande, et lit ce qui a réellement été écrit.
    #
    # Les deux formes, parce qu'un lot suffixe la clé par ligne : chercher la
    # seule valeur nue ne retrouverait jamais un versement groupé, et le rejeu
    # d'une dotation à trente comptes en écrirait trente de plus.
    deja = (
        Abondement.query.filter(
            or_(
                Abondement.reference == reference,
                Abondement.reference.like(f"{reference}:%"),
            )
        )
        .order_by(Abondement.id.asc())
        .all()
    )
    if deja:
        # Aucune ligne d'audit ici, et c'est la règle : un rejeu n'est pas un
        # acte. Le journal est la source où l'on compte les euros créés — une
        # ligne de plus ferait dire que l'argent a été versé deux fois, ce qui
        # est exactement l'affirmation que cette branche existe pour empêcher.
        return jsonify({
            "message": (
                f"Saisie déjà enregistrée : {len(deja)} compte(s) crédité(s)."
            ),
            "abondements": [_ligne(a) for a in deja],
            "rejoue": True,
        }), 200

    try:
        montant_cents = int(data.get("montantCents"))
    except (TypeError, ValueError):
        return jsonify({"error": "Montant absent ou illisible."}), 400

    if montant_cents <= 0:
        return jsonify({"error": "Le montant doit être strictement positif."}), 400
    if montant_cents > PLAFOND_CENTS:
        return jsonify({
            "error": (
                f"Montant au-delà du plafond de saisie "
                f"({PLAFOND_CENTS // 100} € par versement). Fractionnez la dotation."
            )
        }), 400

    bruts = data.get("salarieIds") or []
    if not isinstance(bruts, list) or not bruts:
        return jsonify({"error": "Aucun compte sélectionné."}), 400

    # Dédoublonné : la même personne deux fois dans la liste ne se crédite pas
    # deux fois, et l'ordre de saisie est conservé pour que la réponse se lise.
    identifiants = list(dict.fromkeys(int(b) for b in bruts if str(b).isdigit()))
    if len(identifiants) != len(bruts):
        return jsonify({"error": "Liste de comptes invalide."}), 400

    salaries = []
    for identifiant in identifiants:
        salarie = db.session.get(Salaries, identifiant)
        if not salarie:
            return jsonify({"error": f"Compte #{identifiant} introuvable."}), 404
        if salarie.statut != CompteStatut.actif:
            return jsonify({
                "error": (
                    f"{nom_affiche(salarie)} : compte « {salarie.statut.value} ». "
                    "Un compte fermé ne se crédite pas — son titulaire ne peut "
                    "rien en dépenser."
                )
            }), 409
        salaries.append(salarie)

    horodatage = datetime.now(timezone.utc)
    agent = _agent_courant()
    ecrits = []
    for n, salarie in enumerate(salaries):
        abondement = Abondement(
            employeur_id=salarie.employeur_id,
            salarie_id=salarie.id,
            montant=montant_cents / 100,
            horodatage=horodatage,
            agent_admin_id=agent,
            # Une clé par ligne, dérivée de celle du lot : la colonne est
            # unique, donc le lot ne peut pas partager une seule valeur.
            reference=f"{reference}:{n}" if len(salaries) > 1 else reference,
        )
        db.session.add(abondement)
        ecrits.append(abondement)

    db.session.flush()  # assigne les id avant les ecritures d'audit

    # Une ligne de journal par compte crédité, et non une pour le lot :
    # l'unité de l'acte est la ligne d'argent. `abondements.reference` est
    # unique par ligne, donc une ligne unique pour le lot ne pourrait viser
    # aucun `abondement.id` ; et le comptage devient une vérification — autant
    # de lignes `abondement_credite` de préfixe `<clé>` que d'`Abondement`
    # portant ce préfixe. Un bénéficiaire glissé dans un lot après coup se voit.
    #
    # `occurred_at` est l'instant du lot, déjà calculé : sans lui, les lignes
    # s'étalent sur quelques microsecondes et un filtre `depuis`/`jusque` serré
    # couperait un versement groupé en deux.
    #
    # Ni le nom du salarié, ni son adresse, ni la raison sociale de l'employeur :
    # les identifiants désignent les parties et pointent vers des tables
    # effaçables, ce que la ligne d'audit, elle, n'est pas.
    for abondement in ecrits:
        record_event(
            action="abondement_credite",
            actor_role="admin",
            actor_id=get_jwt_identity(),
            target_type="abondement",
            target_id=abondement.id,
            payload={
                "salarie_id": abondement.salarie_id,
                "employeur_id": abondement.employeur_id,
                "montant_cents": montant_cents,
                "reference": abondement.reference,
                "lot_taille": len(ecrits),
            },
            ip=request.remote_addr,
            occurred_at=horodatage,
        )

    db.session.commit()

    total = montant_cents * len(ecrits)
    return jsonify({
        "message": (
            f"{len(ecrits)} compte(s) crédité(s) de {montant_cents / 100:.2f} € "
            f"— {total / 100:.2f} € au total."
        ),
        "abondements": [_ligne(a) for a in ecrits],
        "rejoue": False,
    }), 200
