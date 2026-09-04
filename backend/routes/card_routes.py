from flask import Blueprint, jsonify, request
from services.qr_service import generate_ephemeral_qr
from services.card_service import generate_virtual_card # (A créer de ton côté)

card_bp = Blueprint('card', __name__)

@card_bp.route('/qr', methods=['POST'])
def get_qr_code():
    data = request.get_json()
    user_id = data.get('user_id')
    qr_b64, token = generate_ephemeral_qr(user_id)
    # L'API doit retourner du JSON[cite: 1]
    return jsonify({"qr_image": qr_b64, "expires_in": "5m"}), 201