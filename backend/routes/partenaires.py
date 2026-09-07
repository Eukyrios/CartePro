from flask import Blueprint, jsonify
from models import db, FeaturedPick, User
from decorators import admin_required

partenaires_bp = Blueprint('partenaires', __name__)

@partenaires_bp.route('/catalogue', methods=['GET'])
def catalogue():
    # 1. On va chercher tous les partenaires actifs — une demande en attente
    #    de validation (voir la section admin) n'a pas encore sa place ici.
    partenaires_db = User.query.filter_by(role='partenaire', is_active=True).all()
    
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
    # Le choix actif, dans l'historique tenu par l'admin (voir
    # routes/admin.py) — plus le drapeau `featured` posé à la main dans
    # `partner_data`, qui ne gardait aucun historique et ne pouvait pas
    # revenir à un choix précédent.
    pick = FeaturedPick.query.filter_by(active=True).first()

    if pick and pick.partner:
        retour = {
            "id": pick.partner.id,
            "nom": pick.partner.company_name or pick.partner.username,
            "secteur": (pick.partner.partner_data or {}).get("secteur", "Non défini"),
            "commentaire": pick.comment,
        }
    else:
        retour = None

    return jsonify({
        "status": "success",
        "coup_de_coeur": retour
    }), 200


@partenaires_bp.route('/coup-de-coeur/clic', methods=['POST'])
def signaler_clic_coup_de_coeur():
    """Compte un passage de la section coup de cœur vers la fiche du
    partenaire — c'est ce que l'admin voit ensuite dans l'historique.
    """
    pick = FeaturedPick.query.filter_by(active=True).first()
    if not pick:
        return jsonify({"error": "Aucun coup de cœur actif."}), 404

    pick.click_count += 1
    db.session.commit()
    return jsonify({"clics": pick.click_count}), 200

# J'ai ajouté l'ID dans l'URL pour que ce soit RESTful (ex: /admin/supprimer/3)
@partenaires_bp.route('/admin/supprimer/<int:partenaire_id>', methods=['DELETE'])
@admin_required
def supprimer_partenaire(partenaire_id):
    partenaire = User.query.get(partenaire_id)
    if not partenaire or partenaire.role != 'partenaire':
        return jsonify({"error": "Partenaire introuvable dans la base de données."}), 404
        
    # Suppression définitive en base de données
    db.session.delete(partenaire)
    db.session.commit()
        
    return jsonify({"message": f"Le partenaire {partenaire.company_name or partenaire.id} a été supprimé."}), 200