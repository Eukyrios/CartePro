from flask import Blueprint, jsonify
from models import User

sirh_bp = Blueprint('sirh', __name__)

@sirh_bp.route('/employees/<int:employee_id>/balance', methods=['GET'])
def get_employee_balance(employee_id):
    user = User.query.get(employee_id)
    
    # Comportement strict défini pour un identifiant inconnu (ou si ce n'est pas un salarié)
    if not user or user.role != "user":
        return jsonify({
            "error": "Not_Found",
            "message": f"Aucun salarié actif trouvé avec l'identifiant {employee_id}."
        }), 404

    # Contrat JSON figé
    return jsonify({
        "employee_id": user.id,
        "balance": round(user.solde, 2),
        "currency": "EUR"
    }), 200