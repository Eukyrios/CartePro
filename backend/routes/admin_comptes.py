"""Gestion des comptes : activer, suspendre, clôturer.

Le pendant, du côté des salariés, de ce que `routes/admin.py` fait pour les
dossiers de partenaires — et volontairement écrit sur le même patron : mêmes
codes de retour, même motif obligatoire, même 409 quand l'état demandé est
déjà celui du compte. Un agent qui sait instruire un dossier sait mesurer un
compte, sans rien réapprendre.

Ce que la route ne fait pas : supprimer. Clôturer n'efface pas le compte et ne
le peut pas — ses transactions sont immuables, et la relation qui les porte les
emporterait. Un compte clôturé garde son historique et son solde reste
calculable, ce qui est la seule façon honnête de dire ce qu'il restait dessus.

Blueprint distinct de `admin_bp`, monté sous le même préfixe : trois domaines
dans un seul fichier de neuf cents lignes ne s'y retrouvent plus.
"""

from flask import Blueprint, jsonify, request

from accounts import avatar_ou_defaut, nom_affiche
from decorators import admin_required
from flask_jwt_extended import get_jwt_identity
from instruction import MotifManquant
from mesures import GESTES_COMPTE, mesurer
from mouvements import mouvements_du_compte
from models import (
    CompteStatut,
    Partenaire,
    PartnerStatus,
    Salaries,
    TransactionStatut,
    db,
)

admin_comptes_bp = Blueprint('admin_comptes', __name__)


def _agent_courant():
    """L'identifiant de l'admin connecté, tel que le jeton le porte.

    Même lecture que dans `routes/admin.py` : l'identité est de la forme
    `"admin:1"`, et on n'y accède qu'après `@admin_required`.
    """
    identite = get_jwt_identity() or ""
    _, _, brut = str(identite).partition(":")
    return int(brut) if brut.isdigit() else None


def _derniere_mesure(salarie):
    mesures = sorted(salarie.mesures, key=lambda m: m.horodatage)
    return mesures[-1] if mesures else None


def _compte(salarie):
    """Un compte salarié vu par l'administration.

    Le solde y figure parce que c'est la première chose qu'un agent regarde
    avant de clôturer : fermer un compte qui porte encore de l'argent public
    est une décision, pas une formalité. Il est calculé — abondements moins
    paiements validés — et non stocké, comme partout ailleurs.
    """
    derniere = _derniere_mesure(salarie)
    return {
        "genre": "salarie",
        "id": salarie.id,
        # L'aplat de sa vignette, tel que le titulaire l'a choisi.
        "avatarColor": avatar_ou_defaut(salarie),
        "nom": nom_affiche(salarie),
        "email": salarie.email,
        "statut": salarie.statut.value,
        "soldeCents": round(salarie.solde * 100),
        "employeur": salarie.employeur.raison_sociale if salarie.employeur else "",
        # De quoi juger sans ouvrir un second écran : un compte qui n'a jamais
        # rien dépensé ne se clôture pas comme un compte actif depuis trois mois.
        "nbPaiements": sum(
            1 for t in salarie.transactions if t.statut == TransactionStatut.validee
        ),
        "nbAbondements": len(salarie.abondements_recus),
        "mesures": [
            {
                "sens": m.sens.value,
                "motif": m.motif_ecrit,
                "at": m.horodatage.isoformat() if m.horodatage else None,
            }
            for m in sorted(salarie.mesures, key=lambda m: m.horodatage)
        ],
        "derniereMesure": (
            {
                "sens": derniere.sens.value,
                "motif": derniere.motif_ecrit,
                "at": derniere.horodatage.isoformat() if derniere.horodatage else None,
            }
            if derniere
            else None
        ),
    }


