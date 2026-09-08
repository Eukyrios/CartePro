from datetime import datetime, timezone

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import func

from accounts import compte_depuis_identite
from models import (
    Categorie,
    Decision,
    DecisionSens,
    Partenaire,
    PartenaireLike,
    PartnerStatus,
    db,
)

partenaires_bp = Blueprint('partenaires', __name__)

def _entree(partenaire, compte_id=None):
    return {
        # Le slug, pas la cle primaire : c'est lui qui tient dans une URL et
        # qui survit a un nouveau seed, et c'est par lui que la page de
        # paiement retrouve le partenaire.
        "id": partenaire.slug,
        "nom": partenaire.raison_sociale,
        "secteur": partenaire.categorie.nom if partenaire.categorie else "Non defini",
        "adresse": partenaire.adresse or "",
        "ville": partenaire.ville or "",
        "codePostal": partenaire.code_postal or "",
        "amountCents": round((partenaire.tarif or 0) * 100),
        "photo": partenaire.image_partenaire or "",
        # Le conventionnement « Partenaire Officiel de l'administration » : un statut
        # administratif, distinct du coup de coeur communautaire.
        "officiel": partenaire.statut == PartnerStatus.valide,
        "statut": partenaire.statut.value,
        # On détermine si c'est le coup de cœur de la communauté pour le badge featured
        "featured": False, 
        "donneesReelles": partenaire.donnees_reelles,
        "siteWeb": partenaire.site_web or "",
        "presentationTitre": partenaire.presentation_titre or "",
        "presentationTexte": partenaire.presentation_texte or "",
        "horaires": partenaire.horaires or {},
        "likes": len(partenaire.likes),
        "liked_by_user": any(l.salarie_id == compte_id for l in partenaire.likes) if compte_id else False,
    }

@partenaires_bp.route('/catalogue', methods=['GET'])
@jwt_required(optional=True)
def catalogue():
    current_identity = get_jwt_identity()
    # Détermination du partenaire le plus liké pour l'attribut 'featured'
    top_id_query = db.session.query(
        PartenaireLike.partenaire_id
    ).group_by(PartenaireLike.partenaire_id).order_by(db.text('count(id) DESC')).first()
    
    top_id = top_id_query[0] if top_id_query else None

    catalogue_json = []
    for p in Partenaire.query.all():
        # The identity could be 'salarie:ID' or 'partenaire:ID', we only care about salarie ID for likes
        compte_id = None
        if current_identity and current_identity.startswith('salarie:'):
            compte_id = int(current_identity.split(':')[1])
        entree = _entree(p, compte_id)
        if top_id and p.id == top_id:
            entree["featured"] = True
        catalogue_json.append(entree)

    return jsonify(catalogue_json), 200

@partenaires_bp.route('/categories', methods=['GET'])
def categories():
    return jsonify([
        {"id": c.nom, "label": c.nom[:1].upper() + c.nom[1:]}
        for c in Categorie.query.order_by(Categorie.nom).all()
    ]), 200

@partenaires_bp.route('/coup-de-coeur', methods=['GET'])
def get_top_partenaire():
    """Récupère le partenaire le plus liké par les salariés de la communauté."""
    # 1. On compte les likes en groupant par partenaire
    top_id_query = db.session.query(
        PartenaireLike.partenaire_id,
        func.count(PartenaireLike.id).label('total_likes')
    ).group_by(PartenaireLike.partenaire_id).order_by(db.text('total_likes DESC')).first()

    # 2. Si personne n'a encore voté, on prend un partenaire valide au hasard par défaut
    if not top_id_query:
        partenaire = Partenaire.query.filter_by(statut=PartnerStatus.valide).first()
        total_likes = 0
    else:
        partenaire = db.session.get(Partenaire, top_id_query.partenaire_id)
        total_likes = top_id_query.total_likes

    if not partenaire:
        return jsonify({"status": "success", "coup_de_coeur": None}), 200

    # Le frontend (useAdminPick.ts) s'attend à une structure d'ApiPartner fusionnée avec 'mot'
    retour = {
        **_entree(partenaire, None),
        "mot": partenaire.presentation_titre or "Le préféré de notre communauté !",
        "likes": total_likes
    }
    return jsonify({"status": "success", "coup_de_coeur": retour}), 200

@partenaires_bp.route('/<slug>/like', methods=['POST'])
@jwt_required()
def toggle_like_partenaire(slug):
    """Permet à un salarié d'aimer (ou de retirer son like) sur un partenaire."""
    compte = compte_depuis_identite(get_jwt_identity())
    
    # Seuls les salariés peuvent voter (ils ont l'attribut employeur_id)
    if not hasattr(compte, 'employeur_id'):
        return jsonify({"error": "Seuls les salariés peuvent voter."}), 403

    partenaire = Partenaire.query.filter_by(slug=slug).first()
    if not partenaire:
        return jsonify({"error": "Partenaire introuvable"}), 404

    # On vérifie si le like existe déjà pour faire un "toggle"
    existing_like = PartenaireLike.query.filter_by(salarie_id=compte.id, partenaire_id=partenaire.id).first()
    
    if existing_like:
        db.session.delete(existing_like)
        action = "unliked"
    else:
        new_like = PartenaireLike(salarie_id=compte.id, partenaire_id=partenaire.id)
        db.session.add(new_like)
        action = "liked"

    db.session.commit()
    return jsonify({"status": "success", "action": action}), 200


@partenaires_bp.route('/reexamen', methods=['POST'])
@jwt_required()
def demander_reexamen():
    compte = compte_depuis_identite(get_jwt_identity())
    if not isinstance(compte, Partenaire):
        return jsonify({"error": "Reserve aux comptes partenaires."}), 403
    if compte.statut != PartnerStatus.refuse:
        return jsonify({
            "error": "Votre dossier n'est pas en etat de refus : il n'y a rien a reexaminer."
        }), 409

    compte.statut = PartnerStatus.en_attente
    db.session.add(Decision(
        partenaire_id=compte.id,
        agent_id=0,
        sens=DecisionSens.reexamen,
        motif_ecrit="Reexamen demande par l'etablissement.",
        horodatage=datetime.now(timezone.utc),
    ))
    db.session.commit()
    return jsonify({
        "message": "Votre demande de reexamen est enregistree. Votre dossier repasse en attente d'instruction.",
        "statut": compte.statut.value,
    }), 200

@partenaires_bp.route('/admin/supprimer/<int:partenaire_id>', methods=['DELETE'])
@jwt_required()
def supprimer_partenaire(partenaire_id):
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Acces refuse. Reserve aux administrateurs."}), 403

    partenaire = db.session.get(Partenaire, partenaire_id)
    if not partenaire:
        return jsonify({"error": "Partenaire introuvable dans la base de donnees."}), 404

    if partenaire.transactions:
        partenaire.statut = PartnerStatus.suspendu
        db.session.commit()
        return jsonify({
            "message": f"Le partenaire {partenaire.raison_sociale} a des operations "
                       f"enregistrees : il a ete suspendu, pas supprime."
        }), 200

    db.session.delete(partenaire)
    db.session.commit()
    return jsonify({"message": f"Le partenaire {partenaire.raison_sociale} a ete supprime."}), 200