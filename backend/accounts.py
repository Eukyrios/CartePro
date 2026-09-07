"""Le pont entre les trois tables d'identifiants et le contrat de l'API.

Le schéma normalisé n'a plus de modèle `User` unique : un salarié, un
partenaire et un administrateur sont trois tables, avec chacune son email et
son empreinte de mot de passe. L'API, elle, n'a pas changé de forme — le front
attend toujours un `user` avec un `profile`, une `audience` et un
`balanceCents`. Ce module est l'endroit où cette traduction se fait, une fois,
pour que ni `auth.py` ni les routes n'aient à savoir dans quelle table ils
cherchent.

Le jeton porte l'identité sous la forme « genre:id » — « salarie:3 »,
« partenaire:7 », « admin:1 ». Un entier nu ne suffisait plus : les
identifiants se répètent d'une table à l'autre, et le salarié n° 3 n'est pas le
partenaire n° 3.
"""
import re
import unicodedata

from models import Admin, Categorie, Employeur, Partenaire, PartnerStatus, Salaries, db

DEFAULT_CARD_STYLE = {
    "color": "#1b3a6b",
    "text": "#ffffff",
    "pattern": "waves",
    "metalness": 20,
}

# Le motif de la carte : un nom côté interface, une valeur d'énumération en
# base. Les deux listes sont volontairement écrites côte à côte, pour qu'une
# valeur ajoutée d'un côté saute aux yeux si elle manque de l'autre.
PATTERNS = {
    "waves": "vagues",
    "dots": "points",
    "grid": "grille",
    "stripes": "rayures",
    "cross": "croisillons",
    "circles": "cercles",
    "checker": "damier",
    "none": "aucun",
}
PATTERNS_INVERSE = {valeur: nom for nom, valeur in PATTERNS.items()}

#: L'employeur par défaut. Le schéma exige un employeur pour tout salarié, et
#: une inscription depuis l'interface n'en déclare pas : le démonstrateur n'a
#: qu'un donneur d'ordre, le Ministère lui-même.
EMPLOYEUR_DEFAUT = "Ministère du Job et Bonheur"

#: Idem pour la catégorie d'un partenaire, quand elle n'est pas renseignée.
CATEGORIE_DEFAUT = "autres"