def _compte_partenaire(partenaire):
    """Un compte partenaire, dans la forme d'une ligne de compte.

    Meme forme que `_compte`, pour que l'ecran n'ait qu'un tableau et qu'un
    tableau. Ce qui change tient a ce que les deux cotes du comptoir ne sont
    pas symetriques :

    — `statut` parle le vocabulaire des dossiers (« en_attente », « valide »,
      « refuse », « suspendu ») et non celui des comptes salaries (« actif »,
      « suspendu », « cloture »). L'ecran traduit ; la route ne maquille pas un
      etat en un autre, sans quoi un dossier refuse passerait pour un compte
      actif.
    — `soldeCents` porte ce qu'il a **encaisse**, non un solde : un partenaire
      ne detient rien, il recoit. Le champ garde son nom pour que la colonne
      reste une colonne, et l'ecran dit lequel des deux sens il affiche.
    — `slug` vient en plus : les gestes d'un partenaire passent par les routes
      d'instruction de `routes/admin.py`, qui l'adressent par son slug.
    — `mesures` reprend ses **decisions**. C'est la meme idee — une trace
      motivee, horodatee — sous un autre nom de table, et l'ecran les affiche
      dans la meme colonne.
    """
    decisions = sorted(partenaire.decisions, key=lambda d: d.horodatage)
    derniere = decisions[-1] if decisions else None
    encaisse = sum(
        t.montant
        for t in partenaire.transactions
        if t.statut == TransactionStatut.validee
    )
    return {
        "genre": "partenaire",
        "id": partenaire.id,
        # Un partenaire a une photographie de fiche ; l'aplat lui sert de
        # repli, tire de son email comme pour un salarie sans couleur.
        "avatarColor": avatar_ou_defaut(partenaire),
        "photo": partenaire.image_partenaire or "",
        "slug": partenaire.slug,
        "nom": partenaire.raison_sociale,
        "email": partenaire.email_contact or "",
        "statut": partenaire.statut.value,
        "soldeCents": round(encaisse * 100),
        # Le rattachement d'un partenaire, c'est sa categorie et sa ville : il
        # n'a pas d'employeur.
        "employeur": " — ".join(
            x
            for x in (
                partenaire.categorie.nom if partenaire.categorie else "",
                partenaire.ville or "",
            )
            if x
        ),
        "nbPaiements": sum(
            1
            for t in partenaire.transactions
            if t.statut == TransactionStatut.validee
        ),
        # Un partenaire ne recoit pas d'abondement : la colonne existe pour les
        # salaries, et zero est la reponse juste, pas un trou.
        "nbAbondements": 0,
        "mesures": [
            {
                "sens": d.sens.value,
                "motif": d.motif_ecrit,
                "at": d.horodatage.isoformat() if d.horodatage else None,
            }
            for d in decisions
        ],
        "derniereMesure": (
            {
                "sens": derniere.sens.value,
                "motif": derniere.motif_ecrit,
                "at": derniere.horodatage.isoformat() if derniere.horodatage else None,
            }
            if derniere
            else None
        ),
    }


@admin_comptes_bp.route('/comptes', methods=['GET'])
@admin_required
def lister_comptes():
    """Tous les comptes du dispositif : salariés **et** partenaires.

    Les deux dans la même liste, parce que la question qu'on vient poser est la
    même : qui a un compte, dans quel état, et faut-il prendre une mesure. Les
    séparer en deux écrans obligeait à savoir d'avance de quel côté du comptoir
    se trouve le compte qu'on cherche — or on le cherche justement par son nom.

    `?genre=salarie|partenaire` restreint à un côté, `?statut=…` à un état. Les
    deux vocabulaires d'état cohabitent : « actif / suspendu / clôturé » pour un
    salarié, « en_attente / validé / refusé / suspendu » pour un dossier de
    partenaire. Un statut inconnu du genre demandé rend une liste vide plutôt
    qu'une erreur — le filtre de l'écran est construit sur les énumérations,
    donc une valeur hors énumération vient d'une URL bricolée.
    """
    genre = (request.args.get('genre') or '').strip()
    demande = (request.args.get('statut') or '').strip()
    lignes = []

    if genre in ("", "salarie"):
        query = Salaries.query
        garder = True
        if demande:
            correspond = next(
                (s for s in CompteStatut if s.value == demande or s.name == demande),
                None,
            )
            # Un statut qui n'existe pas côté salarié n'écarte pas les
            # partenaires : sans ce garde, filtrer sur « refusé » rendait une
            # liste vide alors que des dossiers refusés existent.
            garder = correspond is not None
            if garder:
                query = query.filter_by(statut=correspond)
        if garder:
            lignes += [
                _compte(s)
                for s in query.order_by(
                    Salaries.nom.asc(), Salaries.prenom.asc()
                ).all()
            ]

    if genre in ("", "partenaire"):
        query = Partenaire.query
        garder = True
        if demande:
            correspond = next(
                (
                    s
                    for s in PartnerStatus
                    if s.value == demande or s.name == demande
                ),
                None,
            )
            garder = correspond is not None
            if garder:
                query = query.filter_by(statut=correspond)
        if garder:
            lignes += [
                _compte_partenaire(p)
                for p in query.order_by(Partenaire.raison_sociale.asc()).all()
            ]

    return jsonify({"comptes": lignes}), 200


@admin_comptes_bp.route('/comptes/<int:salarie_id>', methods=['GET'])
@admin_required
def lire_compte(salarie_id):
    """Un compte, avec l'historique complet de ses mesures."""
    salarie = db.session.get(Salaries, salarie_id)
    if not salarie:
        return jsonify({"error": "Compte introuvable."}), 404
    return jsonify({"compte": _compte(salarie)}), 200


