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
from models import db, User, Transaction
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


def make_partner(entry):
    """Un compte partenaire à partir d'une entrée du réseau.

    `username` porte le slug : c'est l'identifiant que l'API expose et que la
    page de paiement résout. `raisonSociale` est dans partner_data parce que
    c'est ce que le profil affiche, et le conventionnement y est aussi — c'est
    une donnée du Ministère, pas une décoration de l'interface.
    """
    partner = User(
        email=f"contact@{entry['slug']}.fr",
        username=entry["slug"],
        company_name=entry["nom"],
        role="partenaire",
        audience="partner",
        solde=0.0,
        partner_data={
            "raisonSociale": entry["nom"],
            "secteur": entry["secteur"],
            "adresse": entry["adresse"],
            "ville": entry["ville"],
            "codePostal": entry["codePostal"],
            "photo": entry["photo"],
            "amountCents": entry["amountCents"],
            "official": entry["official"],
            "featured": entry["featured"],
        },
        card_style={},
    )
    partner.set_password(DEMO_PASSWORD)
    return partner


def run_seed():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        # 2. Le réseau : seize partenaires renseignés.
        partenaires = [make_partner(entry) for entry in NETWORK]
        for partenaire in partenaires:
            db.session.add(partenaire)

        # 3. Les cinquante salariés du panel, avec dotation initiale.
        # Salariés 0 à 2 : ciblage solde = 0. Salariés 3 et 4 : solde < 5.
        soldes_initiaux = [50.0, 12.5, 100.0, 50.0, 20.0]
        salaries = []
        for i in range(50):
            dotation = soldes_initiaux[i] if i < 5 else round(random.uniform(60, 200), 2)
            salarie = User(
                email=f"salarie{i}@ministere.gouv.fr",
                username=f"{fake.first_name()}{i}",
                role="user",
                audience="employee",
                solde=dotation,
                card_style=DEFAULT_CARD_STYLE.copy(),
            )
            salarie.set_password(DEMO_PASSWORD)
            db.session.add(salarie)
            salaries.append(salarie)

        # 4. Les comptes de démonstration nommés : un salarié, un admin. Le
        # partenaire de démonstration est le premier du réseau, déjà créé.
        demo_employee = User(
            email=DEMO_EMPLOYEE_EMAIL,
            username="Camille Durand",
            role="user",
            audience="employee",
            solde=DEMO_EMPLOYEE_BALANCE,
            card_style=DEFAULT_CARD_STYLE.copy(),
        )
        demo_employee.set_password(DEMO_PASSWORD)
        db.session.add(demo_employee)

        admin = User(
            email=DEMO_ADMIN_EMAIL,
            username="admin",
            role="admin",
            audience="employee",
        )
        admin.set_password(DEMO_PASSWORD)
        db.session.add(admin)
        db.session.commit()

        # 5. Planification des 200 transactions
        events = []

        # Scénarios forcés pour atteindre les exigences du cabinet
        # Salarié 0 (finit à 0€ avec 1 refus)
        events.extend([
            {"emp": salaries[0], "amt": 30.0, "day": 1},
            {"emp": salaries[0], "amt": 20.0, "day": 5},
            {"emp": salaries[0], "amt": 10.0, "day": 10} # Sera refusé
        ])
        # Salarié 1 (finit à 0€ avec 1 refus)
        events.extend([
            {"emp": salaries[1], "amt": 12.5, "day": 2},
            {"emp": salaries[1], "amt": 5.0,  "day": 8}  # Sera refusé
        ])
        # Salarié 2 (finit à 0€)
        events.append({"emp": salaries[2], "amt": 100.0, "day": 15})
        # Salariés 3 et 4 (finissent sous les 5€)
        events.append({"emp": salaries[3], "amt": 47.0, "day": 20}) # Reste 3€
        events.append({"emp": salaries[4], "amt": 16.0, "day": 25}) # Reste 4€

        # Scénarios aléatoires pour les autres pour atteindre 200
        for _ in range(200 - len(events)):
            events.append({
                "emp": random.choice(salaries[5:]),
                "amt": round(random.uniform(5, 50), 2),
                "day": random.randint(1, 89)
            })

        # Tri par chronologie absolue pour respecter l'immuabilité temporelle
        events.sort(key=lambda x: x["day"])

        # 6. Exécution transactionnelle
        refus = 0
        for i, ev in enumerate(events):
            salarie = ev["emp"]
            montant = ev["amt"]
            partenaire = random.choice(partenaires)
            date_trans = REFERENCE_DATE + timedelta(days=ev["day"], minutes=i*15)

            statut = "validee"
            if salarie.solde >= montant:
                salarie.solde -= montant
                partenaire.solde += montant
            else:
                statut = "refusee"
                refus += 1

            t = Transaction(
                salarie_id=salarie.id,
                partenaire_id=partenaire.id,
                montant=montant,
                date=date_trans,
                statut=statut
            )
            db.session.add(t)

        db.session.commit()

        # 7. Génération et écriture du CSV local
        csv_data = generate_transactions_csv()
        with open('transactions.csv', 'w', encoding='utf-8') as f:
            f.write(csv_data)

        vides = sum(1 for s in salaries if s.solde == 0)
        maigres = sum(1 for s in salaries if 0 < s.solde < 5)
        conventionnes = sum(1 for e in NETWORK if e["official"])

        print(f"✅ {len(NETWORK)} partenaires renseignés, dont {conventionnes} conventionnés.")
        print(f"✅ 50 salariés + 1 salarié de démonstration, {len(events)} transactions ({refus} refusées).")
        print(f"✅ Cas limites : {vides} soldes à zéro, {maigres} sous les 5 €.")
        print("✅ Export local 'transactions.csv' généré à la racine.")
        print()
        print("Comptes de démonstration — mot de passe : " + DEMO_PASSWORD)
        print(f"  salarié     {DEMO_EMPLOYEE_EMAIL}  ({DEMO_EMPLOYEE_BALANCE:.2f} €)")
        print(f"  partenaire  contact@{NETWORK[0]['slug']}.fr  ({NETWORK[0]['nom']})")
        print(f"  admin       {DEMO_ADMIN_EMAIL}")
        print("  (les 50 salariés du panel : salarie0@ministere.gouv.fr … salarie49@, même mot de passe)")

if __name__ == '__main__':
    run_seed()
