from flask import Blueprint, jsonify, request
import jwt
import os
from decimal import Decimal, InvalidOperation
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db, User, Transaction

transactions_bp = Blueprint('transactions', __name__)
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-en-dev")


def trouver_partenaire(identifiant):
    """Retrouve un partenaire par son slug, à défaut par sa clé primaire.

    Le catalogue expose le slug (`username`), parce que c'est lui qui tient
    dans une URL et qui survit à un nouveau seed. Une API qui donne un
    identifiant doit l'accepter en retour : sans ce détour, valider un
    paiement sur « poney-dream-78 » cherchait une clé primaire de ce nom et
    répondait « partenaire introuvable ».
    """
    partenaire = User.query.filter_by(
        username=str(identifiant), role="partenaire"
    ).first()
    if partenaire:
        return partenaire
    try:
        return User.query.get(int(identifiant))
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

    # 🛡️ IDEMPOTENCE : On vérifie si ce QR code a déjà déclenché un encaissement
    existing_tx = Transaction.query.filter_by(idempotency_key=token_qr).first()
    if existing_tx:
        # On renvoie 200 (OK) et non 201, avec les infos de la transaction passée
        salarie_actuel = User.query.get(existing_tx.salarie_id)
        return jsonify({
            "status": "success",
            "message": "Transaction déjà traitée (Idempotence).",
            "details": {
                "transaction_id": existing_tx.id,
                "nouveau_solde_salarie": salarie_actuel.solde
            }
        }), 200

    try:
        montant = Decimal(str(montant))
        if montant <= 0:
            return jsonify({"status": "error", "message": "Le montant doit être supérieur à zéro."}), 400

        # 1. Décodage du jeton pour identifier le client
        decoded_payload = jwt.decode(token_qr, SECRET_KEY, algorithms=["HS256"])
        user_id = decoded_payload.get("user_id")
        
        # 2. Résolution de l'identifiant du partenaire — slug ou clé primaire —
        # avant tout verrou et avant le contrôle d'autorisation : le catalogue
        # expose le slug, donc `int(partenaire_id)` échouerait sur
        # « poney-dream-78 » et la comparaison ci-dessous n'aurait jamais lieu.
        partenaire_ref = trouver_partenaire(partenaire_id)
        if not partenaire_ref:
            return jsonify({"status": "error", "message": "Salarié ou partenaire introuvable."}), 404

        # Le jeton d'authentification appartient au partenaire qui déclenche l'encaissement
        if partenaire_ref.id != int(get_jwt_identity()):
            return jsonify({"status": "error", "message": "Vous n'êtes pas autorisé à encaisser pour ce partenaire."}), 403

        # 🔒 CONCURRENCE : SELECT ... FOR UPDATE
        # Ces requêtes bloquent la ligne en base de données. Toute autre requête essayant
        # de lire/écrire ce même utilisateur sera mise en pause jusqu'au db.session.commit()
        salarie = db.session.query(User).with_for_update().filter_by(id=user_id).first()
        partenaire = db.session.query(User).with_for_update().filter_by(id=partenaire_ref.id).first()

        if not salarie or not partenaire or partenaire.role != "partenaire":
            db.session.rollback()
            return jsonify({"status": "error", "message": "Salarié ou partenaire introuvable."}), 404

        # Vérification stricte du solde (ne peut jamais être négatif)
        if Decimal(str(salarie.solde)) < montant:
            db.session.rollback()
            return jsonify({"status": "error", "message": "Solde insuffisant pour effectuer cette transaction."}), 400

        # Écriture irréversible
        salarie.solde = round(float(Decimal(str(salarie.solde)) - montant), 2)
        partenaire.solde = round(float(Decimal(str(partenaire.solde)) + montant), 2)

        # Création de la trace incluant la clé d'idempotence
        nouvelle_transaction = Transaction(
            salarie_id=salarie.id,
            partenaire_id=partenaire.id,
            montant=float(montant),
            idempotency_key=token_qr
        )

        db.session.add(nouvelle_transaction)
        db.session.commit() # Relâche les verrous FOR UPDATE

        return jsonify({
            "status": "success",
            "message": f"Transaction de {montant}€ validée avec succès.",
            "details": {
                "transaction_id": nouvelle_transaction.id,
                "nouveau_solde_salarie": salarie.solde
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
    posée par deux côtés du comptoir : un salarié voit ce qu'il a dépensé
    (`debit`), un partenaire ce qu'il a encaissé (`credit`). Le `label` suit :
    chez qui pour l'un, de qui pour l'autre — un identifiant partiel du salarié,
    jamais son email.

    Un remboursement forcé par l'administration (statut "remboursement", voir
    `routes/admin.py`) inverse ce sens : c'est de l'argent qui revient au
    salarié et qui repart du partenaire. La ligne validée d'origine reste
    listée telle quelle à côté — elle est immuable, jamais corrigée en place.
    """
    user_id = int(get_jwt_identity())
    utilisateur = User.query.get(user_id)
    est_partenaire = bool(utilisateur and utilisateur.role == "partenaire")

    query = Transaction.query.filter(Transaction.statut.in_(["validee", "remboursement"]))
    query = query.filter_by(
        partenaire_id=user_id
    ) if est_partenaire else query.filter_by(salarie_id=user_id)
    transactions = query.order_by(Transaction.date.desc()).all()

    def kind_for(transaction):
        is_refund = transaction.reverses_transaction_id is not None
        if est_partenaire:
            return "debit" if is_refund else "credit"
        return "credit" if is_refund else "debit"

    def label_for(transaction):
        contrepartie = (
            _libelle_salarie(transaction.salarie)
            if est_partenaire
            else (transaction.partenaire.company_name or transaction.partenaire.username)
        )
        if transaction.reverses_transaction_id is not None:
            return f"Remboursement — {contrepartie}"
        return contrepartie

    return jsonify({"transactions": [
        {
            "id": str(transaction.id),
            "at": transaction.date.isoformat(),
            "kind": kind_for(transaction),
            "amountCents": round(transaction.montant * 100),
            "label": label_for(transaction),
            "partnerId": str(transaction.partenaire.id),
        }
        for transaction in transactions
    ]}), 200


def _libelle_salarie(salarie):
    """Le salarié tel qu'un partenaire peut le voir : son nom, rien de plus.

    Un encaissement n'a pas à révéler l'adresse email de qui a payé — c'est
    l'identifiant de connexion de cette personne. Le nom d'utilisateur suffit à
    reconnaître une opération dans une liste, et à défaut il ne reste que le
    numéro de la ligne.
    """
    if not salarie:
        return "Salarié"
    return salarie.username or f"Salarié #{salarie.id}"