from flask import Blueprint, jsonify
from models import Salaries, db

sirh_bp = Blueprint('sirh', __name__)

@sirh_bp.route('/employees/<int:employee_id>/balance', methods=['GET'])
def get_employee_balance(employee_id):
    salarie = db.session.get(Salaries, employee_id)

    # Comportement strict défini pour un identifiant inconnu
    if not salarie:
        return jsonify({
            "error": "Not_Found",
            "message": f"Aucun salarié actif trouvé avec l'identifiant {employee_id}."
        }), 404

    # Contrat JSON figé
    return jsonify({
        "employee_id": salarie.id,
        "balance": round(salarie.solde, 2),
        "currency": "EUR"
    }), 200
