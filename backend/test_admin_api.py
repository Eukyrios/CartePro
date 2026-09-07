"""Tests de l'API d'administration, sur une base a eux.

Deux choses y sont verifiees, et la premiere est la plus importante : que
chaque route refuse ce qu'elle doit refuser. `POST
/api/admin/transactions/<id>/annuler` n'avait aucun garde et repondait
« success » a n'importe qui ; un test qui echoue si le garde disparait vaut
mieux qu'un decorateur qu'on croit present.

La seconde est que l'instruction d'un dossier laisse la trace attendue : le
statut change **et** une decision motivee s'ecrit. Les deux ensemble, jamais
l'un sans l'autre.
"""

import os
import shutil
import tempfile

import pytest

from app import create_app
from models import (
    Admin,
    Categorie,
    Decision,
    DecisionSens,
    Employeur,
    Partenaire,
    PartnerStatus,
    Salaries,
    db,
)

MOT_DE_PASSE = "secret123"


@pytest.fixture
def app():
    """Une application sur une base temporaire, jetee apres le test.

    L'URI est posee **avant** `create_app()` : Flask-SQLAlchemy lie son moteur
    au premier usage, donc la changer ensuite ne ferait rien — et le
    `drop_all()` de fin s'appliquerait a la base de demonstration.
    """
    dossier = tempfile.mkdtemp()
    fichier = os.path.join(dossier, "test.db")
    ancienne = os.environ.get("TICKET_TOUT_DATABASE_URI")
    os.environ["TICKET_TOUT_DATABASE_URI"] = f"sqlite:///{fichier}"
    try:
        application = create_app()
        application.config["TESTING"] = True
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


def _admin(email="agent@administration.example"):
    compte = Admin(nom="Agent", email=email)
    compte.set_password(MOT_DE_PASSE)
    db.session.add(compte)
    db.session.commit()
    return compte


def _salarie(email="salarie@example.com"):
    employeur = Employeur.query.first() or Employeur(raison_sociale="administration")
    db.session.add(employeur)
    db.session.flush()
    compte = Salaries(
        nom="Test",
        prenom="Alice",
        email=email,
        employeur_id=employeur.id,
        couleur_carte="#4a1b6b",
        couleur_texte="#ffffff",
        effet_metallise=20,
    )
    compte.set_password(MOT_DE_PASSE)
    db.session.add(compte)
    db.session.commit()
    return compte


def _partenaire(slug, statut=PartnerStatus.en_attente):
    categorie = Categorie.query.first() or Categorie(nom="loisirs")
    db.session.add(categorie)
    db.session.flush()
    compte = Partenaire(
        slug=slug,
        raison_sociale=slug.replace("-", " ").title(),
        siren=str(100000000 + abs(hash(slug)) % 800000000),
        categorie_id=categorie.id,
        adresse="1 rue du Test",
        ville="Paris",
        code_postal="75001",
        email_contact=f"contact@{slug}.fr",
        nom_representant="Marie Dupont",
        statut=statut,
    )
    compte.set_password(MOT_DE_PASSE)
    db.session.add(compte)
    db.session.commit()
    return compte


def _jeton(client, email):
    reponse = client.post(
        "/api/auth/login", json={"email": email, "password": MOT_DE_PASSE}
    )
    assert reponse.status_code == 200, reponse.get_json()
    return reponse.get_json()["access_token"]


def _entetes(jeton):
    return {"Authorization": f"Bearer {jeton}"}


#: Toutes les routes d'administration, avec leur methode.
#:
#: Ecrite a la main plutot que deduite du blueprint, et c'est voulu : une route
#: ajoutee sans garde n'apparaitrait pas dans une liste deduite du code qui la
#: porte. Ici, l'oubli se voit parce que la liste, elle, ne bouge pas toute
#: seule.
ROUTES = [
    ("GET", "/api/admin/partenaires/demandes"),
    ("GET", "/api/admin/partenaires"),
    ("GET", "/api/admin/partenaires/un-slug"),
    ("GET", "/api/admin/transactions.csv"),
    ("POST", "/api/admin/partenaires/un-slug/approuver"),
    ("POST", "/api/admin/partenaires/un-slug/refuser"),
    ("POST", "/api/admin/partenaires/un-slug/suspendre"),
    ("POST", "/api/admin/transactions/1/annuler"),
]


@pytest.mark.parametrize("methode,url", ROUTES)
def test_sans_jeton_tout_est_refuse(app, methode, url):
    """Aucune route d'administration ne repond a un appel anonyme."""
    with app.test_client() as client:
        reponse = client.open(url, method=methode)
    assert reponse.status_code == 401


@pytest.mark.parametrize("methode,url", ROUTES)
def test_un_salarie_ne_passe_pas(app, methode, url):
    """Un jeton valide mais non-admin obtient 403, et non 401 : l'identite est
    la, elle ne suffit pas."""
    with app.app_context():
        _salarie()

    with app.test_client() as client:
        jeton = _jeton(client, "salarie@example.com")
        reponse = client.open(url, method=methode, headers=_entetes(jeton))

    assert reponse.status_code == 403


def test_lister_les_demandes_ne_montre_que_les_dossiers_en_attente(app):
    with app.app_context():
        _admin()
        _partenaire("en-attente", PartnerStatus.en_attente)
        _partenaire("deja-valide", PartnerStatus.valide)
        _partenaire("deja-refuse", PartnerStatus.refuse)

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.get(
            "/api/admin/partenaires/demandes", headers=_entetes(jeton)
        )

    assert reponse.status_code == 200
    assert [d["id"] for d in reponse.get_json()["demandes"]] == ["en-attente"]


