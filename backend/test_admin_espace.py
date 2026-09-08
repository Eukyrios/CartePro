"""Tests des trois domaines ajoutes a l'espace d'administration.

Gestion des comptes, tableau de bord national, abondements employeurs. Les
gardes sont deja verifies par `test_admin_api.py`, dont la liste `ROUTES`
couvre ces routes : ici on verifie ce que chacune **fait**, et surtout ce
qu'elle refuse de faire.

Trois regles qui ne doivent pas se perdre :

1. une mesure sans motif ecrit n'est pas une mesure (422), et une mesure prise
   change l'etat **et** ecrit sa ligne — jamais l'un sans l'autre ;
2. une cloture est definitive : la route d'activation la refuse ;
3. un versement envoye deux fois avec la meme cle ne credite qu'une fois.
   C'est la seule route qui cree de l'argent ; un double-clic ne doit pas
   pouvoir doubler une dotation.
"""

import pytest

from models import Abondement, CompteStatut, MesureCompte, Salaries, db
from test_admin_api import (  # noqa: F401 — `app` est une fixture pytest
    MOT_DE_PASSE,
    _admin,
    _entetes,
    _jeton,
    _partenaire,
    _salarie,
    app,
)


@pytest.fixture
def agent(app):
    """Un admin connecte, et les entetes qui vont avec."""
    with app.app_context():
        _admin()
    client = app.test_client()
    return client, _entetes(_jeton(client, "agent@administration.example"))


# --- Gestion des comptes -----------------------------------------------------

def test_une_mesure_sans_motif_est_refusee(app, agent):
    client, entetes = agent
    with app.app_context():
        identifiant = _salarie().id

    reponse = client.post(
        f"/api/admin/comptes/{identifiant}/suspendre", headers=entetes, json={}
    )
    assert reponse.status_code == 422

    # Rien n'a bouge : ni l'etat, ni la trace.
    with app.app_context():
        assert db.session.get(Salaries, identifiant).statut == CompteStatut.actif
        assert MesureCompte.query.count() == 0


def test_suspendre_change_l_etat_et_ecrit_la_mesure(app, agent):
    client, entetes = agent
    with app.app_context():
        identifiant = _salarie().id

    reponse = client.post(
        f"/api/admin/comptes/{identifiant}/suspendre",
        headers=entetes,
        json={"motif": "Piece d'identite non renouvelee."},
    )
    assert reponse.status_code == 200
    assert reponse.get_json()["compte"]["statut"] == "suspendu"

    with app.app_context():
        salarie = db.session.get(Salaries, identifiant)
        assert salarie.statut == CompteStatut.suspendu
        mesures = MesureCompte.query.filter_by(salarie_id=identifiant).all()
        assert len(mesures) == 1
        assert mesures[0].sens == CompteStatut.suspendu
        assert mesures[0].motif_ecrit == "Piece d'identite non renouvelee."


def test_un_compte_suspendu_ne_se_connecte_plus(app, agent):
    """La mesure ferme reellement la porte, elle ne colore pas une pastille."""
    client, entetes = agent
    with app.app_context():
        identifiant = _salarie("ferme@example.com").id

    avant = client.post(
        "/api/auth/login",
        json={"email": "ferme@example.com", "password": MOT_DE_PASSE},
    )
    assert avant.status_code == 200

    client.post(
        f"/api/admin/comptes/{identifiant}/suspendre",
        headers=entetes,
        json={"motif": "Mesure conservatoire."},
    )

    apres = client.post(
        "/api/auth/login",
        json={"email": "ferme@example.com", "password": MOT_DE_PASSE},
    )
    assert apres.status_code != 200


def test_mesurer_deux_fois_dans_le_meme_sens_est_un_conflit(app, agent):
    client, entetes = agent
    with app.app_context():
        identifiant = _salarie().id

    charge = {"motif": "Motif ecrit."}
    premier = client.post(
        f"/api/admin/comptes/{identifiant}/suspendre", headers=entetes, json=charge
    )
    second = client.post(
        f"/api/admin/comptes/{identifiant}/suspendre", headers=entetes, json=charge
    )
    assert premier.status_code == 200
    assert second.status_code == 409

    with app.app_context():
        assert MesureCompte.query.filter_by(salarie_id=identifiant).count() == 1


