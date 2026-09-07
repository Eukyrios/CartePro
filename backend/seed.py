"""Jeu de données de démonstration, déterministe.

Ce que ce script garantit, et pourquoi :

1. Le réseau. Les seize partenaires du démonstrateur, avec leur adresse, leur
   ville, leur code postal, leur tarif et leur conventionnement. Ils sont le
   miroir de frontend/components/data/partners.ts : les identifiants sont les
   mêmes de part et d'autre (le slug, porté par `username`), de sorte qu'une
   tuile du catalogue et la page de paiement désignent le même partenaire.
   Les deux listes se déplacent ensemble — modifier l'une sans l'autre casse
   ce lien.

2. Des comptes utilisables. Un par type d'utilisateur, mot de passe réel et
   `audience` renseignée : le script posait auparavant la chaîne littérale
   "fakehash" dans `password_hash`, si bien qu'aucun des soixante-deux comptes
   créés ne pouvait se connecter, et laissait `audience` à sa valeur par
   défaut, ce qui affichait les partenaires comme des salariés.

3. Le panel du cabinet. Cinquante salariés, deux cents transactions, et les
   cas limites exigés : trois soldes à zéro, deux sous les cinq euros, des
   refus. Faker et random sont amorcés, la date de référence est fixe : deux
   exécutions donnent la même base.

Attention : ce script commence par un db.drop_all(). Tout compte créé depuis
l'interface est effacé. Il se lance avant de se créer un compte, pas après.
"""

import random
from datetime import datetime, timedelta, timezone

from faker import Faker

from app import create_app
from accounts import PATTERNS
from models import (
    Abondement,
    Admin,
    Categorie,
    CoupDeCoeur,
    CoupDeCoeurStatut,
    Decision,
    DecisionSens,
    Employeur,
    MotifCarte,
    Partenaire,
    PartnerStatus,
    Salaries,
    Transaction,
    TransactionStatut,
    db,
)
from services.csv_service import generate_transactions_csv

fake = Faker('fr_FR')

# 1. Déterminisme absolu
Faker.seed(42)
random.seed(42)
REFERENCE_DATE = datetime(2026, 6, 1, 8, 0, 0, tzinfo=timezone.utc)

# Un seul mot de passe pour tous les comptes semés : ce sont des comptes de
# démonstration, et un identifiant qu'il faut aller chercher dans le code n'est
# pas « déjà renseigné ». Il est imprimé à la fin du script.
DEMO_PASSWORD = "CartePro2026"

