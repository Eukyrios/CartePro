from flask import Blueprint, jsonify

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/partenaires/<int:partenaire_id>/feature', methods=['POST'])
def set_featured_partner(partenaire_id):
    # TODO: Ton mate fera l'UPDATE en base pour passer 'featured' à True
    return jsonify({
        "status": "success",
        "message": f"Le partenaire {partenaire_id} est maintenant le coup de coeur du Ministre."
    }), 200

@admin_bp.route('/transactions/<int:transaction_id>/annuler', methods=['POST'])
def annuler_transaction_forcee(transaction_id):
    # TODO: Ton mate fera l'UPDATE du statut de la transaction et l'UPDATE du solde
    return jsonify({
        "status": "success",
        "message": f"Transaction {transaction_id} annulée par l'administration."
    }), 200
