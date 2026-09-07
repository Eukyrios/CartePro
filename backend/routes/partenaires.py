from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models import (
    Categorie,
    CoupDeCoeur,
    CoupDeCoeurStatut,
    Decision,
    DecisionSens,
    Partenaire,
    PartnerStatus,
    db,
)

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


def _refus(partenaire):
    """Le motif du refus, s'il y en a un. Sinon None.

    La derniere decision defavorable fait foi : un partenaire peut avoir ete
    refuse, puis reexamine. La table `decisions` garde tout, l'API rend
    l'actuelle.
    """
    if partenaire.statut != PartnerStatus.refuse:
        return None
    decision = (
        Decision.query.filter_by(
            partenaire_id=partenaire.id, sens=DecisionSens.refuse
        )
        .order_by(Decision.horodatage.desc())
        .first()
    )
    if not decision:
        return None
    return {"motif": decision.motif_ecrit, "at": decision.horodatage.isoformat()}


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
        # Le statut administratif en clair, et non plus seulement le booleen du
        # conventionnement : « en attente » et « refuse » ne sont pas la meme
        # chose, et un ecran qui les confond ne peut pas expliquer l'un.
        "statut": partenaire.statut.value,
        # Le motif, pour un partenaire ecarte. `None` sinon.
        "refus": _refus(partenaire),
        "featured": _est_coup_de_coeur(partenaire),
        # Fiche redigee, ou fiche de remplissage : le lecteur a le droit de
        # savoir ce qu'il regarde dans un demonstrateur.
        "donneesReelles": partenaire.donnees_reelles,
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


@partenaires_bp.route('/categories', methods=['GET'])
def categories():
    """Les categories du reseau, telles que la base les porte.

    Le front en avait une liste ecrite en dur, avec ses libelles. Deux listes
    pour un meme referentiel : une categorie ajoutee en base n'apparaissait pas
    dans le formulaire d'inscription, et un partenaire pouvait etre range dans
    une categorie que l'interface ne savait pas nommer.

    `id` est ce qu'un profil stocke, `label` ce qu'un ecran affiche. Ils sont
    derives du meme nom, donc renommer une categorie ne casse pas les fiches
    qui la citent : elles pointent sur l'identifiant.
    """
    return jsonify([
        {"id": c.nom, "label": c.nom[:1].upper() + c.nom[1:]}
        for c in Categorie.query.order_by(Categorie.nom).all()
    ]), 200


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
        # L'entree complete, plus les mots : la section d'accueil affiche une
        # tuile de partenaire — photographie, adresse, categorie — et la phrase
        # du Ministre. Deux requetes pour une seule section n'apprendraient
        # rien de plus.
        retour = {**_entree(choix.partenaire), "mot": choix.mot_du_ministre}
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