# Le réseau, miroir de frontend/components/data/partners.ts.
# La presentation que quelques partenaires ont deja ecrite, par slug.
#
# C'est du contenu d'auteur, pas une donnee du reseau : un partenaire la saisit
# dans ses parametres, et la plupart n'en ont pas. La semer pour trois d'entre
# eux suffit a montrer la section remplie, la section absente, et le rendu de
# chaque marque du Markdown accepte.
PRESENTATIONS = {
    "poney-dream-78": {
        "presentationTitre": "Ce que nous faisons",
        "presentationTexte": (
            "Un manege **couvert**, ouvert *toute l'annee*, a vingt minutes de la gare "
            "de Rambouillet.\n"
            "\n"
            "- baptemes a poney des trois ans\n"
            "- balades encadrees en foret, groupes de six\n"
            "- goutez d'anniversaire sur reservation\n"
            "\n"
            "> Ouvert aussi le lundi pendant les vacances scolaires.\n"
            "\n"
            "# Venir nous voir\n"
            "\n"
            "Le `312` s'arrete devant le portail. Reservations par telephone ou sur "
            "[notre site](https://poney-dream-78.fr)."
        ),
        "siteWeb": "poney-dream-78.fr",
        # Format fixe : deux heures par jour, « HH:MM ». Un jour sans
        # heures est ferme.
        "horaires": {
            "lundi": {"ouvre": "", "ferme": ""},
            "mardi": {"ouvre": "09:00", "ferme": "18:00"},
            "mercredi": {"ouvre": "09:00", "ferme": "18:00"},
            "jeudi": {"ouvre": "09:00", "ferme": "18:00"},
            "vendredi": {"ouvre": "09:00", "ferme": "18:00"},
            "samedi": {"ouvre": "09:00", "ferme": "19:00"},
            "dimanche": {"ouvre": "10:00", "ferme": "17:00"},
        },
    },
    "glaces-correze": {
        "presentationTitre": "Trente-deux parfums, tous d'ici",
        "presentationTexte": (
            "Le lait vient de la ferme d'a cote et les fruits du marche du samedi. "
            "Rien de surgele, rien d'aromatise.\n"
            "\n"
            "Les parfums tournent avec les saisons : chataigne a l'automne, "
            "__myrtille en juillet__.\n"
            "\n"
            "1. choisissez votre cornet\n"
            "2. deux boules maximum, c'est plus sage\n"
            "3. mangez vite"
        ),
        "siteWeb": "https://glaces-correze.fr",
        # Le mercredi portait « 10:00 - 12:30 / 14:00 - 19:00 » : la coupure
        # de midi ne s'exprime plus, le format fixe ne retient qu'une plage par
        # jour. C'est l'amplitude qui reste, et le texte de presentation est la
        # ou une exception se raconte.
        "horaires": {
            "lundi": {"ouvre": "14:00", "ferme": "19:00"},
            "mardi": {"ouvre": "14:00", "ferme": "19:00"},
            "mercredi": {"ouvre": "10:00", "ferme": "19:00"},
            "jeudi": {"ouvre": "14:00", "ferme": "19:00"},
            "vendredi": {"ouvre": "14:00", "ferme": "19:00"},
            "samedi": {"ouvre": "10:00", "ferme": "19:30"},
            "dimanche": {"ouvre": "10:00", "ferme": "13:00"},
        },
    },
    "kostumparty": {
        "presentationTitre": "Costumes et deguisements",
        "presentationTexte": (
            "Location **et** vente, du *XVIIIe siecle* au disco. Deux mille "
            "pieces en rayon, tailles enfant comprises.\n"
            "\n"
            "- essayage sur rendez-vous, comptez une heure\n"
            "- retouches offertes sur les locations\n"
            "- caution restituee au retour de la piece\n"
            "\n"
            "> Les costumes de scene ne sortent pas de l'atelier.\n"
            "\n"
            "# Nous trouver\n"
            "\n"
            "Metro `Voltaire`, sortie rue de la Roquette."
        ),
        "siteWeb": "kostumparty.fr",
        "horaires": {
            "lundi": {"ouvre": "", "ferme": ""},
            "mardi": {"ouvre": "11:00", "ferme": "19:00"},
            "mercredi": {"ouvre": "11:00", "ferme": "19:00"},
            "jeudi": {"ouvre": "11:00", "ferme": "19:00"},
            "vendredi": {"ouvre": "11:00", "ferme": "20:00"},
            "samedi": {"ouvre": "10:00", "ferme": "20:00"},
            "dimanche": {"ouvre": "", "ferme": ""},
        },
    },
    "chapelier-fontaine": {
        "presentationTitre": "Chapeaux faits main",
        "presentationTexte": (
            "Feutre, paille, casquettes de ville. Chaque piece est **mise en "
            "forme sur bois**, a la main, dans l'atelier du fond.\n"
            "\n"
            "- prise de mesure et conformateur\n"
            "- remise en forme des chapeaux anciens\n"
            "\n"
            "> Comptez trois semaines pour une commande sur mesure.\n"
            "\n"
            "*L'elegance n'a pas besoin d'etre voyante.*"
        ),
        "siteWeb": "chapelier-fontaine.fr",
        "horaires": {
            "lundi": {"ouvre": "", "ferme": ""},
            "mardi": {"ouvre": "10:00", "ferme": "18:30"},
            "mercredi": {"ouvre": "10:00", "ferme": "18:30"},
            "jeudi": {"ouvre": "10:00", "ferme": "18:30"},
            "vendredi": {"ouvre": "10:00", "ferme": "18:30"},
            "samedi": {"ouvre": "10:00", "ferme": "19:00"},
            "dimanche": {"ouvre": "", "ferme": ""},
        },
    },
}