def test_lister_les_conventionnes_ne_montre_que_les_valides(app):
    with app.app_context():
        _admin()
        _partenaire("en-attente", PartnerStatus.en_attente)
        _partenaire("deja-valide", PartnerStatus.valide)

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.get("/api/admin/partenaires", headers=_entetes(jeton))

    assert reponse.status_code == 200
    assert [d["id"] for d in reponse.get_json()["partenaires"]] == ["deja-valide"]


def test_lire_un_dossier_sert_tous_les_statuts(app):
    """On relit un dossier deja instruit autant qu'un dossier neuf."""
    with app.app_context():
        _admin()
        _partenaire("deja-refuse", PartnerStatus.refuse)

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.get(
            "/api/admin/partenaires/deja-refuse", headers=_entetes(jeton)
        )

    assert reponse.status_code == 200
    dossier = reponse.get_json()["dossier"]
    assert dossier["id"] == "deja-refuse"
    assert dossier["statut"] == "refusé"
    # Les pieces de la fiche redigee font partie du dossier.
    for cle in ("siteWeb", "presentationTitre", "presentationTexte", "horaires"):
        assert cle in dossier


def test_demandes_n_est_pas_avale_par_la_route_de_dossier(app):
    """`/partenaires/demandes` reste la liste, pas un dossier nomme « demandes ».

    Les deux regles se recouvrent — `/partenaires/<slug>` accepterait
    « demandes » — et l'ordre dans lequel Werkzeug les range decide. Ce test
    est la parce qu'une inversion ne se verrait qu'a l'usage.
    """
    with app.app_context():
        _admin()
        _partenaire("en-attente", PartnerStatus.en_attente)

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.get(
            "/api/admin/partenaires/demandes", headers=_entetes(jeton)
        )

    assert reponse.status_code == 200
    assert "demandes" in reponse.get_json()


def test_dossier_introuvable_en_lecture(app):
    with app.app_context():
        _admin()

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.get(
            "/api/admin/partenaires/personne", headers=_entetes(jeton)
        )

    assert reponse.status_code == 404


def test_approuver_change_le_statut_et_ecrit_la_decision(app):
    """Les deux ensemble : c'est tout l'objet de `instruction.instruire`."""
    with app.app_context():
        _admin()
        _partenaire("a-conventionner")

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.post(
            "/api/admin/partenaires/a-conventionner/approuver",
            json={"motif": "Pièces complètes, agrément produit."},
            headers=_entetes(jeton),
        )

    assert reponse.status_code == 200
    with app.app_context():
        partenaire = Partenaire.query.filter_by(slug="a-conventionner").first()
        assert partenaire.statut == PartnerStatus.valide
        decisions = Decision.query.filter_by(partenaire_id=partenaire.id).all()
        assert len(decisions) == 1
        assert decisions[0].sens == DecisionSens.accepte
        assert decisions[0].motif_ecrit == "Pièces complètes, agrément produit."
        # L'agent qui a clique, et non un identifiant en dur.
        assert decisions[0].agent_id == Admin.query.first().id


def test_refuser_conserve_le_motif_que_le_partenaire_lira(app):
    with app.app_context():
        _admin()
        _partenaire("a-ecarter")

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.post(
            "/api/admin/partenaires/a-ecarter/refuser",
            json={"motif": "Agrément sanitaire absent du dossier."},
            headers=_entetes(jeton),
        )

    assert reponse.status_code == 200
    with app.app_context():
        partenaire = Partenaire.query.filter_by(slug="a-ecarter").first()
        assert partenaire.statut == PartnerStatus.refuse

    # Et le titulaire le lit dans son espace — lui seul.
    with app.test_client() as client:
        sien = _jeton(client, "contact@a-ecarter.fr")
        moi = client.get("/api/auth/me", headers=_entetes(sien)).get_json()
    assert moi["user"]["profile"]["refus"]["motif"] == (
        "Agrément sanitaire absent du dossier."
    )


def test_une_decision_sans_motif_est_refusee(app):
    """422 : la requete est bien formee, son contenu ne permet pas de decider."""
    with app.app_context():
        _admin()
        _partenaire("sans-motif")

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.post(
            "/api/admin/partenaires/sans-motif/refuser",
            json={"motif": "   "},
            headers=_entetes(jeton),
        )

    assert reponse.status_code == 422
    with app.app_context():
        # Rien n'a bouge : ni le statut, ni la table des decisions.
        assert (
            Partenaire.query.filter_by(slug="sans-motif").first().statut
            == PartnerStatus.en_attente
        )
        assert Decision.query.count() == 0


def test_instruire_deux_fois_dans_le_meme_sens_est_un_conflit(app):
    with app.app_context():
        _admin()
        _partenaire("deja-valide", PartnerStatus.valide)

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.post(
            "/api/admin/partenaires/deja-valide/approuver",
            json={"motif": "Encore une fois."},
            headers=_entetes(jeton),
        )

    assert reponse.status_code == 409
    with app.app_context():
        assert Decision.query.count() == 0


def test_dossier_introuvable(app):
    with app.app_context():
        _admin()

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.post(
            "/api/admin/partenaires/personne/approuver",
            json={"motif": "Peu importe."},
            headers=_entetes(jeton),
        )

    assert reponse.status_code == 404


def test_annuler_une_transaction_dit_qu_elle_n_est_pas_implementee(app):
    """501, et non « success » : la route ne fait rien, elle doit le dire."""
    with app.app_context():
        _admin()

    with app.test_client() as client:
        jeton = _jeton(client, "agent@administration.example")
        reponse = client.post(
            "/api/admin/transactions/1/annuler", headers=_entetes(jeton)
        )

    assert reponse.status_code == 501
