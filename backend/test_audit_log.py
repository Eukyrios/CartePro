"""Tests du journal d'audit : le chainage, et que chaque operation du
perimetre ecrit vraiment sa ligne.

Sur SQLite, deliberement : chaque test tourne sur une base temporaire jetee
en fin de test (voir `app`, ci-dessous), comme le reste de la suite. SQLite
n'a pas de notion de GRANT/REVOKE — le `REVOKE UPDATE, DELETE` reel n'existe
que sur la base Postgres provisionnee par `provision_postgres.py`, et
c'est volontaire : le reparer pour les fixtures aurait voulu dire relacher
le droit pour les tests, exactement ce que le mail de Vignal demande de ne
pas faire. Ce que les tests ci-dessous verifient a la place, c'est le
chainage lui-meme (qui, lui, ne depend d'aucun moteur) et que chaque route
sensible appelle bien `record_event`. La preuve du REVOKE et de la detection
d'alteration est apportee separement, sur la vraie base : voir
`demo_audit_tamper.sh` et `docs/audit-log/note.md`.
"""
import os
import shutil
import tempfile

import pytest

from app import create_app
from audit_chain import GENESIS_PREV_HASH, compute_hash
from models import (
    Admin,
    AuditLog,
    Categorie,
    Employeur,
    Partenaire,
    PartnerStatus,
    Salaries,
    db,
)
from services.audit_service import record_event

MOT_DE_PASSE = "secret123"


@pytest.fixture
def app():
    dossier = tempfile.mkdtemp()
    fichier = os.path.join(dossier, "test.db")
    ancienne = os.environ.get("TICKET_TOUT_DATABASE_URI")
    os.environ["TICKET_TOUT_DATABASE_URI"] = f"sqlite:///{fichier}"
    try:
        application = create_app()
        application.config["TESTING"] = True
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


def _admin(email="agent@administration.example"):
    compte = Admin(nom="Agent", email=email)
    compte.set_password(MOT_DE_PASSE)
    db.session.add(compte)
    db.session.commit()
    return compte


def _jeton(client, email):
    reponse = client.post("/api/auth/login", json={"email": email, "password": MOT_DE_PASSE})
    assert reponse.status_code == 200, reponse.get_json()
    return reponse.get_json()["access_token"]


def _entetes(jeton):
    return {"Authorization": f"Bearer {jeton}"}


# --- Le chainage lui-meme, independant de toute route ------------------------

def test_le_premier_enregistrement_chaine_sur_la_genese(app):
    with app.app_context():
        entree = record_event(action="test_action", actor_role="system", commit=True)
        assert entree.prev_hash == GENESIS_PREV_HASH
        assert entree.hash == compute_hash(
            GENESIS_PREV_HASH, entree.occurred_at, None, "system", "test_action",
            None, None, {}, None,
        )


def test_chaque_enregistrement_reference_l_empreinte_du_precedent(app):
    with app.app_context():
        premier = record_event(action="a", actor_role="system", commit=True)
        second = record_event(action="b", actor_role="system", commit=True)
        troisieme = record_event(action="c", actor_role="system", commit=True)

        assert second.prev_hash == premier.hash
        assert troisieme.prev_hash == second.hash
        # Les empreintes sont bien distinctes : pas de collision degeneree.
        assert len({premier.hash, second.hash, troisieme.hash}) == 3


def test_recalculer_l_empreinte_d_un_enregistrement_altere_ne_correspond_plus(app):
    """Le coeur de la detection : modifier un champ casse l'egalite recalcul <-> stocke."""
    with app.app_context():
        entree = record_event(
            action="transaction_validee", actor_role="partenaire", actor_id="partenaire:1",
            payload={"montant": 12.5}, commit=True,
        )
        empreinte_avant = entree.hash

        # Simule l'alteration qu'un client SQL privilegie ferait directement en base.
        entree.payload = {"montant": 999999.0}
        recalculee = compute_hash(
            entree.prev_hash, entree.occurred_at, entree.actor_id, entree.actor_role,
            entree.action, entree.target_type, entree.target_id, entree.payload, entree.ip,
        )
        assert recalculee != empreinte_avant


def test_l_orm_refuse_lui_meme_un_update_direct(app):
    """Seconde ligne de defense : meme depuis le code applicatif, un UPDATE est bloque."""
    with app.app_context():
        entree = record_event(action="a", actor_role="system", commit=True)
        entree.ip = "1.2.3.4"
        with pytest.raises(Exception):
            db.session.commit()


def test_l_orm_refuse_lui_meme_un_delete_direct(app):
    with app.app_context():
        entree = record_event(action="a", actor_role="system", commit=True)
        db.session.delete(entree)
        with pytest.raises(Exception):
            db.session.commit()


# --- Couverture par operation -------------------------------------------------

def test_une_connexion_echouee_ecrit_une_ligne(app):
    with app.app_context():
        _admin()
    with app.test_client() as client:
        client.post("/api/auth/login", json={"email": "agent@administration.example", "password": "mauvais"})
    with app.app_context():
        lignes = AuditLog.query.filter_by(action="connexion_echouee").all()
        assert len(lignes) == 1
        assert lignes[0].payload["email"] == "agent@administration.example"