NETWORK = [
    {
        "slug": "poney-dream-78",
        "nom": "Poney Dream 78",
        "secteur": "loisirs",
        "adresse": "12 chemin des Écuries",
        "ville": "Rambouillet",
        "codePostal": "78120",
        "photo": "/partenaires/poney-dream-78.svg",
        "amountCents": 2500,
        "official": True,
        "featured": True,
    },
    {
        "slug": "kostumparty",
        "nom": "KostumParty",
        "secteur": "culture",
        "adresse": "23 rue de la Roquette",
        "ville": "Paris",
        "codePostal": "75011",
        "photo": "/partenaires/kostumparty.svg",
        "amountCents": 1800,
        "official": False,
        "featured": True,
    },
    {
        "slug": "glaces-correze",
        "nom": "Glaces Artisanales Corrèze",
        "secteur": "restauration",
        "adresse": "3 place de la Halle",
        "ville": "Brive-la-Gaillarde",
        "codePostal": "19100",
        "photo": "/partenaires/glaces-correze.svg",
        "amountCents": 450,
        "official": False,
        "featured": True,
    },
    {
        "slug": "chapelier-fontaine",
        "nom": "Chapelier Fontaine",
        "secteur": "culture",
        "adresse": "9 rue des Filatiers",
        "ville": "Toulouse",
        "codePostal": "31000",
        "photo": "/partenaires/chapelier-fontaine.svg",
        "amountCents": 2900,
        "official": True,
        "featured": True,
    },
    {
        "slug": "table-des-quais",
        "nom": "La Table des Quais",
        "secteur": "restauration",
        "adresse": "7 quai de la Fosse",
        "ville": "Nantes",
        "codePostal": "44000",
        "photo": "/partenaires/table-des-quais.svg",
        "amountCents": 1900,
        "official": False,
        "featured": False,
    },
    {
        "slug": "librairie-bellevue",
        "nom": "Librairie Bellevue",
        "secteur": "culture",
        "adresse": "22 cours Berriat",
        "ville": "Grenoble",
        "codePostal": "38000",
        "photo": "/partenaires/librairie-bellevue.svg",
        "amountCents": 1650,
        "official": True,
        "featured": False,
    },
    {
        "slug": "atelier-savon-marseille",
        "nom": "Atelier du Savon de Marseille",
        "secteur": "commerce",
        "adresse": "9 rue Sainte",
        "ville": "Marseille",
        "codePostal": "13001",
        "photo": "/partenaires/atelier-savon-marseille.svg",
        "amountCents": 900,
        "official": False,
        "featured": False,
    },
    {
        "slug": "thermes-chaudes-aigues",
        "nom": "Thermes de Chaudes-Aigues",
        "secteur": "bien-etre",
        "adresse": "1 avenue Georges-Pompidou",
        "ville": "Chaudes-Aigues",
        "codePostal": "15110",
        "photo": "/partenaires/thermes-chaudes-aigues.svg",
        "amountCents": 3200,
        "official": True,
        "featured": False,
    },
    {
        "slug": "gite-monts-dore",
        "nom": "Gîte des Monts Dore",
        "secteur": "hebergement",
        "adresse": "5 route du Sancy",
        "ville": "Le Mont-Dore",
        "codePostal": "63240",
        "photo": "/partenaires/gite-monts-dore.svg",
        "amountCents": 8900,
        "official": False,
        "featured": False,
    },
    {
        "slug": "cinema-rex-lille",
        "nom": "Cinéma Le Rex",
        "secteur": "culture",
        "adresse": "31 rue de Béthune",
        "ville": "Lille",
        "codePostal": "59800",
        "photo": "/partenaires/cinema-rex-lille.svg",
        "amountCents": 750,
        "official": True,
        "featured": False,
    },
    {
        "slug": "accrobranche-esterel",
        "nom": "Accrobranche de l'Estérel",
        "secteur": "loisirs",
        "adresse": "Route du Col Notre-Dame",
        "ville": "Fréjus",
        "codePostal": "83600",
        "photo": "/partenaires/accrobranche-esterel.svg",
        "amountCents": 2200,
        "official": False,
        "featured": False,
    },
    {
        "slug": "primeur-victor-hugo",
        "nom": "Primeur Victor-Hugo",
        "secteur": "commerce",
        "adresse": "14 place Victor-Hugo",
        "ville": "Toulouse",
        "codePostal": "31000",
        "photo": "/partenaires/primeur-victor-hugo.svg",
        "amountCents": 1200,
        "official": False,
        "featured": False,
    },
    {
        "slug": "creperie-armor",
        "nom": "Crêperie d'Armor",
        "secteur": "restauration",
        "adresse": "2 venelle du Port",
        "ville": "Vannes",
        "codePostal": "56000",
        "photo": "/partenaires/creperie-armor.svg",
        "amountCents": 1450,
        "official": False,
        "featured": False,
    },
    {
        "slug": "spa-vosges",
        "nom": "Spa des Vosges",
        "secteur": "bien-etre",
        "adresse": "8 rue du Tilleul",
        "ville": "Gérardmer",
        "codePostal": "88400",
        "photo": "/partenaires/spa-vosges.svg",
        "amountCents": 5500,
        "official": False,
        "featured": False,
    },
    {
        "slug": "musee-verre-biot",
        "nom": "Musée du Verre de Biot",
        "secteur": "culture",
        "adresse": "5 chemin des Combes",
        "ville": "Biot",
        "codePostal": "06410",
        "photo": "/partenaires/musee-verre-biot.svg",
        "amountCents": 600,
        "official": True,
        "featured": False,
    },
    {
        "slug": "camping-etang-bleu",
        "nom": "Camping de l'Étang Bleu",
        "secteur": "hebergement",
        "adresse": "Lieu-dit Le Grand Étang",
        "ville": "Vayrac",
        "codePostal": "46110",
        "photo": "/partenaires/camping-etang-bleu.svg",
        "amountCents": 4200,
        "official": False,
        "featured": False,
    },]

