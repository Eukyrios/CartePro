from datetime import datetime, timezone

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from accounts import compte_depuis_identite
from models import (
    Categorie,
    Decision,
    DecisionSens,
    Partenaire,
    PartnerStatus,
    db,
)

partenaires_bp = Blueprint('partenaires', __name__)


def _est_coup_de_coeur(partenaire):
    """Le coup de coeur de l'administrateur est une entree active, pas un booleen.

    Le schema en fait une table a part — avec le mot de l'administrateur et un
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
        # Le conventionnement « Partenaire Officiel de l'administration » : un statut
        # administratif, distinct du coup de coeur, qui est un gout.
        "officiel": partenaire.statut == PartnerStatus.valide,
        # Le statut administratif en clair, et non plus seulement le booleen du
        # conventionnement : « en attente » et « refuse » ne sont pas la meme
        # chose, et un ecran qui les confond ne peut pas expliquer l'un.
        # Le statut, oui ; le motif d'un refus, non. Cette route est publique,
        # et la raison pour laquelle un etablissement a ete ecarte est un
        # dossier administratif adresse a lui seul. Il la lit dans son espace,
        # par `/api/auth/me`.
        "statut": partenaire.statut.value,
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
    """Le coup de coeur actif le plus recent, avec le mot de l'administrateur."""
    choix = (
        CoupDeCoeur.query.filter_by(statut=CoupDeCoeurStatut.actif)
        .order_by(CoupDeCoeur.horodatage.desc())
        .first()
    )
    retour = None
    if choix and choix.partenaire:
        # L'entree complete, plus les mots : la section d'accueil affiche une
        # tuile de partenaire — photographie, adresse, categorie — et la phrase
        # de l'administrateur. Deux requetes pour une seule section n'apprendraient
        # rien de plus.
        retour = {**_entree(choix.partenaire), "mot": choix.mot_administrateur}
    return jsonify({"status": "success", "coup_de_coeur": retour}), 200


@partenaires_bp.route('/reexamen', methods=['POST'])
@jwt_required()
def demander_reexamen():
    """Le partenaire ecarte redepose son dossier.

    Son etablissement repasse « en attente », et la demande s'ecrit dans la
    table des decisions : un dossier qui rouvre laisse une trace, comme celui
    qui se ferme. Rien n'est efface — le refus precedent reste, avec son motif
    et sa date, parce que c'est l'historique de l'instruction.

    Reserve au titulaire du compte, et au seul cas ou il y a quelque chose a
    reexaminer : un partenaire deja conventionne ou deja en attente n'a rien a
    redeposer.
    """
    compte = compte_depuis_identite(get_jwt_identity())
    if not isinstance(compte, Partenaire):
        return jsonify({"error": "Reserve aux comptes partenaires."}), 403
    if compte.statut != PartnerStatus.refuse:
        return jsonify({
            "error": "Votre dossier n'est pas en etat de refus : il n'y a rien "
                     "a reexaminer."
        }), 409

    compte.statut = PartnerStatus.en_attente
    db.session.add(Decision(
        partenaire_id=compte.id,
        # L'agent n'est pas connu : c'est le partenaire qui demande, pas
        # l'administration qui tranche. Zero marque « a instruire ».
        agent_id=0,
        sens=DecisionSens.reexamen,
        motif_ecrit="Reexamen demande par l'etablissement.",
        horodatage=datetime.now(timezone.utc),
    ))
    db.session.commit()
    return jsonify({
        "message": "Votre demande de reexamen est enregistree. Votre dossier "
                   "repasse en attente d'instruction.",
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