def test_une_inscription_ecrit_une_ligne_compte_cree(app):
    with app.test_client() as client:
        reponse = client.post("/api/auth/register", json={
            "username": "Nouveau Salarie", "email": "nouveau@example.com",
            "password": "secret123", "audience": "employee",
        })
        assert reponse.status_code == 201
    with app.app_context():
        lignes = AuditLog.query.filter_by(action="compte_cree").all()
        assert len(lignes) == 1
        assert lignes[0].target_type == "compte_salarie"


def test_approuver_un_partenaire_ecrit_une_ligne_chainee_a_la_decision(app):
    with app.app_context():
        _admin()
        categorie = Categorie(nom="loisirs")
        db.session.add(categorie)
        db.session.flush()
        partenaire = Partenaire(
            slug="a-conventionner", raison_sociale="A Conventionner", siren="123456789",
            categorie_id=categorie.id, adresse="1 rue", ville="Paris", code_postal="75001",
            email_contact="contact@a-conventionner.fr", nom_representant="X",
            statut=PartnerStatus.en_attente,
        )
        partenaire.set_password(MOT_DE_PASSE)
        db.session.add(partenaire)
        db.session.commit()

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.post(
            "/api/admin/partenaires/a-conventionner/approuver",
            json={"motif": "Pieces completes."}, headers=_entetes(jeton),
        )
        assert reponse.status_code == 200

    with app.app_context():
        lignes = AuditLog.query.filter_by(action="partenaire_valide").all()
        assert len(lignes) == 1
        assert lignes[0].target_id == "a-conventionner"
        assert lignes[0].payload["motif"] == "Pieces completes."


def test_instruire_en_ligne_de_commande_ecrit_la_meme_ligne_qu_a_l_ecran(app):
    """Le point du mail de Vignal sur le middleware unique : un seul appelant
    (`instruction.instruire`), donc la CLI est couverte gratuitement."""
    from instruction import instruire

    with app.app_context():
        categorie = Categorie(nom="loisirs")
        db.session.add(categorie)
        db.session.flush()
        partenaire = Partenaire(
            slug="au-clavier", raison_sociale="Au Clavier", siren="987654321",
            categorie_id=categorie.id, adresse="1 rue", ville="Paris", code_postal="75001",
            email_contact="contact@au-clavier.fr", nom_representant="X",
            statut=PartnerStatus.en_attente,
        )
        partenaire.set_password(MOT_DE_PASSE)
        db.session.add(partenaire)
        db.session.commit()

        instruire(partenaire, "refuser", "Dossier incomplet.")
        db.session.commit()

        lignes = AuditLog.query.filter_by(action="partenaire_refuse").all()
        assert len(lignes) == 1
        assert lignes[0].actor_role == "admin"


# --- L'endpoint de lecture -----------------------------------------------------

def test_lister_audit_est_reserve_a_l_admin(app):
    with app.app_context():
        _admin()
    with app.test_client() as client:
        reponse = client.get("/api/v1/admin/audit")
        assert reponse.status_code == 401


def test_lister_audit_filtre_par_action(app):
    with app.app_context():
        _admin()
        record_event(action="connexion_echouee", actor_role="anonyme", commit=True)
        record_event(action="compte_cree", actor_role="user", commit=True)

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.get("/api/v1/admin/audit?action=compte_cree", headers=_entetes(jeton))

    assert reponse.status_code == 200
    corps = reponse.get_json()
    assert corps["total"] == 1
    assert corps["entries"][0]["action"] == "compte_cree"


def test_export_est_signe_et_verifiable(app, monkeypatch):
    monkeypatch.setenv("AUDIT_EXPORT_HMAC_KEY", "cle-de-test-tres-longue-0123456789")
    with app.app_context():
        _admin()
        record_event(action="a", actor_role="system", commit=True)
        record_event(action="b", actor_role="system", commit=True)

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.get("/api/v1/admin/audit/export", headers=_entetes(jeton))

    assert reponse.status_code == 200
    export = reponse.get_json()
    assert export["count"] == 2
    assert "signature" in export

    from verify_audit import verifier_chaine, verifier_signature
    sig_ok, _ = verifier_signature(export, "cle-de-test-tres-longue-0123456789")
    assert sig_ok
    chaine_ok, _, _ = verifier_chaine(export["entries"])
    assert chaine_ok


def test_export_detecte_une_suppression_simulee(app, monkeypatch):
    """Sans base : on simule ce qu'un DELETE en base ferait a l'export — un id manquant."""
    monkeypatch.setenv("AUDIT_EXPORT_HMAC_KEY", "cle-de-test-tres-longue-0123456789")
    with app.app_context():
        _admin()
        record_event(action="a", actor_role="system", commit=True)
        record_event(action="b", actor_role="system", commit=True)
        record_event(action="c", actor_role="system", commit=True)

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        export = client.get("/api/v1/admin/audit/export", headers=_entetes(jeton)).get_json()

    from verify_audit import verifier_chaine
    entries_amputees = [export["entries"][0], export["entries"][2]]  # le second a "disparu"
    ok, message, enregistrement = verifier_chaine(entries_amputees)
    assert not ok
    assert "SUPPRESSION" in message
    assert enregistrement["id"] == export["entries"][2]["id"]
