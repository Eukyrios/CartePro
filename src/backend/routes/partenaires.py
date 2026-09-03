from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt

partenaires_bp = Blueprint('partenaires', __name__)

# Simulation de la base de données
PARTENAIRES_OFFICIELS = [
    {"id": 1, "nom": "Poney Dream 78", "secteur": "Team building", "badge_partenaire_officiel": True, "featured": False},
    {"id": 2, "nom": "KostumParty", "secteur": "Déguisements", "badge_partenaire_officiel": True, "featured": True},
    {"id": 3, "nom": "Glaces Artisanales Corrèze", "secteur": "Alimentation", "badge_partenaire_officiel": True, "featured": False},
    {"id": 4, "nom": "Chapelier Fontaine", "secteur": "Mode", "badge_partenaire_officiel": True, "featured": False}
]

@partenaires_bp.route('/catalogue', methods=['GET'])
def catalogue():
    partenaires = [
        {"id": 1, "nom": "Poney Dream 78"},
        {"id": 2, "nom": "KostumParty"}
    ]
    return jsonify(partenaires), 200

@partenaires_bp.route('/coup-de-coeur', methods=['GET'])
def get_coup_de_coeur():
    featured = next((p for p in PARTENAIRES_OFFICIELS if p["featured"]), None)
    return jsonify({
        "status": "success",
        "coup_de_coeur": featured
    }), 200

@partenaires_bp.route('/admin/supprimer', methods=['POST'])
@jwt_required()
def supprimer_partenaire():
    claims = get_jwt()
    
    if claims.get("role") != "admin":
        return jsonify({"error": "Accès refusé. Réservé aux administrateurs."}), 403
        
    return jsonify({"message": "Action administrateur autorisée"}), 200