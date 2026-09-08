"""L'authentification : connexion, inscription, profil, mot de passe, suppression.

Le contrat HTTP n'a pas bougé d'un octet avec la refonte du schéma — le front
poste et lit exactement les mêmes objets. Ce qui a changé est dessous : il n'y
a plus une table d'utilisateurs mais trois tables d'identifiants, et la
traduction vit dans `accounts.py`. Ce fichier ne parle que de règles.
"""
import re

from flask import jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError

from accounts import (
    DEFAULT_CARD_STYLE,
    PATTERNS,
    categorie,
    compte_depuis_identite,
    compte_par_email,
    email_pris,
    employeur_defaut,
    identite,
    role,
    serialiser,
    slug_libre,
)
from models import MotifCarte, Partenaire, PartnerStatus, Salaries, db

# Exporté : `app.py` l'importait d'ici avant la refonte, et le style par défaut
# reste une donnée d'authentification — c'est ce qu'une carte vaut à la création.
__all__ = [
    "DEFAULT_CARD_STYLE",
    "api_change_password",
    "api_delete_account",
    "api_login",
    "api_logout",
    "api_me",
    "api_register",
    "api_update_profile",
    "check_credentials",
]


def check_credentials(compte, password):
    from accounts import actif

    return bool(compte and actif(compte) and compte.check_password(password))


def _request_data():
    return request.get_json(silent=True) or {}


def _current_account():
    return compte_depuis_identite(get_jwt_identity())


def _token_response(compte, status=200, message="Success"):
    return jsonify({
        "message": message,
        "access_token": create_access_token(
            identity=identite(compte), additional_claims={"role": role(compte)}
        ),
        "user": serialiser(compte),
    }), status


def api_login():
    data = _request_data()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Email et mot de passe sont requis."}), 400

    compte = compte_par_email(email)
    if not check_credentials(compte, password):
        return jsonify({"error": "Email ou mot de passe incorrect."}), 401
    return _token_response(compte, message="Connexion réussie.")


def _inscrire_salarie(email, password, username):
    """Un salarié, rattaché à l'employeur du démonstrateur.

    Le schéma exige un employeur, une couleur de carte et une couleur de texte :
    ce sont des colonnes non nulles. L'inscription n'en déclare aucune, donc
    elles prennent la valeur par défaut de la carte — celle que le front
    afficherait de toute façon.
    """
    prenom, _, nom = username.partition(" ")
    salarie = Salaries(
        nom=nom.strip() or prenom,
        prenom=prenom,
        email=email,
        employeur_id=employeur_defaut().id,
        couleur_carte=DEFAULT_CARD_STYLE["color"],
        couleur_texte=DEFAULT_CARD_STYLE["text"],
        motif=MotifCarte(PATTERNS[DEFAULT_CARD_STYLE["pattern"]]),
        effet_metallise=DEFAULT_CARD_STYLE["metalness"],
    )
    salarie.set_password(password)
    return salarie


def _inscrire_partenaire(email, password, username, fiche):
    """Un partenaire, en attente de conventionnement.

    `PartnerStatus.en_attente` est le défaut du schéma, et c'est la bonne
    valeur : un compte qui vient d'être créé n'a pas encore été accepté. C'est
    ce statut que l'espace partenaire lit pour barrer l'encaissement.
    """
    raison = (fiche.get("raisonSociale") or username).strip()
    partenaire = Partenaire(
        slug=slug_libre(raison),
        raison_sociale=raison,
        siren=(fiche.get("siren") or "").strip(),
        objet_social=(fiche.get("objetSocial") or "").strip(),
        categorie_id=categorie(fiche.get("categorie")).id,
        adresse=(fiche.get("adresse") or "").strip(),
        ville=(fiche.get("ville") or "").strip(),
        code_postal=(fiche.get("codePostal") or "").strip(),
        email_contact=email,
        nom_representant=(fiche.get("nomRepresentant") or raison).strip(),
        statut=PartnerStatus.en_attente,
        tarif=0.0,
        site_web=(fiche.get("siteWeb") or "").strip(),
        presentation_titre=(fiche.get("presentationTitre") or "").strip(),
        presentation_texte=fiche.get("presentationTexte") or "",
        horaires=fiche.get("horaires") or {},
    )
    partenaire.set_password(password)
    return partenaire


def api_register():
    data = _request_data()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    username = (data.get("username") or "").strip()
    audience = data.get("audience", "employee")
    fiche = data.get("partner") or {}

    if not email or not password or not username:
        return jsonify({"error": "Nom d'utilisateur, email et mot de passe sont requis."}), 400
    if len(password) < 6:
        return jsonify({"error": "Le mot de passe doit faire au moins 6 caractères."}), 400
    if audience not in ("employee", "partner"):
        return jsonify({"error": "Type de compte invalide."}), 400
    if email_pris(email):
        return jsonify({"error": "Cet email est déjà utilisé."}), 409

    if audience == "partner":
        siren = (fiche.get("siren") or "").strip()
        if not siren:
            return jsonify({"error": "Le SIREN est requis pour un compte partenaire."}), 400
        if Partenaire.query.filter_by(siren=siren).first():
            return jsonify({"error": "Ce SIREN est déjà enregistré."}), 409
        compte = _inscrire_partenaire(email, password, username, fiche)
    else:
        compte = _inscrire_salarie(email, password, username)

    db.session.add(compte)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Cet email ou ce SIREN est déjà utilisé."}), 409
    return _token_response(compte, 201, "Compte créé.")


