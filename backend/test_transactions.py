import pytest
import jwt
import os
import shutil
import tempfile
from datetime import datetime, timedelta, timezone
from app import create_app
from models import db, Salaries, Partenaire, Transaction, Abondement, Employeur, Categorie, PartnerStatus

# Clé secrète par défaut pour les tests
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-en-dev")

@pytest.fixture
def client():
    """Une base jetable, et surtout : pas celle de développement.

    La fixture posait `SQLALCHEMY_DATABASE_URI` **après** `create_app()`, ce qui
    ne fait rien — Flask-SQLAlchemy construit son moteur dans `init_app`, donc
    la valeur arrivait trop tard et ce fichier travaillait sur
    `backend/instance/app.db`. Son `db.drop_all()` effaçait alors la base de
    démonstration : le seed y passait, et l'application redémarrait sur une base
    vide sans que personne ne comprenne pourquoi.

    L'URI se pose donc dans l'environnement avant `create_app()`, comme le font
    `test_admin_api.py`, `test_auth_api.py` et `test_mention.py` — la fixture est
    recopiée chez chacun plutôt que partagée par un `conftest.py`, parce que
    c'est l'ordre des opérations qui compte, pas l'endroit où elle vit. Le
    `assert` en est la ceinture.
    """
    dossier = tempfile.mkdtemp()
    fichier = os.path.join(dossier, "test.db")
    ancienne = os.environ.get("TICKET_TOUT_DATABASE_URI")
    os.environ["TICKET_TOUT_DATABASE_URI"] = f"sqlite:///{fichier}"

    try:
        app = create_app()
        app.config["TESTING"] = True
        assert app.config["SQLALCHEMY_DATABASE_URI"].endswith("test.db")

        with app.test_client() as client:
            with app.app_context():
                db.drop_all()
                db.create_all()

                # 1. Création des entités de base (Employeur et Catégorie)
                employeur = Employeur(raison_sociale="Ministère Test")
                categorie = Categorie(nom="Alimentation")
                db.session.add_all([employeur, categorie])
                db.session.flush()

                # 2. Création du Salarié
                salarie = Salaries(
                    email="salarie@test.com",
                    nom="Durand",
                    prenom="Camille",
                    employeur_id=employeur.id,
                    couleur_carte="#000000",
                    couleur_texte="#FFFFFF"
                )
                salarie.set_password("pass123")

                # 3. Création du Partenaire (doit être "valide" pour encaisser)
                partenaire = Partenaire(
                    slug="boutique-test",
                    raison_sociale="Boutique Test",
                    siren="123456789",
                    categorie_id=categorie.id,
                    adresse="1 rue test",
                    ville="Test",
                    code_postal="75000",
                    email_contact="partenaire@test.com",
                    nom_representant="Rep",
                    statut=PartnerStatus.valide
                )
                partenaire.set_password("pass123")
                db.session.add_all([salarie, partenaire])
                db.session.flush()

                # 4. Dotation initiale de 50€ via la table Abondement
                abondement = Abondement(
                    employeur_id=employeur.id,
                    salarie_id=salarie.id,
                    montant=50.0,
                    agent_admin_id=1
                )
                db.session.add(abondement)
                db.session.commit()

                # 5. Génération des jetons JWT
                from flask_jwt_extended import create_access_token
                # Le format de l'identité dépend de ton fichier accounts.py, on simule ici l'identifiant partenaire
                access_token = create_access_token(identity=f"partenaire:{partenaire.id}")
            
                # Jeton QR éphémère du salarié
                token_qr = jwt.encode(
                    {"user_id": salarie.id, "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
                    SECRET_KEY,
                    algorithm="HS256"
                )

                yield client, access_token, token_qr, salarie.id, partenaire.id
    finally:
        if ancienne is None:
            os.environ.pop("TICKET_TOUT_DATABASE_URI", None)
        else:
            os.environ["TICKET_TOUT_DATABASE_URI"] = ancienne
        shutil.rmtree(dossier, ignore_errors=True)

def test_immuabilite_transaction(client):
    """Règle 1 : Impossible de modifier ou supprimer une transaction validée."""
    _, _, _, salarie_id, partenaire_id = client
    
    # Création manuelle d'une transaction
    t = Transaction(
        salarie_id=salarie_id,
        partenaire_id=partenaire_id,
        montant=10.0,
        reference_qr="QR_TEST_123",
        sens_ecriture="debit"
    )
    db.session.add(t)
    db.session.commit()

    # Tentative de modification (UPDATE)
    t.montant = 999.0
    with pytest.raises(Exception, match="immuable"):
        db.session.commit()
    db.session.rollback()

    # Tentative de suppression (DELETE)
    db.session.delete(t)
    with pytest.raises(Exception, match="immuable"):
        db.session.commit()
    db.session.rollback()

def test_solde_jamais_negatif(client):
    """Règle 2 : Un débit supérieur au solde disponible (50€) est refusé."""
    test_client, access_token, token_qr, _, _ = client
    
    # On tente de débiter 60€ (le solde est de 50€ via l'abondement)
    response = test_client.post(
        '/api/transactions/valider',
        json={"qr_token": token_qr, "montant": 60.0, "partenaire_id": "boutique-test"},
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    assert response.status_code == 400
    assert "Solde insuffisant" in response.get_json()["message"]

def test_idempotence_encaissement(client):
    """Règle 3 : Un double scan du même QR code ne débite pas deux fois."""
    test_client, access_token, token_qr, _, _ = client
    payload = {"qr_token": token_qr, "montant": 20.0, "partenaire_id": "boutique-test"}
    headers = {"Authorization": f"Bearer {access_token}"}

    # Premier passage (doit passer à 201 Created)
    resp1 = test_client.post('/api/transactions/valider', json=payload, headers=headers)
    assert resp1.status_code == 201

    # Deuxième passage identique (doit renvoyer 200 OK et intercepter le double scan)
    resp2 = test_client.post('/api/transactions/valider', json=payload, headers=headers)
    assert resp2.status_code == 200
    assert "déjà traitée" in resp2.get_json()["message"]