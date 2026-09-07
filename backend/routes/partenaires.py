from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models import CoupDeCoeur, CoupDeCoeurStatut, Partenaire, PartnerStatus, db

partenaires_bp = Blueprint('partenaires', __name__)


def _est_coup_de_coeur(partenaire):
    """Le coup de coeur du Ministre est une entree active, pas un booleen.

    Le schema en fait une table a part — avec le mot du Ministre et un
    horodatage — parce que c'est une decision editoriale qui se date et se
    retire. L'API, elle, expose toujours un booleen : le front n'a pas a
    connaitre cette histoire pour poser un badge.
    """
    return any(
        cdc.statut == CoupDeCoeurStatut.actif for cdc in partenaire.coups_de_coeur
    )


def _entree(partenaire):
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
        # Le conventionnement « Partenaire Officiel du Ministere » : un statut
        # administratif, distinct du coup de coeur, qui est un gout.
        "officiel": partenaire.statut == PartnerStatus.valide,
        "featured": _est_coup_de_coeur(partenaire),
        # La presentation que le partenaire ecrit lui-meme, depuis ses
        # parametres. Elle sort ici parce que sa fiche est publique : le profil
        # complet, lui, demande le jeton de son proprietaire.
        "siteWeb": partenaire.site_web or "",
        "presentationTitre": partenaire.presentation_titre or "",
        "presentationTexte": partenaire.presentation_texte or "",
        "horaires": partenaire.horaires or {},
    }


@partenaires_bp.route('/catalogue', methods=['GET'])
def catalogue():
    return jsonify([_entree(p) for p in Partenaire.query.all()]), 200


@partenaires_bp.route('/coup-de-coeur', methods=['GET'])
def get_coup_de_coeur():
    """Le coup de coeur actif le plus recent, avec le mot du Ministre."""
    choix = (
        CoupDeCoeur.query.filter_by(statut=CoupDeCoeurStatut.actif)
        .order_by(CoupDeCoeur.horodatage.desc())
        .first()
    )
    retour = None
    if choix and choix.partenaire:
        retour = {
            "id": choix.partenaire.slug,
            "nom": choix.partenaire.raison_sociale,
            "secteur": (
                choix.partenaire.categorie.nom
                if choix.partenaire.categorie
                else "Non defini"
            ),
            "mot": choix.mot_du_ministre,
        }
    return jsonify({"status": "success", "coup_de_coeur": retour}), 200


@partenaires_bp.route('/admin/supprimer/<int:partenaire_id>', methods=['DELETE'])
@jwt_required()
def supprimer_partenaire(partenaire_id):
    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({"error": "Acces refuse. Reserve aux administrateurs."}), 403

    partenaire = db.session.get(Partenaire, partenaire_id)
    if not partenaire:
        return jsonify({"error": "Partenaire introuvable dans la base de donnees."}), 404

    # Un partenaire qui a encaisse porte une comptabilite immuable : la
    # supprimer essaierait d'effacer ses transactions, ce que le modele
    # interdit. On le suspend plutot que de le detruire — et c'est aussi ce
    # qu'une administration fait d'un partenaire ecarte.
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
