"""Jeu de données de démonstration, déterministe.

Ce que ce script garantit, et pourquoi :

1. Le réseau. Les dix-huit partenaires du démonstrateur, avec leur adresse, leur
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
from accounts import PATTERNS, couleur_tiree
from models import (
    Abondement,
    Admin,
    Categorie,
    CompteStatut,
    Decision,
    DecisionSens,
    Employeur,
    MesureCompte,
    MotifCarte,
    Partenaire,
    PartenaireLike,
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
# dans ses parametres, et la plupart n'en ont pas. La semer pour six d'entre
# eux suffit a montrer la section remplie, la section absente, et le rendu de
# chaque marque du Markdown accepte.
PRESENTATIONS = {
    "comptoir-du-midi": {
        "presentationTitre": "Le plat du jour, tous les midis",
        "presentationTexte": (
            "Bistrot de quartier, **cuisine du marché**, ardoise renouvelée "
            "*chaque matin*. Trente couverts, pas un de plus.\n"
            "\n"
            "- entrée, plat, dessert à prix fixe le midi\n"
            "- une ardoise végétarienne tous les jours\n"
            "- service continu le vendredi et le samedi\n"
            "\n"
            "> Réservation conseillée entre midi et quatorze heures.\n"
            "\n"
            "# Nous trouver\n"
            "\n"
            "En bas du `cours Julien`, côté place Notre-Dame-du-Mont. Le menu "
            "du jour paraît la veille au soir sur "
            "[notre page](https://comptoir-du-midi.fr)."
        ),
        "siteWeb": "comptoir-du-midi.fr",
        # Format fixe : deux heures par jour, « HH:MM ». Un jour sans
        # heures est ferme.
        "horaires": {
            "lundi": {"ouvre": "11:30", "ferme": "15:00"},
            "mardi": {"ouvre": "11:30", "ferme": "15:00"},
            "mercredi": {"ouvre": "11:30", "ferme": "15:00"},
            "jeudi": {"ouvre": "11:30", "ferme": "15:00"},
            "vendredi": {"ouvre": "11:30", "ferme": "23:00"},
            "samedi": {"ouvre": "11:30", "ferme": "23:00"},
            "dimanche": {"ouvre": "", "ferme": ""},
        },
    },
    "epicerie-sainte-claire": {
        "presentationTitre": "L'épicerie de la halle",
        "presentationTexte": (
            "Fruits et légumes de la vallée, fromages d'alpage, vrac et "
            "conserves. Ce qui pousse ici, quand ça pousse.\n"
            "\n"
            "1. le panier de saison, composé le matin\n"
            "2. la coupe à la demande, fromage et charcuterie\n"
            "3. le vrac : apportez vos bocaux\n"
            "\n"
            "*Rien ne vient de plus loin que le département voisin.*\n"
            "\n"
            "> Le panier du vendredi part vite : réservez-le la veille."
        ),
        "siteWeb": "https://epicerie-sainte-claire.fr",
        "horaires": {
            "lundi": {"ouvre": "", "ferme": ""},
            "mardi": {"ouvre": "07:30", "ferme": "19:30"},
            "mercredi": {"ouvre": "07:30", "ferme": "19:30"},
            "jeudi": {"ouvre": "07:30", "ferme": "19:30"},
            "vendredi": {"ouvre": "07:30", "ferme": "19:30"},
            "samedi": {"ouvre": "07:00", "ferme": "19:30"},
            "dimanche": {"ouvre": "08:00", "ferme": "13:00"},
        },
    },
    "librairie-vasseur": {
        "presentationTitre": "Librairie générale, depuis 1931",
        "presentationTexte": (
            "Littérature, sciences humaines, jeunesse. **Quinze mille titres** "
            "en rayon, et le reste commandé sous quarante-huit heures.\n"
            "\n"
            "- commande sans frais, retrait au comptoir\n"
            "- rencontres d'auteurs le jeudi soir\n"
            "- *carte de fidélité* : un livre offert tous les dix\n"
            "\n"
            "> Le fonds ancien se consulte sur place, sur demande.\n"
            "\n"
            "# Le rendez-vous du jeudi\n"
            "\n"
            "Le programme du trimestre est affiché en vitrine, et le fichier "
            "`programme.pdf` le reprend sur "
            "[notre site](https://librairie-vasseur.fr)."
        ),
        "siteWeb": "librairie-vasseur.fr",
        "horaires": {
            "lundi": {"ouvre": "14:00", "ferme": "19:00"},
            "mardi": {"ouvre": "09:30", "ferme": "19:00"},
            "mercredi": {"ouvre": "09:30", "ferme": "19:00"},
            "jeudi": {"ouvre": "09:30", "ferme": "20:30"},
            "vendredi": {"ouvre": "09:30", "ferme": "19:00"},
            "samedi": {"ouvre": "09:30", "ferme": "19:30"},
            "dimanche": {"ouvre": "", "ferme": ""},
        },
    },
    "pharmacie-du-parc": {
        "presentationTitre": "Officine de quartier",
        "presentationTexte": (
            "Ordonnances, conseil, matériel médical à la location. Une équipe "
            "de **quatre pharmaciens**, dont un orthopédiste.\n"
            "\n"
            "- préparation des piluliers à la semaine\n"
            "- location de tire-lait, tensiomètre, béquilles\n"
            "- tests rapides sans rendez-vous\n"
            "\n"
            "> Garde de nuit : le tableau est affiché sur la porte et vaut "
            "pour tout le secteur.\n"
            "\n"
            "*Le conseil est gratuit ; il ne remplace pas une consultation.*"
        ),
        "siteWeb": "pharmacie-du-parc.fr",
        "horaires": {
            "lundi": {"ouvre": "08:30", "ferme": "19:30"},
            "mardi": {"ouvre": "08:30", "ferme": "19:30"},
            "mercredi": {"ouvre": "08:30", "ferme": "19:30"},
            "jeudi": {"ouvre": "08:30", "ferme": "19:30"},
            "vendredi": {"ouvre": "08:30", "ferme": "19:30"},
            "samedi": {"ouvre": "09:00", "ferme": "19:00"},
            "dimanche": {"ouvre": "", "ferme": ""},
        },
    },
    "transports-regionaux-unifies": {
        "presentationTitre": "Se déplacer dans toute la région",
        "presentationTexte": (
            "Cars interurbains, navettes d'aéroport et trains régionaux, sur "
            "un **titre unique**. Le réseau dessert *quatre cent douze "
            "communes*.\n"
            "\n"
            "1. l'abonnement mensuel, tous modes\n"
            "2. le carnet de dix trajets\n"
            "3. le billet à l'unité, acheté à bord\n"
            "\n"
            "> L'abonnement se suspend un mois par an, sans frais, pendant "
            "les congés.\n"
            "\n"
            "# Aux guichets\n"
            "\n"
            "Le guichet de la gare centrale délivre le titre à la minute ; "
            "ailleurs, le code `TRU` sur l'automate ouvre le même catalogue."
        ),
        "siteWeb": "transports-regionaux-unifies.fr",
        "horaires": {
            "lundi": {"ouvre": "06:30", "ferme": "20:00"},
            "mardi": {"ouvre": "06:30", "ferme": "20:00"},
            "mercredi": {"ouvre": "06:30", "ferme": "20:00"},
            "jeudi": {"ouvre": "06:30", "ferme": "20:00"},
            "vendredi": {"ouvre": "06:30", "ferme": "20:00"},
            "samedi": {"ouvre": "08:00", "ferme": "19:00"},
            "dimanche": {"ouvre": "09:00", "ferme": "13:00"},
        },
    },
    "sport-loisirs-aubagne": {
        "presentationTitre": "Le club, toute l'année",
        "presentationTexte": (
            "Salle, cours collectifs et sorties en garrigue. **Association "
            "loi 1901**, encadrement diplômé, licence comprise dans "
            "l'adhésion.\n"
            "\n"
            "- musculation et cardio en accès libre\n"
            "- douze cours collectifs par semaine\n"
            "- randonnée le dimanche matin, d'octobre à mai\n"
            "\n"
            "> Certificat médical demandé à l'inscription, valable trois ans.\n"
            "\n"
            "*Le premier cours est un essai : on ne s'inscrit qu'après.*"
        ),
        "siteWeb": "sport-loisirs-aubagne.fr",
        "horaires": {
            "lundi": {"ouvre": "07:00", "ferme": "22:00"},
            "mardi": {"ouvre": "07:00", "ferme": "22:00"},
            "mercredi": {"ouvre": "07:00", "ferme": "22:00"},
            "jeudi": {"ouvre": "07:00", "ferme": "22:00"},
            "vendredi": {"ouvre": "07:00", "ferme": "22:00"},
            "samedi": {"ouvre": "09:00", "ferme": "19:00"},
            "dimanche": {"ouvre": "09:00", "ferme": "12:30"},
        },
    },
}

NETWORK = [
    {
        "slug": "comptoir-du-midi",
        "nom": "Le Comptoir du Midi",
        "secteur": "restauration",
        "adresse": "18 cours Julien",
        "ville": "Marseille",
        "codePostal": "13006",
        "photo": "/partenaires/comptoir-du-midi.svg",
        "amountCents": 1650,
        "official": True,
        "featured": True,
    },
    {
        "slug": "epicerie-sainte-claire",
        "nom": "Épicerie Sainte-Claire",
        "secteur": "alimentation",
        "adresse": "4 place Sainte-Claire",
        "ville": "Grenoble",
        "codePostal": "38000",
        "photo": "/partenaires/epicerie-sainte-claire.svg",
        "amountCents": 450,
        "official": True,
        "featured": True,
    },
    {
        "slug": "librairie-vasseur",
        "nom": "Librairie Vasseur",
        "secteur": "culture",
        "adresse": "12 rue des Trois-Cailloux",
        "ville": "Amiens",
        "codePostal": "80000",
        "photo": "/partenaires/librairie-vasseur.svg",
        "amountCents": 2200,
        "official": True,
        "featured": True,
    },
    {
        "slug": "pharmacie-du-parc",
        "nom": "Pharmacie du Parc",
        "secteur": "sante",
        "adresse": "5 avenue du Parc",
        "ville": "Vincennes",
        "codePostal": "94300",
        "photo": "/partenaires/pharmacie-du-parc.svg",
        "amountCents": 1380,
        "official": True,
        "featured": True,
    },
    {
        "slug": "transports-regionaux-unifies",
        "nom": "Transports Régionaux Unifiés",
        "secteur": "mobilite",
        "adresse": "26 rue de la Villette",
        "ville": "Lyon",
        "codePostal": "69003",
        "photo": "/partenaires/transports-regionaux-unifies.svg",
        "amountCents": 4200,
        "official": True,
        "featured": True,
    },
    {
        "slug": "sport-loisirs-aubagne",
        "nom": "Sport Loisirs Aubagne",
        "secteur": "sport",
        "adresse": "9 avenue des Goums",
        "ville": "Aubagne",
        "codePostal": "13400",
        "photo": "/partenaires/sport-loisirs-aubagne.svg",
        "amountCents": 1900,
        "official": False,
        "featured": True,
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
    {"slug": "epicerie-sainte-claire", "montant": 5.00, "jour": 95},
    {"slug": "comptoir-du-midi", "montant": 12.50, "jour": 89},
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
# demonstrateur. Il sert a ce que les dix-huit fiches du reseau aient une
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
    les six partenaires que l'administrateur distingue — la regle est simple et
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
    "sport-loisirs-aubagne": None,
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
# vivent en base et non plus seulement dans le front, où l'ancien
# `frontend/components/data/ministerPicks.ts` les portait avant d'être
# supprimé. Une phrase par fiche rédigée, jusqu'à ce que l'espace
# d'administration prenne la main.
MOTS_ADMINISTRATEUR = {
    "comptoir-du-midi": "Le plat du jour à deux pas du bureau, et une addition qui reste sage.",
    "epicerie-sainte-claire": "Les courses du soir sans quitter le quartier.",
    "librairie-vasseur": "Une librairie qui commande tout, et qui conseille avant de vendre.",
    "pharmacie-du-parc": "Ouverte tard, et l'on y est reçu même sans ordonnance.",
    "transports-regionaux-unifies": "Un seul titre pour toute la région : l'abonnement se rentabilise en dix trajets.",
    "sport-loisirs-aubagne": "Bouger après le travail, sans y laisser son salaire.",
}


# Les comptes salaries qui ne sont pas actifs, et le motif qui les a fermes.
#
# Comme pour les partenaires : les trois etats que le dispositif connait
# existent dans les donnees, et les deux qui ne sont pas « actif » portent leur
# motif ecrit. Un ecran de gestion des comptes ou tous les comptes seraient
# actifs ne montrerait ni la suspension, ni la cloture, ni la trace qu'elles
# laissent.
#
# Le rang est celui du panel (`salarie<N>@administration.example`). Les deux
# choisis le sont pour que l'histoire tienne : le compte cloture est un compte
# a solde nul — on ne ferme pas un compte qui porte encore de l'argent sans le
# dire —, le compte suspendu en garde.
MESURES_COMPTES = {
    2: (
        CompteStatut.cloture,
        "Fin de contrat au 31 aout 2026. Compte cloture, solde nul au jour de "
        "la cloture : aucun reliquat a reverser.",
        100,
    ),
    7: (
        CompteStatut.suspendu,
        "Suspension conservatoire : piece d'identite non renouvelee au dossier "
        "RH. La mesure se leve des la piece produite.",
        102,
    ),
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
        # Tiree de l'email, donc la meme d'un seed a l'autre : une capture
        # d'ecran refaite montre les memes vignettes.
        couleur_avatar=couleur_tiree(email),
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

        # 2. Le reseau : dix-huit partenaires renseignes.
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

        # # 4. Le coup de coeur de l'administrateur : une entree datee, avec ses mots.
        # # C'est une table a part et non un booleen, parce qu'une decision
        # # editoriale se date et se retire.
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

        # 8 bis. Les mesures sur les comptes salaries.
        #
        # Apres les transactions, et datees apres la derniere : un compte
        # suspendu le 102e jour a pu depenser jusqu'au 89e. Les poser avant
        # aurait donne des paiements posterieurs a une suspension, ce qui ne
        # peut pas arriver — `accounts.actif()` ferme la connexion.
        for rang, (statut, motif, jour) in MESURES_COMPTES.items():
            salarie = salaries[rang]
            salarie.statut = statut
            db.session.add(MesureCompte(
                salarie_id=salarie.id,
                agent_id=admin.id,
                sens=statut,
                motif_ecrit=motif,
                horodatage=REFERENCE_DATE + timedelta(days=jour),
            ))
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
        suspendus = sum(1 for v in MESURES_COMPTES.values() if v[0] == CompteStatut.suspendu)
        clotures = sum(1 for v in MESURES_COMPTES.values() if v[0] == CompteStatut.cloture)
        print(f"OK Comptes : {51 - len(MESURES_COMPTES)} actifs, {suspendus} suspendu(s), {clotures} cloture(s), chacun avec son motif ecrit.")
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