# Le salarié de démonstration : un compte à part du panel statistique, dont le
# solde reste ce qu'il est — les cinquante autres servent aux cas limites.
DEMO_EMPLOYEE_EMAIL = "camille.durand@administration.example"

# Le compte de demonstration : un credit, deux paiements, et le solde qui en
# resulte. Ce sont de vraies lignes en base, et non plus une histoire simulee
# dans le navigateur — l'historique de l'ecran est desormais celui du serveur,
# donc il faut qu'il y ait quelque chose a lire.
DEMO_EMPLOYEE_CREDIT = 50.00
DEMO_EMPLOYEE_PAIEMENTS = [
    {"slug": "creperie-armor", "montant": 5.00, "jour": 95},
    {"slug": "chapelier-fontaine", "montant": 12.50, "jour": 89},
]
DEMO_EMPLOYEE_BALANCE = DEMO_EMPLOYEE_CREDIT - sum(
    p["montant"] for p in DEMO_EMPLOYEE_PAIEMENTS
)
DEMO_ADMIN_EMAIL = "admin@administration.example"

DEFAULT_CARD_STYLE = {
    "color": "#4a1b6b",
    "text": "#ffffff",
    "pattern": "waves",
    "metalness": 20,
}


# Le remplissage : la legende de Romulus et Remus, en latin.
#
# Du faux texte, et qui s'assume comme tel — c'est le lorem ipsum de ce
# demonstrateur. Il sert a ce que les seize fiches du reseau aient une
# presentation a montrer, sans qu'on prete aux commerces fictifs des mots
# francais qu'on pourrait prendre pour vrais. Une phrase latine sur la louve du
# Tibre ne trompe personne.
LEGENDE = [
    "Proca rex Albanorum duos filios, Numitorem et Amulium, habuit.",
    "Amulius fratrem Numitorem regno expulit et filiam eius Rheam Silviam Vestae sacerdotem fecit.",
    "Rhea Silvia geminos filios, Romulum et Remum, edidit, quorum patrem Martem fuisse ferunt.",
    "Amulius infantes in Tiberim abici iussit, sed alveus aqua decrescente in sicco relictus est.",
    "Lupa, quae ex montibus ad sitim explendam decurrerat, parvulis ubera admovit.",
    "Faustulus pastor eos invenit et Accae Larentiae uxori educandos dedit.",
    "Adulti Amulium interfecerunt et Numitori avo regnum restituerunt.",
    "Deinde urbem condere statuerunt in eis locis ubi expositi educatique erant.",
    "Certamen ortum est: Romulus in Palatino, Remus in Aventino auguria petivit.",
    "Remo sex vultures, Romulo duodecim apparuerunt, et Romulus rex salutatus est.",
    "Muros novae urbis Remus irridens transiluit; ira accensus Romulus eum interfecit.",
    "Ita solus potitus imperio Romulus urbem conditam ex nomine suo Romam appellavit.",
]