@admin_comptes_bp.route('/comptes/<int:salarie_id>/mouvements', methods=['GET'])
@admin_required
def lire_mouvements(salarie_id):
    """L'historique complet d'un compte salarié : ses crédits et ses paiements.

    Le même calcul que `GET /api/transactions/me` rend au titulaire —
    `mouvements.mouvements_du_compte` — posé par quelqu'un qui a le droit de le
    demander sur n'importe quel compte. L'écran d'administration affiche
    d'ailleurs le même composant que l'espace du salarié : deux audiences, une
    seule lecture, et un solde après chaque opération qui se recalcule à
    l'écran parce que les crédits sont du lot.

    Ce que la route ne fait pas : servir un partenaire. Ses encaissements se
    lisent par `GET /api/admin/transactions?partenaire=<slug>`, qui les rend
    dans la forme de l'écran des recettes — avec le nom du salarié sur chaque
    ligne, ce qu'un historique de dépenses n'a pas à porter.
    """
    salarie = db.session.get(Salaries, salarie_id)
    if not salarie:
        return jsonify({"error": "Compte introuvable."}), 404
    return jsonify({"transactions": mouvements_du_compte(salarie)}), 200


def _mesurer_par_id(salarie_id, geste, motif):
    """Applique un geste à un compte, et rend la réponse HTTP qui va avec."""
    salarie = db.session.get(Salaries, salarie_id)
    if not salarie:
        return jsonify({"error": "Compte introuvable."}), 404

    apres = GESTES_COMPTE[geste]
    if salarie.statut == apres:
        return jsonify({"error": f"Ce compte est déjà « {apres.value} »."}), 409

    # Un compte clôturé ne se rouvre pas d'un clic. La clôture est présentée
    # comme définitive à l'écran ; l'accepter et la défaire par la route
    # d'activation rendrait cette phrase fausse. Il reste la création d'un
    # nouveau compte, qui est ce que fait un service RH dans ce cas.
    if salarie.statut == CompteStatut.cloture:
        return jsonify({
            "error": (
                "Ce compte est clôturé. Une clôture est définitive : elle ne se "
                "lève pas, un nouveau compte se crée."
            )
        }), 409

    try:
        avant, nouveau = mesurer(
            salarie,
            geste,
            motif,
            agent_id=_agent_courant(),
            # D'où l'appel est entré dans le dispositif. `mesurer` écrit la
            # ligne du journal et ne connaît pas Flask : c'est donc la route qui
            # la lui donne.
            ip=request.remote_addr,
        )
    except MotifManquant as manque:
        # 422 comme pour une décision d'instruction : la requête est bien
        # formée, c'est son contenu qui ne permet pas de décider.
        return jsonify({"error": str(manque)}), 422

    db.session.commit()
    return jsonify({
        "message": f"{nom_affiche(salarie)} : {avant} → {nouveau}.",
        "compte": _compte(salarie),
    }), 200


@admin_comptes_bp.route('/comptes/<int:salarie_id>/activer', methods=['POST'])
@admin_required
def activer(salarie_id):
    """Rouvrir un compte suspendu. Le motif dit sur quoi la levée est fondée."""
    data = request.get_json(silent=True) or {}
    return _mesurer_par_id(salarie_id, "activer", data.get("motif"))


@admin_comptes_bp.route('/comptes/<int:salarie_id>/suspendre', methods=['POST'])
@admin_required
def suspendre(salarie_id):
    """Suspendre un compte : le titulaire ne se connecte plus, rien n'est perdu.

    Mesure en cours et réversible, à la différence de la clôture. Le solde
    reste au compte et les paiements passés restent lisibles.
    """
    data = request.get_json(silent=True) or {}
    return _mesurer_par_id(salarie_id, "suspendre", data.get("motif"))


@admin_comptes_bp.route('/comptes/<int:salarie_id>/cloturer', methods=['POST'])
@admin_required
def cloturer(salarie_id):
    """Clôturer un compte. Définitif, et le solde restant est dit dans la réponse.

    La route ne refuse pas un solde non nul — un départ en fin de mois laisse
    presque toujours quelques euros, et bloquer la clôture obligerait à inventer
    une dépense pour vider le compte, ce qui serait pire. Elle le **dit**, et
    l'écran le fait lire avant de confirmer : le motif écrit est l'endroit où
    l'agent consigne ce qu'il advient du reliquat.
    """
    data = request.get_json(silent=True) or {}
    salarie = db.session.get(Salaries, salarie_id)
    reste = round(salarie.solde * 100) if salarie else 0

    reponse = _mesurer_par_id(salarie_id, "cloturer", data.get("motif"))
    corps, code = reponse
    if code == 200:
        charge = corps.get_json()
        charge["soldeResiduelCents"] = reste
        return jsonify(charge), 200
    return reponse