def slugify(valeur):
    """« Poney Dream 78 » → « poney-dream-78 ». Jamais vide."""
    sans_accent = (
        unicodedata.normalize("NFKD", valeur or "")
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    slug = re.sub(r"[^a-z0-9]+", "-", sans_accent.lower()).strip("-")
    return slug or "partenaire"


def slug_libre(base):
    """Un slug qui n'est pas déjà pris, en suffixant au besoin."""
    slug = slugify(base)
    candidat, n = slug, 2
    while Partenaire.query.filter_by(slug=candidat).first():
        candidat = f"{slug}-{n}"
        n += 1
    return candidat


def employeur_defaut():
    """L'employeur du démonstrateur, créé au premier besoin."""
    employeur = Employeur.query.filter_by(raison_sociale=EMPLOYEUR_DEFAUT).first()
    if not employeur:
        employeur = Employeur(raison_sociale=EMPLOYEUR_DEFAUT)
        db.session.add(employeur)
        db.session.flush()
    return employeur


def categorie(nom):
    """La catégorie portant ce nom, créée au premier besoin."""
    voulu = (nom or "").strip().lower() or CATEGORIE_DEFAUT
    trouvee = Categorie.query.filter_by(nom=voulu).first()
    if not trouvee:
        trouvee = Categorie(nom=voulu)
        db.session.add(trouvee)
        db.session.flush()
    return trouvee


# -----------------------------------------------------------------------------
# Identité portée par le jeton
# -----------------------------------------------------------------------------
GENRES = {"salarie": Salaries, "partenaire": Partenaire, "admin": Admin}


def identite(compte):
    """Ce qu'on écrit dans le jeton pour ce compte."""
    return f"{genre(compte)}:{compte.id}"


def genre(compte):
    if isinstance(compte, Salaries):
        return "salarie"
    if isinstance(compte, Partenaire):
        return "partenaire"
    return "admin"


def role(compte):
    """Le rôle tel que les routes protégées le lisent dans le jeton."""
    return {"salarie": "user", "partenaire": "partenaire", "admin": "admin"}[
        genre(compte)
    ]


def compte_depuis_identite(brute):
    """Le compte désigné par une identité de jeton, ou None.

    Accepte aussi un entier nu, pour ne pas invalider d'un coup les jetons
    émis avant la refonte : ils désignaient un salarié.
    """
    if brute is None:
        return None
    texte = str(brute)
    if ":" in texte:
        genre_lu, _, ident = texte.partition(":")
        modele = GENRES.get(genre_lu)
        if not modele:
            return None
    else:
        modele, ident = Salaries, texte
    try:
        return db.session.get(modele, int(ident))
    except (TypeError, ValueError):
        return None


def compte_par_email(email):
    """Le seul compte portant cet email, dans l'une des trois tables."""
    voulu = (email or "").strip().lower()
    if not voulu:
        return None
    return (
        Salaries.query.filter_by(email=voulu).first()
        or Partenaire.query.filter_by(email_contact=voulu).first()
        or Admin.query.filter_by(email=voulu).first()
    )


def email_pris(email, sauf=None):
    """Cet email est-il déjà utilisé par un autre compte ?"""
    autre = compte_par_email(email)
    if not autre:
        return False
    if sauf is not None and genre(autre) == genre(sauf) and autre.id == sauf.id:
        return False
    return True


# -----------------------------------------------------------------------------
# Le contrat que le front lit
# -----------------------------------------------------------------------------
def email_de(compte):
    return compte.email_contact if isinstance(compte, Partenaire) else compte.email


def nom_affiche(compte):
    if isinstance(compte, Salaries):
        return f"{compte.prenom} {compte.nom}".strip() or compte.email.split("@")[0]
    if isinstance(compte, Partenaire):
        return compte.raison_sociale
    return compte.nom


def style_carte(compte):
    """Le style de carte, reconstitué depuis ses quatre colonnes."""
    if not isinstance(compte, Salaries):
        return DEFAULT_CARD_STYLE.copy()
    return {
        "color": compte.couleur_carte or DEFAULT_CARD_STYLE["color"],
        "text": compte.couleur_texte or DEFAULT_CARD_STYLE["text"],
        "pattern": PATTERNS_INVERSE.get(
            compte.motif.value if compte.motif else None,
            DEFAULT_CARD_STYLE["pattern"],
        ),
        "metalness": compte.effet_metallise,
    }


def fiche_partenaire(partenaire):
    """Les champs que le formulaire de profil partenaire lit et écrit."""
    return {
        "raisonSociale": partenaire.raison_sociale or "",
        "siren": partenaire.siren or "",
        "objetSocial": partenaire.objet_social or "",
        "categorie": partenaire.categorie.nom if partenaire.categorie else "",
        "adresse": partenaire.adresse or "",
        "ville": partenaire.ville or "",
        "codePostal": partenaire.code_postal or "",
        "nomRepresentant": partenaire.nom_representant or "",
        "siteWeb": partenaire.site_web or "",
        "presentationTitre": partenaire.presentation_titre or "",
        "presentationTexte": partenaire.presentation_texte or "",
        "horaires": partenaire.horaires or {},
    }


def profil(compte):
    return {
        "audience": "partner" if isinstance(compte, Partenaire) else "employee",
        "username": nom_affiche(compte),
        "email": email_de(compte),
        "partner": fiche_partenaire(compte) if isinstance(compte, Partenaire) else {},
        "cardStyle": style_carte(compte),
    }


def solde_euros(compte):
    """Le solde en euros. Un partenaire n'en a pas : il encaisse, il ne dépense pas."""
    return float(compte.solde) if isinstance(compte, Salaries) else 0.0


def actif(compte):
    """Un compte refusé ou suspendu ne se connecte plus."""
    if isinstance(compte, Partenaire):
        return compte.statut not in (PartnerStatus.refuse, PartnerStatus.suspendu)
    return True


def serialiser(compte):
    return {
        "id": compte.id,
        "username": nom_affiche(compte),
        "email": email_de(compte),
        "role": role(compte),
        "isActive": actif(compte),
        "profile": profil(compte),
        "balanceCents": round(solde_euros(compte) * 100),
    }
