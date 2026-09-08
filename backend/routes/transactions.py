from flask import Blueprint, jsonify, request
import jwt
import os
from decimal import Decimal, InvalidOperation
from flask_jwt_extended import get_jwt_identity, jwt_required

from accounts import compte_depuis_identite, nom_affiche
from models import (
    Abondement,
    Partenaire,
    PartnerStatus,
    Salaries,
    Transaction,
    TransactionStatut,
    db,
)
from services.audit_service import record_event

transactions_bp = Blueprint('transactions', __name__)
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-en-dev")


def trouver_partenaire(identifiant):
    """Retrouve un partenaire par son slug, à défaut par sa clé primaire.

    Le catalogue expose le slug, parce que c'est lui qui tient dans une URL et
    qui survit à un nouveau seed. Une API qui donne un identifiant doit
    l'accepter en retour : sans ce détour, valider un paiement sur
    « pharmacie-du-parc » cherchait une clé primaire de ce nom et répondait
    « partenaire introuvable ».
    """
    partenaire = Partenaire.query.filter_by(slug=str(identifiant)).first()
    if partenaire:
        return partenaire
    try:
        return db.session.get(Partenaire, int(identifiant))
    except (TypeError, ValueError):
        return None


@transactions_bp.route('/valider', methods=['POST'])
@jwt_required()
def valider_transaction():
    data = request.get_json(silent=True) or {}

    token_qr = data.get('qr_token')
    montant = data.get('montant')
    partenaire_id = data.get('partenaire_id')

    if not token_qr or montant is None or not partenaire_id:
        return jsonify({"status": "error", "message": "Le token du QR code, le partenaire et le montant sont requis."}), 400

    # 🛡️ IDEMPOTENCE : on vérifie si ce QR code a déjà déclenché un encaissement
    existing_tx = Transaction.query.filter_by(idempotency_key=token_qr).first()
    if existing_tx:
        # On renvoie 200 (OK) et non 201, avec les infos de la transaction passée
        return jsonify({
            "status": "success",
            "message": "Transaction déjà traitée (Idempotence).",
            "details": {
                "transaction_id": existing_tx.id,
                "nouveau_solde_salarie": existing_tx.salarie.solde,
            }
        }), 200

    try:
        montant = Decimal(str(montant))
        if montant <= 0:
            return jsonify({"status": "error", "message": "Le montant doit être supérieur à zéro."}), 400

        # 1. Décodage du jeton pour identifier le salarié qui présente le code
        decoded_payload = jwt.decode(token_qr, SECRET_KEY, algorithms=["HS256"])
        salarie_id = decoded_payload.get("user_id")

        # 2. Résolution de l'identifiant du partenaire — slug ou clé primaire —
        # avant tout verrou et avant le contrôle d'autorisation : le catalogue
        # expose le slug, donc `int(partenaire_id)` échouerait sur
        # « pharmacie-du-parc » et la comparaison ci-dessous n'aurait jamais lieu.
        partenaire_ref = trouver_partenaire(partenaire_id)
        if not partenaire_ref:
            return jsonify({"status": "error", "message": "Salarié ou partenaire introuvable."}), 404

        # Le jeton d'authentification appartient au partenaire qui encaisse.
        appelant = compte_depuis_identite(get_jwt_identity())
        if not isinstance(appelant, Partenaire) or appelant.id != partenaire_ref.id:
            record_event(
                action="transaction_refusee",
                actor_role="partenaire" if isinstance(appelant, Partenaire) else "anonyme",
                actor_id=f"partenaire:{appelant.id}" if isinstance(appelant, Partenaire) else None,
                target_type="partenaire",
                target_id=partenaire_ref.slug,
                payload={"motif": "encaissement_non_autorise", "montant": float(montant)},
                ip=request.remote_addr,
                commit=True,
            )
            return jsonify({"status": "error", "message": "Vous n'êtes pas autorisé à encaisser pour ce partenaire."}), 403

        # Et il est conventionné. L'interface barre déjà l'encaissement aux
        # établissements en attente ou écartés — mais une barrière d'interface
        # n'est pas un contrôle d'accès : sans cette vérification, un appel
        # direct à la route encaissait quand même. Le statut est la décision du
        # administration, donc c'est ici qu'elle s'applique.
        if partenaire_ref.statut != PartnerStatus.valide:
            record_event(
                action="transaction_refusee",
                actor_role="partenaire",
                actor_id=f"partenaire:{appelant.id}",
                target_type="partenaire",
                target_id=partenaire_ref.slug,
                payload={"motif": "partenaire_non_conventionne", "montant": float(montant)},
                ip=request.remote_addr,
                commit=True,
            )
            return jsonify({
                "status": "error",
                "message": "Cet établissement n'est pas conventionné : "
                           "l'encaissement n'est pas ouvert.",
            }), 403

        # 🔒 CONCURRENCE : SELECT ... FOR UPDATE sur la ligne du salarié. C'est
        # son solde qui est en jeu ; le partenaire, lui, n'en a plus — dans le
        # schéma normalisé, encaisser n'incrémente aucun compteur, cela écrit
        # une transaction.
        salarie = db.session.query(Salaries).with_for_update().filter_by(id=salarie_id).first()
        if not salarie:
            db.session.rollback()
            return jsonify({"status": "error", "message": "Salarié ou partenaire introuvable."}), 404

        # Vérification stricte du solde (ne peut jamais devenir négatif)
        if Decimal(str(salarie.solde)) < montant:
            record_event(
                action="transaction_refusee",
                actor_role="partenaire",
                actor_id=f"partenaire:{appelant.id}",
                target_type="salarie",
                target_id=salarie.id,
                payload={"motif": "solde_insuffisant", "montant": float(montant)},
                ip=request.remote_addr,
            )
            db.session.commit()  # écrit l'audit ci-dessus, relâche le verrou FOR UPDATE
            return jsonify({"status": "error", "message": "Solde insuffisant pour effectuer cette transaction."}), 400

        # Écriture irréversible. Le solde n'est pas décrémenté : il est calculé
        # depuis les abondements moins les transactions validées, donc cette
        # ligne *est* le débit.
        nouvelle_transaction = Transaction(
            salarie_id=salarie.id,
            partenaire_id=partenaire_ref.id,
            montant=float(montant),
            statut=TransactionStatut.validee,
            reference_qr=token_qr,
            idempotency_key=token_qr,
            sens_ecriture="debit",
        )

        db.session.add(nouvelle_transaction)
        db.session.flush()  # assigne l'id avant l'ecriture d'audit
        record_event(
            action="transaction_validee",
            actor_role="partenaire",
            actor_id=f"partenaire:{appelant.id}",
            target_type="transaction",
            target_id=nouvelle_transaction.id,
            payload={
                "salarie_id": salarie.id,
                "partenaire_id": partenaire_ref.id,
                "montant": float(montant),
            },
            ip=request.remote_addr,
        )
        db.session.commit()  # Relâche les verrous FOR UPDATE

        return jsonify({
            "status": "success",
            "message": f"Transaction de {montant}€ validée avec succès.",
            "details": {
                "transaction_id": nouvelle_transaction.id,
                "nouveau_solde_salarie": salarie.solde,
            }
        }), 201

    except jwt.ExpiredSignatureError:
        return jsonify({"status": "error", "message": "Le QR code a expiré. Le salarié doit en générer un nouveau."}), 400
    except jwt.InvalidTokenError:
        return jsonify({"status": "error", "message": "QR code invalide ou corrompu."}), 400
    except (ValueError, InvalidOperation):
        return jsonify({"status": "error", "message": "Le montant formaté est invalide."}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Erreur interne : {str(e)}"}), 500


@transactions_bp.route('/me', methods=['GET'])
@jwt_required()
def mes_transactions():
    """Les mouvements du compte connecté, du plus récent au plus ancien.

    La même route répond aux deux audiences, parce que c'est la même question
    posée par deux côtés du comptoir : un salarié voit ses mouvements, un
    partenaire ce qu'il a encaissé. Le `label` suit : chez qui pour l'un, de qui
    pour l'autre — le nom du salarié, jamais son email.

    Pour un salarié, les **abondements** sont du lot. Sans eux l'historique
    n'aurait que des débits, et la ligne « d'où vient cet argent » manquerait :
    le solde se lirait comme une donnée tombée du ciel. C'est aussi ce qui
    permet à l'écran de recalculer le solde après chaque opération sans le
    demander au serveur ligne par ligne.

    `partnerCategorie` accompagne chaque paiement : l'historique se filtre par
    catégorie, et la lui faire chercher dans le catalogue demanderait une
    seconde requête pour une information que celle-ci connaît déjà.
    """
    compte = compte_depuis_identite(get_jwt_identity())
    if not compte:
        return jsonify({"transactions": []}), 200
    est_partenaire = isinstance(compte, Partenaire)

    query = Transaction.query.filter_by(statut=TransactionStatut.validee)
    query = query.filter_by(
        partenaire_id=compte.id
    ) if est_partenaire else query.filter_by(salarie_id=compte.id)

    lignes = [
        {
            "id": str(t.id),
            "at": t.horodatage.isoformat(),
            "kind": "credit" if est_partenaire else "debit",
            "amountCents": round(t.montant * 100),
            "label": (
                _libelle_salarie(t.salarie)
                if est_partenaire
                else t.partenaire.raison_sociale
            ),
            "partnerId": t.partenaire.slug,
            "partnerCategorie": (
                t.partenaire.categorie.nom if t.partenaire.categorie else ""
            ),
        }
        for t in query.all()
    ]

    if not est_partenaire:
        lignes += [
            {
                "id": f"abondement-{a.id}",
                "at": a.horodatage.isoformat(),
                "kind": "credit",
                "amountCents": round(a.montant * 100),
                "label": f"Crédit employeur — {a.employeur.raison_sociale}",
                "partnerId": None,
                "partnerCategorie": "",
            }
            for a in Abondement.query.filter_by(salarie_id=compte.id).all()
        ]

    lignes.sort(key=lambda ligne: ligne["at"], reverse=True)
    return jsonify({"transactions": lignes}), 200


def _libelle_salarie(salarie):
    """Le salarié tel qu'un partenaire peut le voir : son nom, rien de plus.

    Un encaissement n'a pas à révéler l'adresse email de qui a payé — c'est
    l'identifiant de connexion de cette personne. Le nom suffit à reconnaître
    une opération dans une liste, et à défaut il ne reste que le numéro.
    """
    if not salarie:
        return "Salarié"
    return nom_affiche(salarie) or f"Salarié #{salarie.id}"
