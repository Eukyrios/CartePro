"""La mention de demonstrateur existe en deux copies. Ce test les compare.

Elle est demandee « sur toutes les pages publiques, les pages d'erreur et dans
les exports ». Le front la porte en TypeScript, le back en Python, parce qu'un
module TypeScript ne s'importe pas depuis Flask. Deux copies d'une phrase
finissent par diverger ; celle-ci ne peut pas, sans faire echouer ce test.
"""

import os
import pathlib
import re
import shutil
import tempfile

import pytest

from app import create_app
from mention import MENTION_DEMONSTRATEUR
from models import db
from services.csv_service import generate_transactions_csv

SOURCE_TS = (
    pathlib.Path(__file__).resolve().parent.parent
    / "frontend"
    / "components"
    / "legal"
    / "mention.ts"
)


def test_les_deux_copies_sont_identiques():
    """La phrase du front et celle du back, au caractere pres."""
    texte = SOURCE_TS.read_text(encoding="utf-8")
    trouve = re.search(
        r'export const MENTION_DEMONSTRATEUR\s*=\s*"([^"]+)"', texte
    )
    assert trouve, f"constante introuvable dans {SOURCE_TS}"
    assert trouve.group(1) == MENTION_DEMONSTRATEUR


@pytest.fixture
def application():
    """Une base temporaire, comme dans test_auth_api.

    La fixture y est locale plutot que partagee par un conftest : la deplacer
    demanderait de toucher le fichier de tests d'un coequipier, et l'URI doit
    de toute facon etre posee avant `create_app()` — Flask-SQLAlchemy lie son
    moteur au premier usage.
    """
    dossier = tempfile.mkdtemp()
    fichier = os.path.join(dossier, "test.db")
    ancienne = os.environ.get("TICKET_TOUT_DATABASE_URI")
    os.environ["TICKET_TOUT_DATABASE_URI"] = f"sqlite:///{fichier}"
    try:
        app = create_app()
        app.config["TESTING"] = True
        assert app.config["SQLALCHEMY_DATABASE_URI"].endswith("test.db")
        with app.app_context():
            db.create_all()
        yield app
        with app.app_context():
            db.session.remove()
            db.drop_all()
    finally:
        if ancienne is None:
            os.environ.pop("TICKET_TOUT_DATABASE_URI", None)
        else:
            os.environ["TICKET_TOUT_DATABASE_URI"] = ancienne
        shutil.rmtree(dossier, ignore_errors=True)


def test_l_export_csv_porte_la_mention(application):
    """La premiere ligne du CSV est la mention, l'en-tete vient ensuite."""
    with application.app_context():
        lignes = generate_transactions_csv().splitlines()

    assert lignes[0] == f"# {MENTION_DEMONSTRATEUR}"
    assert lignes[1] == "id;date_iso8601;employee_id;partner_id;amount_cents;status"
