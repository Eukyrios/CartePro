from flask import Blueprint, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt
from services.csv_service import generate_transactions_csv

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/transactions.csv', methods=['GET'])
@jwt_required()
def export_transactions_csv():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Accès refusé. Réservé aux administrateurs."}), 403
    
    csv_data = generate_transactions_csv()
    
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=transactions.csv"}
    )

def set_featured_partner(partenaire_id):
    # TODO: Ton mate fera l'UPDATE en base pour passer 'featured' à True
    return jsonify({
        "status": "success",
        "message": f"Le partenaire {partenaire_id} est maintenant le coup de coeur de l'administrateur."
    }), 200

@admin_bp.route('/transactions/<int:transaction_id>/annuler', methods=['POST'])
def annuler_transaction_forcee(transaction_id):
    # TODO: Ton mate fera l'UPDATE du statut de la transaction et l'UPDATE du solde
    return jsonify({
        "status": "success",
        "message": f"Transaction {transaction_id} annulée par l'administration."
    }), 200
