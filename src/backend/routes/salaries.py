from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta, timezone
import jwt
import qrcode
import io
import base64
import os
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import User

salaries_bp = Blueprint('salaries', __name__)
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-en-dev")

@salaries_bp.route('/<int:user_id>/solde', methods=['GET'])
@jwt_required()
def get_solde_positif(user_id):
    # 1. On cherche le salarié dans la base de données
    user = User.query.get(user_id)
    
    if not user or user.id != int(get_jwt_identity()):
        return jsonify({"status": "error", "message": "Utilisateur introuvable"}), 404
        
    # 2. On récupère son vrai solde
    solde_brut = user.solde 
    
    return jsonify({
        "status": "success",
        "solde_numerique": solde_brut,
        "affichage_positif": f"{solde_brut:.2f}€ à dépenser chez vos partenaires préférés !"
    }), 200

@salaries_bp.route('/paiement/qr', methods=['POST'])
@jwt_required()
def generer_qr_code():
    user_id = int(get_jwt_identity())
    
    # Expiration fixée à 30 minutes
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    
    # Génération de l'image
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(token)
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return jsonify({
        "status": "success",
        "qr_image_base64": qr_b64,
        "raw_token_for_testing": token,
        "expiration": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
    }), 201