def test_une_cloture_ne_se_leve_pas(app, agent):
    client, entetes = agent
    with app.app_context():
        identifiant = _salarie().id

    cloture = client.post(
        f"/api/admin/comptes/{identifiant}/cloturer",
        headers=entetes,
        json={"motif": "Fin de contrat."},
    )
    assert cloture.status_code == 200
    # Le reliquat est dit : c'est ce que l'agent doit consigner.
    assert "soldeResiduelCents" in cloture.get_json()

    reouverture = client.post(
        f"/api/admin/comptes/{identifiant}/activer",
        headers=entetes,
        json={"motif": "Erreur."},
    )
    assert reouverture.status_code == 409

    with app.app_context():
        assert db.session.get(Salaries, identifiant).statut == CompteStatut.cloture


def test_l_historique_des_mesures_ne_s_efface_pas(app, agent):
    client, entetes = agent
    with app.app_context():
        identifiant = _salarie().id

    for geste, motif in [
        ("suspendre", "Premiere mesure."),
        ("activer", "Levee de la mesure."),
        ("cloturer", "Fin de contrat."),
    ]:
        reponse = client.post(
            f"/api/admin/comptes/{identifiant}/{geste}",
            headers=entetes,
            json={"motif": motif},
        )
        assert reponse.status_code == 200, reponse.get_json()

    with app.app_context():
        mesures = MesureCompte.query.filter_by(salarie_id=identifiant).all()
        assert [m.sens for m in mesures] == [
            CompteStatut.suspendu,
            CompteStatut.actif,
            CompteStatut.cloture,
        ]


def test_compte_introuvable(app, agent):
    client, entetes = agent
    reponse = client.post(
        "/api/admin/comptes/99999/suspendre", headers=entetes, json={"motif": "x"}
    )
    assert reponse.status_code == 404


# --- Tableau de bord ---------------------------------------------------------

def test_le_tableau_de_bord_rend_ses_trois_familles(app, agent):
    client, entetes = agent
    with app.app_context():
        _salarie()
        _partenaire("un-partenaire")

    corps = client.get("/api/admin/tableau-de-bord", headers=entetes).get_json()
    assert set(corps) >= {"periode", "volume", "partenaires", "comptes", "geographie"}
    assert corps["volume"]["nombre"] == 0
    assert corps["partenaires"]["total"] == 1
    assert corps["comptes"]["parStatut"]["actif"] == 1


def test_une_base_sans_paiement_ne_casse_pas_le_tableau(app, agent):
    """Zero paiement est une reponse valable, pas une division par zero."""
    client, entetes = agent
    corps = client.get("/api/admin/tableau-de-bord", headers=entetes).get_json()
    assert corps["volume"]["moyenneCents"] == 0
    assert corps["volume"]["serie"] == []
    assert corps["periode"] == {"debut": None, "fin": None}


def test_la_serie_couvre_l_annee_entiere(app, agent):
    """Douze mois, meme quand le dispositif n'a tourne qu'un seul.

    Une serie qui saute les mois vides ment sur la forme de la courbe : deux
    mois cote a cote se lisent comme deux mois consecutifs, meme separes par un
    trou de six mois. Et un mois sans paiement est un zero, pas une absence de
    mesure.
    """
    from datetime import datetime, timezone

    from models import Transaction, TransactionStatut

    client, entetes = agent
    with app.app_context():
        salarie = _salarie()
        partenaire = _partenaire("un-partenaire")
        db.session.add(Transaction(
            salarie_id=salarie.id,
            partenaire_id=partenaire.id,
            montant=10.0,
            horodatage=datetime(2026, 7, 15, tzinfo=timezone.utc),
            statut=TransactionStatut.validee,
            reference_qr="ESSAI-SERIE",
            idempotency_key="ESSAI-SERIE",
            sens_ecriture="debit",
        ))
        db.session.commit()

    serie = client.get("/api/admin/tableau-de-bord", headers=entetes).get_json()[
        "volume"
    ]["serie"]
    assert [ligne["mois"] for ligne in serie] == [
        f"2026-{mois:02d}" for mois in range(1, 13)
    ]
    # Le seul mois qui porte quelque chose le porte, les onze autres sont a zero.
    assert sum(ligne["nombre"] for ligne in serie) == 1
    assert next(l for l in serie if l["mois"] == "2026-07")["nombre"] == 1
    assert next(l for l in serie if l["mois"] == "2026-01")["nombre"] == 0


