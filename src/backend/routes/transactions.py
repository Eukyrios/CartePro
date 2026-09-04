from flask import Blueprint, jsonify, request
import jwt
import os
from models import db, User, Transaction

transactions_bp = Blueprint('transactions', __name__)
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-en-dev")

@transactions_bp.route('/valider', methods=['POST'])
def valider_transaction():
    data = request.json
    
    token_qr = data.get('qr_token')
    montant = data.get('montant')
    partenaire_id = data.get('partenaire_id')

    if not token_qr or not montant or not partenaire_id:
        return jsonify({"status": "error", "message": "Le token du QR code, le partenaire et le montant sont requis."}), 400

    try:
        montant = float(montant)
        if montant <= 0:
            return jsonify({"status": "error", "message": "Le montant doit être supérieur à zéro."}), 400

        # 1. Décodage du jeton pour identifier le client
        decoded_payload = jwt.decode(token_qr, SECRET_KEY, algorithms=["HS256"])
        user_id = decoded_payload.get("user_id")

        # 2. Récupération des acteurs depuis la base de données
        salarie = User.query.get(user_id)
        partenaire = User.query.get(partenaire_id)

        if not salarie or not partenaire:
            return jsonify({"status": "error", "message": "Salarié ou partenaire introuvable."}), 404

        # 3. Vérification des fonds
        if salarie.solde < montant:
            return jsonify({"status": "error", "message": "Solde insuffisant pour effectuer cette transaction."}), 400

        # 4. Écriture irréversible (Transfert d'argent)
        salarie.solde -= montant
        partenaire.solde += montant

        # 5. Création de la trace dans l'historique
        nouvelle_transaction = Transaction(
            salarie_id=salarie.id,
            partenaire_id=partenaire.id,
            montant=montant
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
    except ValueError:
        return jsonify({"status": "error", "message": "Le montant formaté est invalide."}), 400
    except Exception as e:
        db.session.rollback() # Annule tout transfert partiel en cas d'erreur serveur
        return jsonify({"status": "error", "message": f"Erreur interne : {str(e)}"}), 500