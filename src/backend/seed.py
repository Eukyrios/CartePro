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

def run_seed():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        # 2. Création des 12 partenaires (4 secteurs, 3 régions)
        secteurs = ["Team building", "Déguisements", "Alimentation", "Mode"]
        regions = ["Île-de-France", "Nouvelle-Aquitaine", "Auvergne-Rhône-Alpes"]
        partenaires = []
        for i in range(12):
            p = User(
                email=f"partenaire{i}@cartepro.fr",
                password_hash="fakehash",
                role="partenaire",
                company_name=fake.company(),
                partner_data={"secteur": secteurs[i % 4], "region": regions[i % 3]}
            )
            db.session.add(p)
            partenaires.append(p)
            
        # 3. Création des 50 salariés avec dotation initiale (l'abondement de base)
        # Salariés 0 à 2 : ciblage solde = 0. Salariés 3 et 4 : ciblage solde < 5.
        soldes_initiaux = [50.0, 12.5, 100.0, 50.0, 20.0]
        salaries = []
        for i in range(50):
            dotation = soldes_initiaux[i] if i < 5 else round(random.uniform(60, 200), 2)
            s = User(
                email=f"salarie{i}@ministere.gouv.fr",
                username=f"{fake.first_name()}{i}", # <-- Ajoute le {i} ici
                password_hash="fakehash",
                role="user",
                solde=dotation
            )
            db.session.add(s)
            salaries.append(s)

        # Admin de test
        admin = User(email="admin@ministere.gouv.fr", role="admin")
        admin.set_password("admin123") # Utilise ta méthode de hachage
        db.session.add(admin)
        db.session.commit()

        # 4. Planification des 200 transactions
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

        # Scénarios aléatoires pour les autres pour atteindre 200 (dont potentiellement d'autres refus naturels)
        for _ in range(200 - len(events)):
            events.append({
                "emp": random.choice(salaries[5:]),
                "amt": round(random.uniform(5, 50), 2),
                "day": random.randint(1, 89)
            })

        # Tri par chronologie absolue pour respecter l'immuabilité temporelle
        events.sort(key=lambda x: x["day"])

        # 5. Exécution transactionnelle
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
                
            t = Transaction(
                salarie_id=salarie.id,
                partenaire_id=partenaire.id,
                montant=montant,
                date=date_trans,
                statut=statut
            )
            db.session.add(t)

        db.session.commit()
        
        # 6. Génération et écriture du CSV local
        csv_data = generate_transactions_csv()
        with open('transactions.csv', 'w', encoding='utf-8') as f:
            f.write(csv_data)
            
        print("✅ Base de données initialisée avec 50 salariés et 12 partenaires.")
        print("✅ 200 transactions simulées de manière déterministe.")
        print("✅ Export local 'transactions.csv' généré à la racine.")

if __name__ == '__main__':
    run_seed()