# Les titres du remplissage, en latin eux aussi.
TITRES_LATINS = [
    "De origine nostra",
    "Quid apud nos agitur",
    "Ab urbe condita",
    "Lupa et gemini",
    "Auguria et muri",
    "Palatinum et Aventinum",
]

# Quelques semaines plausibles, piochees par partenaire. Format fixe :
# deux heures par jour, une paire vide vaut « ferme ».
def _plage(ouvre, ferme):
    return {"ouvre": ouvre, "ferme": ferme}


FERME = _plage("", "")

SEMAINES = [
    # Ferme le lundi, ouvert le week-end.
    [FERME, _plage("09:30", "18:30"), _plage("09:30", "18:30"),
     _plage("09:30", "18:30"), _plage("09:30", "19:00"),
     _plage("09:30", "19:00"), _plage("10:00", "17:00")],
    # Semaine de bureau, week-end ferme.
    [_plage("08:30", "17:30"), _plage("08:30", "17:30"), _plage("08:30", "17:30"),
     _plage("08:30", "17:30"), _plage("08:30", "16:30"), FERME, FERME],
    # Commerce de bouche : ouvert le dimanche matin, ferme le lundi.
    [FERME, _plage("07:00", "13:00"), _plage("07:00", "13:00"),
     _plage("07:00", "13:00"), _plage("07:00", "19:00"),
     _plage("07:00", "19:00"), _plage("07:00", "12:30")],
    # Etablissement de soiree.
    [_plage("14:00", "22:00"), _plage("14:00", "22:00"), _plage("14:00", "22:00"),
     _plage("14:00", "23:00"), _plage("14:00", "23:30"),
     _plage("11:00", "23:30"), _plage("11:00", "20:00")],
    # Sept jours sur sept.
    [_plage("10:00", "19:00")] * 7,
]


def presentation_bidon(entry):
    """Une presentation de remplissage pour un partenaire du reseau.

    Deterministe et propre a chaque fiche : le tirage est amorce par le slug,
    donc deux `make seed` donnent le meme texte et deux partenaires n'ont pas
    le meme. Le tirage passe par un generateur local et non par `random`
    global, pour ne pas decaler la suite des transactions.

    Le Markdown est varie a dessein — gras, italique, liste, citation, titre —
    afin que chaque fiche exerce le rendu plutot que de le supposer.
    """
    tirage = random.Random(entry["slug"])
    phrases = tirage.sample(LEGENDE, 6)
    semaine = tirage.choice(SEMAINES)
    corps = (
        f"{phrases[0]} **{entry['nom']}** {phrases[1]}\n"
        "\n"
        f"- *{phrases[2]}*\n"
        f"- {phrases[3]}\n"
        "\n"
        f"> {phrases[4]}\n"
        "\n"
        "# Ab urbe condita\n"
        "\n"
        # « in tabulis nostris » et non « Ministerii » : le faux texte latin
        # nommait un ministere, et il s'affiche sur la fiche publique du
        # partenaire. Du remplissage n'a pas a porter une mention d'Etat.
        f"{phrases[5]} Signum nostrum `{entry['slug']}` in tabulis "
        "nostris scriptum est."
    )
    return {
        "presentationTitre": tirage.choice(TITRES_LATINS),
        "presentationTexte": corps,
        "siteWeb": f"{entry['slug']}.fr",
        "horaires": {jour: dict(semaine[n]) for n, jour in enumerate(JOURS_CLES)},
    }


#: Les sept jours, dans l'ordre ou la semaine se lit. Memes cles que le front.
JOURS_CLES = [
    "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
]


def presentation_de(entry):
    """La presentation d'un partenaire : la vraie si elle existe, sinon du faux.

    `PRESENTATIONS` est ecrite a la main et fait foi. Elle contient exactement
    les quatre partenaires que l'administrateur distingue — la regle est simple et
    sans exception : redige si et seulement si coup de coeur. Les douze autres
    recoivent le remplissage latin, et leur fiche le dit.
    """
    if entry["slug"] in PRESENTATIONS:
        return PRESENTATIONS[entry["slug"]]
    return presentation_bidon(entry)


def donnees_reelles(entry):
    """Cette fiche est-elle redigee ? Vrai pour les seuls coups de coeur."""
    return entry["slug"] in PRESENTATIONS


