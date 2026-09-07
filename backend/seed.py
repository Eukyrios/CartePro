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
DEMO_PASSWORD = "TicketTout2026"

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
        "horaires": {
            "lundi": "",
            "mardi": "09:00 - 18:00",
            "mercredi": "09:00 - 18:00",
            "jeudi": "09:00 - 18:00",
            "vendredi": "09:00 - 18:00",
            "samedi": "09:00 - 19:00",
            "dimanche": "10:00 - 17:00",
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
        "horaires": {
            "lundi": "14:00 - 19:00",
            "mardi": "14:00 - 19:00",
            "mercredi": "10:00 - 12:30 / 14:00 - 19:00",
            "jeudi": "14:00 - 19:00",
            "vendredi": "14:00 - 19:00",
            "samedi": "10:00 - 19:30",
            "dimanche": "10:00 - 13:00",
        },
    },
    "librairie-bellevue": {
        "presentationTitre": "",
        "presentationTexte": (
            "Fonds general, beaux-arts et jeunesse. Nous commandons tout titre "
            "disponible sous quarante-huit heures.\n"
            "\n"
            "~~Fermeture annuelle en aout.~~ Nous restons ouverts cette annee."
        ),
        "siteWeb": "librairie-bellevue.fr",
        "horaires": {
            "lundi": "",
            "mardi": "10:00 - 19:00",
            "mercredi": "10:00 - 19:00",
            "jeudi": "10:00 - 19:00",
            "vendredi": "10:00 - 19:00",
            "samedi": "10:00 - 19:00",
            "dimanche": "",
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
DEMO_EMPLOYEE_EMAIL = "camille.durand@ministere.gouv.fr"
DEMO_EMPLOYEE_BALANCE = 32.50
DEMO_ADMIN_EMAIL = "admin@ministere.gouv.fr"

DEFAULT_CARD_STYLE = {
    "color": "#1b3a6b",
    "text": "#ffffff",
    "pattern": "waves",
    "metalness": 20,
}


# Les mots du Ministre sur ses coups de cœur, par slug.
#
# Le schéma leur donne une colonne — `CoupDeCoeur.mot_du_ministre` — donc ils
# vivent en base et non plus seulement dans le front. Les quatre phrases sont
# celles de `frontend/components/data/ministerPicks.ts` : la même sélection,
# les mêmes mots, jusqu'à ce que l'espace d'administration prenne la main.
MOTS_DU_MINISTRE = {
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

    Le conventionnement est un statut du Ministere : `valide` pour un
    partenaire officiel, `en_attente` pour les autres. C'est lui que l'espace
    partenaire lit pour ouvrir ou barrer l'encaissement.
    """
    presentation = PRESENTATIONS.get(entry["slug"], {})
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
        statut=PartnerStatus.valide if entry["official"] else PartnerStatus.en_attente,
        image_partenaire=entry["photo"],
        tarif=entry["amountCents"] / 100,
        site_web=presentation.get("siteWeb", ""),
        presentation_titre=presentation.get("presentationTitre", ""),
        presentation_texte=presentation.get("presentationTexte", ""),
        horaires=presentation.get("horaires", {}),
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
        employeur = Employeur(raison_sociale="Ministere du Job et Bonheur")
        db.session.add(employeur)
        db.session.flush()
        categories = _categories(db.session)

        # 2. Le reseau : seize partenaires renseignes.
        partenaires = [make_partner(entry, categories) for entry in NETWORK]
        for partenaire in partenaires:
            db.session.add(partenaire)
        db.session.flush()

        # 3. Le coup de coeur du Ministre : une entree datee, avec ses mots.
        # C'est une table a part et non un booleen, parce qu'une decision
        # editoriale se date et se retire.
        for entry, partenaire in zip(NETWORK, partenaires):
            if entry["featured"]:
                db.session.add(CoupDeCoeur(
                    partenaire_id=partenaire.id,
                    mot_du_ministre=MOTS_DU_MINISTRE.get(
                        entry["slug"], f"Un choix du Ministre : {entry['nom']}."
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
                f"salarie{i}@ministere.gouv.fr", fake.first_name(), f"Salarie{i}", employeur
            )
            db.session.add(salarie)
            salaries.append(salarie)
            dotations.append(dotation)

        # 5. Les comptes de demonstration nommes. Le partenaire de
        # demonstration est le premier du reseau, deja cree.
        demo_employee = make_salarie(DEMO_EMPLOYEE_EMAIL, "Camille", "Durand", employeur)
        db.session.add(demo_employee)

        admin = Admin(email=DEMO_ADMIN_EMAIL, nom="Agent du Ministere")
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
            montant=DEMO_EMPLOYEE_BALANCE,
            horodatage=REFERENCE_DATE,
            agent_admin_id=admin.id,
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
        conventionnes = sum(1 for e in NETWORK if e["official"])

        print(f"OK {len(NETWORK)} partenaires renseignes, dont {conventionnes} conventionnes.")
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
        print("  (les 50 salaries du panel : salarie0@ministere.gouv.fr ... salarie49@, meme mot de passe)")


if __name__ == "__main__":
    run_seed()
