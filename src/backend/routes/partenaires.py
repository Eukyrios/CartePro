from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models import db, User

partenaires_bp = Blueprint('partenaires', __name__)

@partenaires_bp.route('/catalogue', methods=['GET'])
def catalogue():
    # 1. On va chercher tous les utilisateurs ayant le rôle partenaire
    partenaires_db = User.query.filter_by(role='partenaire').all()
    
    # 2. On formate le JSON pour le frontend
    catalogue = []
    for p in partenaires_db:
        # On gère le fait que partner_data puisse être vide
        data_json = p.partner_data if isinstance(p.partner_data, dict) else {}
        
        catalogue.append({
            # Le slug, pas la clé primaire : c'est lui qui tient dans une URL
            # et qui survit à un nouveau seed, et c'est par lui que la page de
            # paiement retrouve le partenaire. Repli sur l'id pour un compte
            # créé depuis l'interface, qui n'a pas de slug.
            "id": p.username or str(p.id),
            "nom": p.company_name or p.username or "Partenaire sans nom",
            "secteur": data_json.get("secteur", "Non défini"),
            "adresse": data_json.get("adresse", ""),
            "ville": data_json.get("ville", ""),
            "codePostal": data_json.get("codePostal", ""),
            "amountCents": int(data_json.get("amountCents", 0) or 0),
            "photo": data_json.get("photo", ""),
            # Le conventionnement « Partenaire Officiel du Ministère », qui est
            # un statut administratif — distinct de `featured`, qui est le coup
            # de cœur éditorial du Ministre.
            "officiel": bool(data_json.get("official", False)),
            "featured": data_json.get("featured", False)
        })
        
    return jsonify(catalogue), 200

@partenaires_bp.route('/coup-de-coeur', methods=['GET'])
def get_coup_de_coeur():
    # On récupère tous les partenaires
    partenaires_db = User.query.filter_by(role='partenaire').all()
    
    # On cherche le premier qui possède "featured: true" dans son dictionnaire JSON
    featured = next(
        (p for p in partenaires_db if isinstance(p.partner_data, dict) and p.partner_data.get("featured") is True), 
        None
    )
    
    if featured:
        retour = {
            "id": featured.id,
            "nom": featured.company_name or featured.username,
            "secteur": featured.partner_data.get("secteur", "Non défini")
        }
    else:
        retour = None

    return jsonify({
        "status": "success",
        "coup_de_coeur": retour
    }), 200

# J'ai ajouté l'ID dans l'URL pour que ce soit RESTful (ex: /admin/supprimer/3)
@partenaires_bp.route('/admin/supprimer/<int:partenaire_id>', methods=['DELETE'])
@jwt_required()
def supprimer_partenaire(partenaire_id):
    claims = get_jwt()
    
    if claims.get("role") != "admin":
        return jsonify({"error": "Accès refusé. Réservé aux administrateurs."}), 403
        
    partenaire = User.query.get(partenaire_id)
    if not partenaire or partenaire.role != 'partenaire':
        return jsonify({"error": "Partenaire introuvable dans la base de données."}), 404
        
    # Suppression définitive en base de données
    db.session.delete(partenaire)
    db.session.commit()
        
    return jsonify({"message": f"Le partenaire {partenaire.company_name or partenaire.id} a été supprimé."}), 200