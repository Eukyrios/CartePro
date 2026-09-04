from flask import Blueprint, jsonify, request
import jwt
import os
from decimal import Decimal, InvalidOperation
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db, User, Transaction

transactions_bp = Blueprint('transactions', __name__)
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-en-dev")

@transactions_bp.route('/valider', methods=['POST'])
@jwt_required()
def valider_transaction():
    data = request.get_json(silent=True) or {}
    
    token_qr = data.get('qr_token')
    montant = data.get('montant')
    partenaire_id = data.get('partenaire_id')

    if not token_qr or montant is None or not partenaire_id:
        return jsonify({"status": "error", "message": "Le token du QR code, le partenaire et le montant sont requis."}), 400

    try:
        montant = Decimal(str(montant))
        if montant <= 0:
            return jsonify({"status": "error", "message": "Le montant doit être supérieur à zéro."}), 400

        # 1. Décodage du jeton pour identifier le client
        decoded_payload = jwt.decode(token_qr, SECRET_KEY, algorithms=["HS256"])
        user_id = decoded_payload.get("user_id")
        if user_id != int(get_jwt_identity()):
            return jsonify({"status": "error", "message": "QR code non associé à ce compte."}), 403

        # 2. Récupération des acteurs depuis la base de données
        salarie = User.query.get(user_id)
        partenaire = User.query.get(partenaire_id)

        if not salarie or not partenaire or partenaire.role != "partenaire":
            return jsonify({"status": "error", "message": "Salarié ou partenaire introuvable."}), 404

        # 3. Vérification des fonds
        if Decimal(str(salarie.solde)) < montant:
            return jsonify({"status": "error", "message": "Solde insuffisant pour effectuer cette transaction."}), 400

        # 4. Écriture irréversible (Transfert d'argent)
        salarie.solde = float(Decimal(str(salarie.solde)) - montant)
        partenaire.solde = float(Decimal(str(partenaire.solde)) + montant)

        # 5. Création de la trace dans l'historique
        nouvelle_transaction = Transaction(
            salarie_id=salarie.id,
            partenaire_id=partenaire.id,
            montant=float(montant)
        )

        db.session.add(nouvelle_transaction)
        db.session.commit()

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
        db.session.rollback() # Annule tout transfert partiel en cas d'erreur serveur
        return jsonify({"status": "error", "message": f"Erreur interne : {str(e)}"}), 500


@transactions_bp.route('/me', methods=['GET'])
@jwt_required()
def mes_transactions():
    user_id = int(get_jwt_identity())
    transactions = Transaction.query.filter_by(
        salarie_id=user_id, statut="validee"
    ).order_by(Transaction.date.desc()).all()
    return jsonify({"transactions": [
        {
            "id": str(transaction.id),
            "at": transaction.date.isoformat(),
            "kind": "debit",
            "amountCents": round(transaction.montant * 100),
            "label": transaction.partenaire.company_name or transaction.partenaire.username,
            "partnerId": str(transaction.partenaire.id),
        }
        for transaction in transactions
    ]}), 200