@jwt_required()
def api_me():
    compte = _current_account()
    if not compte:
        return jsonify({"error": "Compte introuvable."}), 404
    return jsonify({"user": serialiser(compte)}), 200


def _ecrire_style_carte(salarie, style):
    """Le style de carte, réparti sur ses quatre colonnes."""
    if not isinstance(style, dict):
        return
    fusion = {**DEFAULT_CARD_STYLE, **style}
    salarie.couleur_carte = fusion["color"]
    salarie.couleur_texte = fusion["text"]
    salarie.effet_metallise = int(fusion["metalness"])
    valeur = PATTERNS.get(fusion["pattern"])
    if valeur:
        salarie.motif = MotifCarte(valeur)


#: Une couleur hexadecimale a six chiffres, et rien d'autre.
_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def _ecrire_couleur_avatar(salarie, valeur):
    """L'aplat de la vignette, si la valeur en est une.

    Valide avant d'ecrire, comme le thème du site : la couleur finit dans un
    attribut `style`, donc une chaine libre y entrerait telle quelle. Une
    valeur absente ou mal formee laisse la couleur en place au lieu de la
    vider — un formulaire qui renvoie le profil entier ne doit pas pouvoir
    effacer un champ qu'il n'a pas touche.
    """
    if not isinstance(valeur, str) or not _HEX.match(valeur.strip()):
        return
    salarie.couleur_avatar = valeur.strip().lower()


def _ecrire_fiche_partenaire(partenaire, fiche):
    """La fiche déclarée par le partenaire, champ par champ.

    Rien n'est écrit à l'aveugle : le formulaire renvoie l'objet entier, mais
    la base a des colonnes non nulles, donc une valeur absente laisse
    l'existante en place plutôt que de la vider.
    """
    def pose(cle, attribut, defaut=None):
        valeur = fiche.get(cle)
        if isinstance(valeur, str):
            propre = valeur.strip()
            if propre or defaut is not None:
                setattr(partenaire, attribut, propre or defaut)

    pose("raisonSociale", "raison_sociale")
    pose("siren", "siren")
    pose("objetSocial", "objet_social", defaut="")
    pose("adresse", "adresse")
    pose("ville", "ville")
    pose("codePostal", "code_postal")
    pose("nomRepresentant", "nom_representant")
    pose("siteWeb", "site_web", defaut="")
    pose("presentationTitre", "presentation_titre", defaut="")
    if isinstance(fiche.get("presentationTexte"), str):
        partenaire.presentation_texte = fiche["presentationTexte"]
    if isinstance(fiche.get("horaires"), dict):
        partenaire.horaires = fiche["horaires"]
    if (fiche.get("categorie") or "").strip():
        partenaire.categorie_id = categorie(fiche["categorie"]).id


@jwt_required()
def api_update_profile():
    compte = _current_account()
    if not compte:
        return jsonify({"error": "Compte introuvable."}), 404
    data = _request_data()
    profile = data.get("profile") or data
    username = (profile.get("username") or "").strip()
    email = (profile.get("email") or "").strip().lower()
    if not username or not email:
        return jsonify({"error": "Nom d'utilisateur et email sont requis."}), 400
    if email_pris(email, sauf=compte):
        return jsonify({"error": "Cet email est déjà utilisé."}), 409

    if isinstance(compte, Partenaire):
        compte.raison_sociale = username
        compte.email_contact = email
        if isinstance(profile.get("partner"), dict):
            _ecrire_fiche_partenaire(compte, profile["partner"])
    else:
        prenom, _, nom = username.partition(" ")
        compte.prenom = prenom
        compte.nom = nom.strip() or prenom
        compte.email = email
        _ecrire_style_carte(compte, profile.get("cardStyle"))
        _ecrire_couleur_avatar(compte, profile.get("avatarColor"))

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Cet email ou ce SIREN est déjà utilisé."}), 409
    return jsonify({"user": serialiser(compte)}), 200


@jwt_required()
def api_change_password():
    compte = _current_account()
    data = _request_data()
    if not compte:
        return jsonify({"error": "Compte introuvable."}), 404
    if not check_credentials(compte, data.get("currentPassword") or ""):
        return jsonify({"error": "Le mot de passe actuel est incorrect."}), 401
    new_password = data.get("newPassword") or ""
    if len(new_password) < 6:
        return jsonify({"error": "Le nouveau mot de passe doit faire au moins 6 caractères."}), 400
    compte.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "Mot de passe modifié."}), 200


@jwt_required()
def api_delete_account():
    """Supprime le compte connecté — sauf s'il a une comptabilité derrière lui.

    Le schéma rend les transactions immuables : un `DELETE` sur une transaction
    lève, et la suppression en cascade d'un compte en essaierait un. Un compte
    qui a payé ou encaissé ne peut donc plus disparaître, et c'est la règle
    comptable qui le dit — pas une limitation de l'interface. Le refus est
    explicite plutôt que remonté comme une erreur 500 incompréhensible.
    """
    compte = _current_account()
    if not compte:
        return jsonify({"error": "Compte introuvable."}), 404
    if getattr(compte, "transactions", None):
        return jsonify({
            "error": "Ce compte porte des opérations enregistrées, qui sont "
                     "immuables : il ne peut pas être supprimé. Contactez "
                     "l'administration du dispositif."
        }), 409
    db.session.delete(compte)
    db.session.commit()
    return jsonify({"message": "Compte supprimé."}), 200


def api_logout():
    return jsonify({"message": "Déconnecté. Le jeton doit être effacé côté client."}), 200
