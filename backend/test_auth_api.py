"""Tests de l'authentification, sur une base a eux.

Ces tests appelaient `db.drop_all()` sur la base de developpement : les lancer
effacait la demonstration semee. Ils travaillent desormais dans un fichier
temporaire, ecrase a chaque execution — `app.db` n'est plus touchee.
"""
import os
import shutil
import tempfile

import pytest

from app import create_app
from models import Employeur, Partenaire, PartnerStatus, Salaries, db


@pytest.fixture
def app():
    """Une application sur une base temporaire, jetée après le test.

    L'URI est posée dans l'environnement **avant** `create_app()`, et c'est
    tout l'intérêt : Flask-SQLAlchemy construit son moteur au premier usage,
    donc la modifier après coup ne changeait rien. La version précédente de ces
    tests le faisait, et son `drop_all()` effaçait `app.db` — la base de
    démonstration — à chaque exécution de la suite.
    """
    dossier = tempfile.mkdtemp()
    fichier = os.path.join(dossier, "test.db")
    ancienne = os.environ.get("TICKET_TOUT_DATABASE_URI")
    os.environ["TICKET_TOUT_DATABASE_URI"] = f"sqlite:///{fichier}"
    try:
        application = create_app()
        application.config["TESTING"] = True
        # Ceinture et bretelles : on vérifie qu'on ne travaille pas sur app.db.
        assert application.config["SQLALCHEMY_DATABASE_URI"].endswith("test.db")
        with application.app_context():
            db.drop_all()
            db.create_all()
        yield application
        with application.app_context():
            db.session.remove()
            db.drop_all()
    finally:
        if ancienne is None:
            os.environ.pop("TICKET_TOUT_DATABASE_URI", None)
        else:
            os.environ["TICKET_TOUT_DATABASE_URI"] = ancienne
        shutil.rmtree(dossier, ignore_errors=True)


def _salarie(email, mot_de_passe):
    employeur = Employeur.query.first() or Employeur(raison_sociale="administration")
    db.session.add(employeur)
    db.session.flush()
    salarie = Salaries(
        nom="Test",
        prenom="Alice",
        email=email,
        employeur_id=employeur.id,
        couleur_carte="#1b3a6b",
        couleur_texte="#ffffff",
        effet_metallise=20,
    )
    salarie.set_password(mot_de_passe)
    db.session.add(salarie)
    db.session.commit()
    return salarie


def test_login_rejects_unknown_user(app):
    with app.app_context():
        _salarie("alice@example.com", "secret123")

    with app.test_client() as client:
        response = client.post(
            "/api/auth/login",
            json={"email": "bob@example.com", "password": "wrong-password"},
        )

    assert response.status_code == 401
    assert "incorrect" in response.get_json()["error"].lower()


def test_login_accepts_known_salarie(app):
    with app.app_context():
        _salarie("alice@example.com", "secret123")

    with app.test_client() as client:
        response = client.post(
            "/api/auth/login",
            json={"email": "alice@example.com", "password": "secret123"},
        )

    corps = response.get_json()
    assert response.status_code == 200
    assert corps["user"]["profile"]["audience"] == "employee"
    assert corps["user"]["username"] == "Alice Test"
    assert corps["access_token"]


def test_register_and_login_success(app):
    with app.test_client() as client:
        creation = client.post(
            "/api/auth/register",
            json={
                "username": "Nouvelle Recrue",
                "email": "newuser@example.com",
                "password": "strongpass",
            },
        )
        assert creation.status_code == 201

        connexion = client.post(
            "/api/auth/login",
            json={"email": "newuser@example.com", "password": "strongpass"},
        )

    assert connexion.status_code == 200
    assert connexion.get_json()["user"]["profile"]["audience"] == "employee"


def test_register_partner_starts_pending(app):
    """Un partenaire qui s'inscrit n'est pas conventionne : il attend."""
    with app.test_client() as client:
        creation = client.post(
            "/api/auth/register",
            json={
                "audience": "partner",
                "username": "Crêperie d'Armor",
                "email": "contact@creperie-armor.fr",
                "password": "strongpass",
                "partner": {
                    "raisonSociale": "Crêperie d'Armor",
                    "siren": "404833048",
                    "categorie": "restauration",
                    "adresse": "3 quai des Sables",
                    "ville": "Vannes",
                    "codePostal": "56000",
                    "nomRepresentant": "A. Le Goff",
                },
            },
        )

    assert creation.status_code == 201
    corps = creation.get_json()
    assert corps["user"]["profile"]["audience"] == "partner"
    with app.app_context():
        partenaire = Partenaire.query.filter_by(siren="404833048").first()
        assert partenaire is not None
        assert partenaire.statut == PartnerStatus.en_attente
        # Le slug se derive de la raison sociale : c'est lui que l'URL porte.
        assert partenaire.slug == "creperie-d-armor"


def test_register_rejects_duplicate_email(app):
    with app.app_context():
        _salarie("alice@example.com", "secret123")

    with app.test_client() as client:
        response = client.post(
            "/api/auth/register",
            json={
                "username": "Autre Alice",
                "email": "alice@example.com",
                "password": "strongpass",
            },
        )

    assert response.status_code == 409