# Le statut administratif de chaque partenaire, et le motif d'un refus.
#
# Le dispositif n'est pas un annuaire ou tout le monde entre : un partenaire est
# conventionne, en attente d'examen, ou ecarte. Les trois cas existent donc dans
# les donnees, et le troisieme porte sa raison — c'est ce que la table
# `decisions` exige, et c'est aussi la seule facon honnete de refuser
# quelqu'un : par ecrit, avec un motif.
#
# Ce que le reste du reseau n'enumere pas est conventionne : la majorite.
EN_ATTENTE = {
    "kostumparty": None,
    "gite-monts-dore": None,
    "primeur-victor-hugo": None,
}

REFUSES = {
    "camping-etang-bleu": (
        "Etablissement saisonnier ferme plus de six mois par an : le "
        "conventionnement suppose une ouverture continue sur l'annee civile."
    ),
    "spa-vosges": (
        "Prestations relevant du soin a la personne sans agrement sanitaire "
        "produit au dossier. Reexamen possible sur presentation de l'agrement."
    ),
}


def statut_de(entry):
    """Le statut administratif d'un partenaire du reseau."""
    if entry["slug"] in REFUSES:
        return PartnerStatus.refuse
    if entry["slug"] in EN_ATTENTE:
        return PartnerStatus.en_attente
    return PartnerStatus.valide


# Les mots de l'administrateur sur ses coups de cœur, par slug.
#
# Le schéma leur donne une colonne — `CoupDeCoeur.mot_administrateur` — donc ils
# vivent en base et non plus seulement dans le front. Les quatre phrases sont
# celles que portait l'ancien `frontend/components/data/ministerPicks.ts`,
# supprime depuis : la même sélection,
# les mêmes mots, jusqu'à ce que l'espace d'administration prenne la main.
MOTS_ADMINISTRATEUR = {
    "poney-dream-78": "Parfait pour ressouder une équipe et renouer avec la nature.",
    "kostumparty": "La créativité est la clé du bonheur au travail.",
    "glaces-correze": "Soutenir l'artisanat français, un parfum à la fois.",
    "chapelier-fontaine": "L'élégance française.",
}


def _categories(session):
    """Une categorie par secteur cite dans le reseau, creee une fois."""
    noms = sorted({entry["secteur"] for entry in NETWORK})
    par_nom = {}
    for nom in noms:
        categorie = Categorie(nom=nom)
        session.add(categorie)
        par_nom[nom] = categorie
    session.flush()
    return par_nom


def make_partner(entry, categories):
    """Un compte partenaire a partir d'une entree du reseau.

    Le `slug` est l'identifiant que l'API expose et que la page de paiement
    resout — il vient des donnees, pas d'une cle primaire, parce que les pages
    du front sont pre-rendues sur lui.

    Le conventionnement est un statut de l'administration : `valide` pour un
    partenaire officiel, `en_attente` pour les autres. C'est lui que l'espace
    partenaire lit pour ouvrir ou barrer l'encaissement.
    """
    presentation = presentation_de(entry)
    partenaire = Partenaire(
        slug=entry["slug"],
        raison_sociale=entry["nom"],
        # Un SIREN par partenaire, derive de son rang : le schema l'exige non
        # nul et unique. Il ne pretend pas etre un vrai numero.
        siren=f"{900000000 + NETWORK.index(entry):09d}",
        objet_social=entry["secteur"],
        categorie_id=categories[entry["secteur"]].id,
        adresse=entry["adresse"],
        ville=entry["ville"],
        code_postal=entry["codePostal"],
        email_contact=f"contact@{entry['slug']}.fr",
        nom_representant=entry["nom"],
        statut=statut_de(entry),
        image_partenaire=entry["photo"],
        tarif=entry["amountCents"] / 100,
        site_web=presentation.get("siteWeb", ""),
        presentation_titre=presentation.get("presentationTitre", ""),
        presentation_texte=presentation.get("presentationTexte", ""),
        horaires=presentation.get("horaires", {}),
        donnees_reelles=donnees_reelles(entry),
    )
    partenaire.set_password(DEMO_PASSWORD)
    return partenaire


def make_salarie(email, prenom, nom, employeur):
    salarie = Salaries(
        nom=nom,
        prenom=prenom,
        email=email,
        employeur_id=employeur.id,
        couleur_carte=DEFAULT_CARD_STYLE["color"],
        couleur_texte=DEFAULT_CARD_STYLE["text"],
        motif=MotifCarte(PATTERNS[DEFAULT_CARD_STYLE["pattern"]]),
        effet_metallise=DEFAULT_CARD_STYLE["metalness"],
    )
    salarie.set_password(DEMO_PASSWORD)
    return salarie