def test_le_departement_se_lit_du_code_postal(app):
    """Deux chiffres, sauf outre-mer, ou il en faut trois."""
    from routes.admin_tableau import departement

    assert departement("75001") == "75"
    assert departement("13400") == "13"
    assert departement("97400") == "974"
    assert departement("") == ""
    assert departement("abcde") == ""


# --- Abondements -------------------------------------------------------------

def test_crediter_sans_cle_est_refuse(app, agent):
    client, entetes = agent
    with app.app_context():
        identifiant = _salarie().id

    reponse = client.post(
        "/api/admin/abondements",
        headers=entetes,
        json={"salarieIds": [identifiant], "montantCents": 5000},
    )
    assert reponse.status_code == 422
    with app.app_context():
        assert Abondement.query.count() == 0


def test_la_meme_cle_ne_credite_qu_une_fois(app, agent):
    """La regle qui protege l'argent : un renvoi rend, il ne double pas."""
    client, entetes = agent
    with app.app_context():
        identifiants = [_salarie("a@example.com").id, _salarie("b@example.com").id]

    charge = {
        "salarieIds": identifiants,
        "montantCents": 5000,
        "reference": "dotation-de-test-0001",
    }
    premier = client.post("/api/admin/abondements", headers=entetes, json=charge)
    second = client.post("/api/admin/abondements", headers=entetes, json=charge)

    assert premier.status_code == 200
    assert second.status_code == 200
    assert premier.get_json()["rejoue"] is False
    assert second.get_json()["rejoue"] is True
    # Les memes lignes rendues, et pas de nouvelles ecrites.
    assert [a["id"] for a in premier.get_json()["abondements"]] == [
        a["id"] for a in second.get_json()["abondements"]
    ]

    with app.app_context():
        assert Abondement.query.count() == 2
        for identifiant in identifiants:
            assert db.session.get(Salaries, identifiant).solde == 50.0


def test_un_lot_avec_un_compte_ferme_n_ecrit_rien(app, agent):
    """Atomicite : la moitie d'une dotation est pire qu'aucune."""
    client, entetes = agent
    with app.app_context():
        ouvert = _salarie("ouvert@example.com").id
        ferme = _salarie("clos@example.com").id

    client.post(
        f"/api/admin/comptes/{ferme}/suspendre",
        headers=entetes,
        json={"motif": "Mesure."},
    )

    reponse = client.post(
        "/api/admin/abondements",
        headers=entetes,
        json={
            "salarieIds": [ouvert, ferme],
            "montantCents": 5000,
            "reference": "dotation-de-test-0002",
        },
    )
    assert reponse.status_code == 409
    with app.app_context():
        assert Abondement.query.count() == 0
        assert db.session.get(Salaries, ouvert).solde == 0


@pytest.mark.parametrize(
    "charge,attendu",
    [
        ({"montantCents": 0}, 400),
        ({"montantCents": -100}, 400),
        ({"montantCents": 500_001}, 400),
        ({"montantCents": "beaucoup"}, 400),
    ],
)
def test_les_montants_impossibles_sont_refuses(app, agent, charge, attendu):
    client, entetes = agent
    with app.app_context():
        identifiant = _salarie().id

    reponse = client.post(
        "/api/admin/abondements",
        headers=entetes,
        json={
            "salarieIds": [identifiant],
            "reference": "dotation-de-test-0003",
            **charge,
        },
    )
    assert reponse.status_code == attendu
    with app.app_context():
        assert Abondement.query.count() == 0


def test_une_cle_avec_un_joker_est_refusee(app, agent):
    """« % » ferait correspondre le rejeu aux saisies des autres."""
    client, entetes = agent
    with app.app_context():
        identifiant = _salarie().id

    reponse = client.post(
        "/api/admin/abondements",
        headers=entetes,
        json={
            "salarieIds": [identifiant],
            "montantCents": 1000,
            "reference": "dotation%test",
        },
    )
    assert reponse.status_code == 422