def run_seed():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        # 1. L'employeur du dispositif, et les categories du reseau.
        employeur = Employeur(raison_sociale="Administration")
        db.session.add(employeur)
        db.session.flush()
        categories = _categories(db.session)

        # 2. Le reseau : seize partenaires renseignes.
        partenaires = [make_partner(entry, categories) for entry in NETWORK]
        for partenaire in partenaires:
            db.session.add(partenaire)
        db.session.flush()

        # 3. Les decisions ecrites : un refus se motive, et la trace reste.
        # C'est ce que la table `decisions` porte, et ce que la fiche d'un
        # partenaire ecarte affiche en premiere position.
        for entry, partenaire in zip(NETWORK, partenaires):
            motif = REFUSES.get(entry["slug"])
            if motif:
                db.session.add(Decision(
                    partenaire_id=partenaire.id,
                    agent_id=1,
                    sens=DecisionSens.refuse,
                    motif_ecrit=motif,
                    horodatage=REFERENCE_DATE + timedelta(days=12),
                ))

        # 4. Le coup de coeur de l'administrateur : une entree datee, avec ses mots.
        # C'est une table a part et non un booleen, parce qu'une decision
        # editoriale se date et se retire.
        for entry, partenaire in zip(NETWORK, partenaires):
            if entry["featured"]:
                db.session.add(CoupDeCoeur(
                    partenaire_id=partenaire.id,
                    mot_administrateur=MOTS_ADMINISTRATEUR.get(
                        entry["slug"], f"Un choix de l'administrateur : {entry['nom']}."
                    ),
                    statut=CoupDeCoeurStatut.actif,
                    horodatage=REFERENCE_DATE,
                ))

        # 4. Les cinquante salaries du panel, et leur dotation.
        # Salaries 0 a 2 : cibles a solde nul. Salaries 3 et 4 : sous 5 euros.
        dotations_ciblees = [50.0, 12.5, 100.0, 50.0, 20.0]
        salaries = []
        dotations = []
        for i in range(50):
            dotation = dotations_ciblees[i] if i < 5 else round(random.uniform(60, 200), 2)
            salarie = make_salarie(
                f"salarie{i}@administration.example", fake.first_name(), f"Salarie{i}", employeur
            )
            db.session.add(salarie)
            salaries.append(salarie)
            dotations.append(dotation)

        # 5. Les comptes de demonstration nommes. Le partenaire de
        # demonstration est le premier du reseau, deja cree.
        demo_employee = make_salarie(DEMO_EMPLOYEE_EMAIL, "Camille", "Durand", employeur)
        db.session.add(demo_employee)

        admin = Admin(email=DEMO_ADMIN_EMAIL, nom="Agent de l'administration")
        admin.set_password(DEMO_PASSWORD)
        db.session.add(admin)
        db.session.flush()

        # 6. Les abondements : c'est eux qui font le solde. Dans le schema
        # normalise, un salarie n'a pas de colonne « solde » — il a des credits
        # employeur moins des transactions validees.
        for salarie, dotation in zip(salaries, dotations):
            db.session.add(Abondement(
                employeur_id=employeur.id,
                salarie_id=salarie.id,
                montant=dotation,
                horodatage=REFERENCE_DATE,
                agent_admin_id=admin.id,
            ))
        db.session.add(Abondement(
            employeur_id=employeur.id,
            salarie_id=demo_employee.id,
            montant=DEMO_EMPLOYEE_CREDIT,
            horodatage=REFERENCE_DATE + timedelta(days=77),
            agent_admin_id=admin.id,
        ))
        db.session.commit()

        # Les deux paiements du compte de demonstration, nommes plutot que
        # tires au hasard : c'est l'historique qu'on montre.
        par_slug = {p.slug: p for p in partenaires}
        for n, paiement in enumerate(DEMO_EMPLOYEE_PAIEMENTS):
            db.session.add(Transaction(
                salarie_id=demo_employee.id,
                partenaire_id=par_slug[paiement["slug"]].id,
                montant=paiement["montant"],
                horodatage=REFERENCE_DATE + timedelta(days=paiement["jour"]),
                statut=TransactionStatut.validee,
                reference_qr=f"SEED-DEMO-{n}",
                idempotency_key=f"SEED-DEMO-{n}",
                sens_ecriture="debit",
            ))
        db.session.commit()

        # 7. Planification des 200 operations.
        events = []
        events.extend([
            {"i": 0, "amt": 30.0, "day": 1},
            {"i": 0, "amt": 20.0, "day": 5},
            {"i": 0, "amt": 10.0, "day": 10},  # sera refusee
        ])
        events.extend([
            {"i": 1, "amt": 12.5, "day": 2},
            {"i": 1, "amt": 5.0, "day": 8},    # sera refusee
        ])
        events.append({"i": 2, "amt": 100.0, "day": 15})
        events.append({"i": 3, "amt": 47.0, "day": 20})  # reste 3 euros
        events.append({"i": 4, "amt": 16.0, "day": 25})  # reste 4 euros
        for _ in range(200 - len(events)):
            events.append({
                "i": random.randint(5, 49),
                "amt": round(random.uniform(5, 50), 2),
                "day": random.randint(1, 89),
            })
        events.sort(key=lambda e: e["day"])

        # 8. Ecriture. Le solde est suivi ici, en memoire, parce qu'il n'existe
        # pas en colonne : une operation qui depasse le disponible est refusee,
        # et une refusee ne s'ecrit pas. Le schema n'a pas de statut « refusee »
        # — et c'est juste : un paiement refuse n'a pas eu lieu, il n'est pas
        # une ecriture comptable. Le refus reste demontrable en direct, quand un
        # partenaire tente d'encaisser plus que le solde.
        restant = {i: dotation for i, dotation in enumerate(dotations)}
        refus = 0
        ecrites = 0
        for n, ev in enumerate(events):
            salarie = salaries[ev["i"]]
            montant = ev["amt"]
            if restant[ev["i"]] + 1e-9 < montant:
                refus += 1
                continue
            partenaire = random.choice(partenaires)
            restant[ev["i"]] = round(restant[ev["i"]] - montant, 2)
            db.session.add(Transaction(
                salarie_id=salarie.id,
                partenaire_id=partenaire.id,
                montant=montant,
                horodatage=REFERENCE_DATE + timedelta(days=ev["day"], minutes=n * 15),
                statut=TransactionStatut.validee,
                reference_qr=f"SEED-{n:04d}",
                idempotency_key=f"SEED-{n:04d}",
                sens_ecriture="debit",
            ))
            ecrites += 1

        db.session.commit()

        # 9. Generation et ecriture du CSV local
        csv_data = generate_transactions_csv()
        with open('transactions.csv', 'w', encoding='utf-8') as f:
            f.write(csv_data)

        vides = sum(1 for v in restant.values() if v == 0)
        maigres = sum(1 for v in restant.values() if 0 < v < 5)
        conventionnes = sum(1 for e in NETWORK if statut_de(e) == PartnerStatus.valide)
        attente = len(EN_ATTENTE)
        refuses = len(REFUSES)

        print(f"OK {len(NETWORK)} partenaires : {conventionnes} conventionnes, "
              f"{attente} en attente, {refuses} refuses (avec motif ecrit).")
        print(f"OK 50 salaries + 1 salarie de demonstration, {ecrites} transactions ecrites ({refus} operations refusees, non ecrites).")
        print(f"OK Cas limites : {vides} soldes a zero, {maigres} sous les 5 EUR.")
        print("OK Export local 'transactions.csv' genere a la racine.")
        print()
        print("Comptes de demonstration - mot de passe : " + DEMO_PASSWORD)
        print(f"  salarie     {DEMO_EMPLOYEE_EMAIL}  ({DEMO_EMPLOYEE_BALANCE:.2f} EUR)")
        print(f"  partenaire  contact@{NETWORK[0]['slug']}.fr  ({NETWORK[0]['nom']}, conventionne)")
        non_conv = next(e for e in NETWORK if not e["official"])
        print(f"  partenaire  contact@{non_conv['slug']}.fr  ({non_conv['nom']}, en attente)")
        print(f"  admin       {DEMO_ADMIN_EMAIL}")
        print("  (les 50 salaries du panel : salarie0@administration.example ... salarie49@, meme mot de passe)")


if __name__ == "__main__":
    run_seed()
