"""Ce que le journal d'audit consigne des trois operations ecrites apres lui.

`test_audit_log.py` verifie le dispositif : le chainage, le refus de l'UPDATE
et du DELETE, les deux routes de lecture, l'export signe. Il couvre aussi les
operations que la branche du journal connaissait. Trois autres sont arrivees
depuis — l'annulation d'un paiement, les mesures sur un compte salarie, et les
abondements — et ce fichier ne verifie que celles-la.

Il est a part et non ajoute a `test_audit_log.py` pour une raison pratique :
ce dernier recopie ses propres aides mais n'a ni `_salarie` ni `_partenaire`,
et une troisieme copie de ces fonctions est exactement ce que le depot evite en
les important depuis `test_admin_api`.

**Piege a connaitre** : ne comptez jamais les lignes du journal en bloc. Une
preparation de test qui suspend un compte pour verifier un refus d'abondement
ecrit desormais une ligne `compte_suspendu` : un `AuditLog.query.count()`
rendrait le test faux pour une raison sans rapport avec ce qu'il verifie. On
filtre donc toujours par `action`.

Trois regles que ces tests tiennent :

1. le journal suit l'ecriture metier, jamais la tentative : un 4xx n'ecrit
   rien, parce que `record_event` est apres tous les controles et que le refus
   ne committe pas ;
2. une ligne d'argent, une ligne de journal — d'ou une ligne par compte credite
   dans un lot, et **aucune** au rejeu d'une saisie deja enregistree ;
3. rien de nominatif dans le payload : la table est en ajout seul, donc
   impurgeable, et une adresse ecrite dedans y reste pour toujours.
"""

from datetime import datetime, timezone

import pytest

import mesures
from instruction import ACTIONS_AUDIT as ACTIONS_INSTRUCTION
from instruction import GESTES
from mesures import ACTIONS_AUDIT as ACTIONS_COMPTE
from mesures import GESTES_COMPTE
from models import Abondement, AuditLog, Salaries, Transaction, TransactionStatut, db
from test_admin_api import (  # noqa: F401 — `app` est une fixture pytest
    MOT_DE_PASSE,
    _admin,
    _entetes,
    _jeton,
    _partenaire,
    _salarie,
    app,
)
from test_admin_espace import agent  # noqa: F401 — un admin connecte et ses entetes


def _lignes(action):
    """Les lignes du journal pour cette action, de la plus ancienne a la plus recente."""
    return AuditLog.query.filter_by(action=action).order_by(AuditLog.id.asc()).all()


def _un_paiement(app, montant=12.5):
    """Un salarie dote de 50 EUR, un partenaire conventionne, et un paiement valide.

    Le decor minimal d'une annulation : la contre-passation exige une
    transaction *validee*, et le solde doit pouvoir remonter pour qu'on voie
    l'effet.
    """
    from models import PartnerStatus

    with app.app_context():
        agent_admin = _admin("agent2@administration.example")
        salarie = _salarie("payeur@example.com")
        partenaire = _partenaire("un-commerce", statut=PartnerStatus.valide)
        db.session.add(
            Abondement(
                employeur_id=salarie.employeur_id,
                salarie_id=salarie.id,
                montant=50.0,
                agent_admin_id=agent_admin.id,
            )
        )
        db.session.add(
            Transaction(
                salarie_id=salarie.id,
                partenaire_id=partenaire.id,
                montant=montant,
                horodatage=datetime.now(timezone.utc),
                statut=TransactionStatut.validee,
                reference_qr="ESSAI-AUDIT-ANNULATION",
                idempotency_key="ESSAI-AUDIT-ANNULATION",
                sens_ecriture="debit",
            )
        )
        db.session.commit()
        transaction = Transaction.query.filter_by(
            reference_qr="ESSAI-AUDIT-ANNULATION"
        ).one()
        return transaction.id, salarie.id, partenaire.id


# --- Annulation d'un paiement ------------------------------------------------

def test_annuler_un_paiement_ecrit_une_ligne_visant_l_originale(app, agent):
    """Annuler laisse deux traces indissociables : la contre-ecriture, et la ligne.

    La cible est le paiement d'origine, pas la contre-ecriture : la question
    qu'on posera au journal est « qu'est-il arrive a ce paiement », et la
    contre-ecriture en est la reponse.
    """
    client, entetes = agent
    transaction_id, salarie_id, partenaire_id = _un_paiement(app)

    reponse = client.post(
        f"/api/admin/transactions/{transaction_id}/annuler",
        headers=entetes,
        json={"motif": "Encaissement en double, constate par l'etablissement."},
    )
    assert reponse.status_code == 200, reponse.get_json()

    with app.app_context():
        lignes = _lignes("transaction_annulee")
        assert len(lignes) == 1
        ligne = lignes[0]
        assert ligne.target_type == "transaction"
        assert ligne.target_id == str(transaction_id)
        assert ligne.actor_role == "admin"
        assert ligne.actor_id.startswith("admin:")
        assert ligne.payload["montant_cents"] == 1250
        assert ligne.payload["motif"].startswith("Encaissement en double")
        assert ligne.payload["salarie_id"] == salarie_id
        assert ligne.payload["partenaire_id"] == partenaire_id

        # Le lien vers la ligne inverse est dans le payload, et il pointe sur
        # la contre-ecriture reellement ecrite.
        contre = Transaction.query.filter_by(
            transaction_originale_id=transaction_id
        ).one()
        assert ligne.payload["contre_ecriture_id"] == contre.id

        # Le jeton presente par le salarie n'a rien a faire dans un export.
        assert "reference_qr" not in ligne.payload
        assert "idempotency_key" not in ligne.payload


def test_une_annulation_refusee_n_ecrit_aucune_ligne(app, agent):
    """Le journal ne consigne pas les tentatives, seulement les actes.

    Sans motif, sur une transaction inconnue, ou une seconde fois sur la meme :
    trois refus, et une seule ligne au total — celle de l'annulation qui a
    reellement eu lieu.
    """
    client, entetes = agent
    transaction_id, _, _ = _un_paiement(app)

    assert client.post(
        f"/api/admin/transactions/{transaction_id}/annuler", headers=entetes, json={}
    ).status_code == 400
    assert client.post(
        "/api/admin/transactions/99999/annuler",
        headers=entetes,
        json={"motif": "Peu importe."},
    ).status_code == 404

    with app.app_context():
        assert _lignes("transaction_annulee") == []

    assert client.post(
        f"/api/admin/transactions/{transaction_id}/annuler",
        headers=entetes,
        json={"motif": "Motif ecrit."},
    ).status_code == 200
    assert client.post(
        f"/api/admin/transactions/{transaction_id}/annuler",
        headers=entetes,
        json={"motif": "Encore."},
    ).status_code == 400

    with app.app_context():
        assert len(_lignes("transaction_annulee")) == 1


# --- Mesures sur un compte salarie -------------------------------------------

def test_suspendre_un_compte_ecrit_la_mesure_et_la_ligne(app, agent):
    """Trois ecritures ou aucune : l'etat, la mesure motivee, la ligne du journal."""
    client, entetes = agent
    with app.app_context():
        identifiant = _salarie().id

    reponse = client.post(
        f"/api/admin/comptes/{identifiant}/suspendre",
        headers=entetes,
        json={"motif": "Controle en cours."},
    )
    assert reponse.status_code == 200

    with app.app_context():
        from models import MesureCompte

        assert MesureCompte.query.count() == 1
        lignes = _lignes("compte_suspendu")
        assert len(lignes) == 1
        ligne = lignes[0]
        assert ligne.target_type == "compte_salarie"
        assert ligne.target_id == str(identifiant)
        assert ligne.payload == {
            "avant": "actif",
            "apres": "suspendu",
            "motif": "Controle en cours.",
        }
        # L'adresse d'entree dans le dispositif : celle du client de test.
        assert ligne.ip == "127.0.0.1"

        # Le titulaire est designe par son identifiant, jamais nomme.
        for interdit in ("email", "nom", "prenom", "employeur"):
            assert interdit not in ligne.payload


def test_une_mesure_sans_motif_n_ecrit_ni_mesure_ni_ligne(app, agent):
    """422, et le journal reste muet : `MotifManquant` est leve avant l'ecriture."""
    client, entetes = agent
    with app.app_context():
        identifiant = _salarie().id

    assert client.post(
        f"/api/admin/comptes/{identifiant}/suspendre", headers=entetes, json={}
    ).status_code == 422

    with app.app_context():
        from models import MesureCompte

        assert MesureCompte.query.count() == 0
        assert AuditLog.query.filter(AuditLog.action.like("compte_%")).count() == 0


def test_cloturer_consigne_le_solde_residuel(app, agent):
    """Ce qu'il restait le jour de la fermeture — le seul chiffre irrecuperable.

    Cloturer puis supprimer un compte emporte ses abondements en cascade : si
    le reliquat n'est pas consigne ici, plus rien ne dit ce que le dispositif
    avait verse et qui n'a pas ete depense.
    """
    client, entetes = agent
    with app.app_context():
        agent_admin = _admin("agent3@administration.example")
        salarie = _salarie("solde@example.com")
        db.session.add(
            Abondement(
                employeur_id=salarie.employeur_id,
                salarie_id=salarie.id,
                montant=50.0,
                agent_admin_id=agent_admin.id,
            )
        )
        db.session.commit()
        identifiant = salarie.id

    reponse = client.post(
        f"/api/admin/comptes/{identifiant}/cloturer",
        headers=entetes,
        json={"motif": "Depart de l'entreprise."},
    )
    assert reponse.status_code == 200

    with app.app_context():
        ligne = _lignes("compte_cloture")[0]
        assert ligne.payload["solde_residuel_cents"] == 5000
    # Le journal et la reponse ne peuvent pas raconter deux histoires.
    assert reponse.get_json()["soldeResiduelCents"] == 5000


def test_mesurer_hors_requete_ecrit_la_meme_ligne(app):
    """Le point d'ecriture est dans `mesures.py`, donc un appelant sans requete est couvert.

    C'est ce qui justifie de ne pas avoir mis l'appel dans la route : le jour ou
    les comptes auront leur ligne de commande, comme les dossiers ont
    `instruire.py`, elle sera tracee sans qu'on y pense. `ip` est alors nulle,
    ce qui est la verite : l'appel ne vient pas du reseau.
    """
    with app.app_context():
        salarie = _salarie("hors-requete@example.com")
        db.session.commit()

        avant, apres = mesures.mesurer(salarie, "suspendre", "Mesure en ligne de commande.")
        db.session.commit()

        assert (avant, apres) == ("actif", "suspendu")
        ligne = _lignes("compte_suspendu")[0]
        assert ligne.actor_id == "admin:1"  # AGENT_DEMONSTRATION
        assert ligne.ip is None


@pytest.mark.parametrize(
    "gestes,actions",
    [(GESTES_COMPTE, ACTIONS_COMPTE), (GESTES, ACTIONS_INSTRUCTION)],
    ids=["comptes", "instruction"],
)
def test_chaque_geste_a_son_action_d_audit(gestes, actions):
    """Un geste ajoute sans son action jumelle ne passe pas.

    Ce test existe parce que l'oubli s'est produit : le geste `cloturer` a ete
    ajoute aux dossiers de partenaires apres l'ecriture du journal, et clore un
    etablissement levait un KeyError au moment d'indexer `ACTIONS_AUDIT`. Les
    deux tables sont ecrites cote a cote pour que ca se voie ; ceci le rend
    verifiable.
    """
    assert set(gestes) == set(actions)


# --- Abondements -------------------------------------------------------------

def test_le_rejeu_d_un_abondement_n_ajoute_aucune_ligne(app, agent):
    """Un renvoi rend, il ne double pas — ni l'argent, ni ce que le journal en dit.

    Le journal est la source ou l'on compte les euros crees. Une ligne de plus
    au rejeu ferait dire qu'une dotation versee une fois l'a ete deux.
    """
    client, entetes = agent
    with app.app_context():
        identifiants = [_salarie("a@example.com").id, _salarie("b@example.com").id]

    charge = {
        "salarieIds": identifiants,
        "montantCents": 5000,
        "reference": "dotation-audit-0001",
    }
    premier = client.post("/api/admin/abondements", headers=entetes, json=charge)
    second = client.post("/api/admin/abondements", headers=entetes, json=charge)

    assert premier.get_json()["rejoue"] is False
    assert second.get_json()["rejoue"] is True

    with app.app_context():
        assert Abondement.query.count() == 2
        lignes = _lignes("abondement_credite")
        assert len(lignes) == 2  # et non quatre
        cibles = {ligne.target_id for ligne in lignes}
        assert cibles == {str(a["id"]) for a in premier.get_json()["abondements"]}


def test_un_lot_ecrit_une_ligne_par_compte_et_les_chaine(app, agent):
    """Trois comptes credites en un appel : trois lignes, chainees entre elles.

    C'est le premier endroit du dispositif ou plusieurs lignes d'audit
    s'ecrivent dans une seule transaction. Le chainage doit tenir sans commit
    intermediaire — sinon deux lignes du meme lot pretendraient suivre le meme
    predecesseur.
    """
    client, entetes = agent
    with app.app_context():
        identifiants = [
            _salarie("un@example.com").id,
            _salarie("deux@example.com").id,
            _salarie("trois@example.com").id,
        ]

    reponse = client.post(
        "/api/admin/abondements",
        headers=entetes,
        json={
            "salarieIds": identifiants,
            "montantCents": 2500,
            "reference": "dotation-audit-0002",
        },
    )
    assert reponse.status_code == 200

    with app.app_context():
        lignes = _lignes("abondement_credite")
        assert len(lignes) == 3
        assert lignes[1].prev_hash == lignes[0].hash
        assert lignes[2].prev_hash == lignes[1].hash
        assert len({ligne.target_id for ligne in lignes}) == 3
        assert [ligne.payload["lot_taille"] for ligne in lignes] == [3, 3, 3]
        assert [ligne.payload["reference"] for ligne in lignes] == [
            "dotation-audit-0002:0",
            "dotation-audit-0002:1",
            "dotation-audit-0002:2",
        ]
        # Un seul instant pour tout le lot : un filtre de periode ne doit pas
        # pouvoir le couper en deux.
        assert len({ligne.occurred_at for ligne in lignes}) == 1


def test_un_lot_refuse_n_ecrit_aucune_ligne_d_abondement(app, agent):
    """Atomicite : la moitie d'une dotation est pire qu'aucune, et un journal qui en parle, pire encore."""
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
            "reference": "dotation-audit-0003",
        },
    )
    assert reponse.status_code == 409

    with app.app_context():
        assert Abondement.query.count() == 0
        # Filtre par action, et non compte global : la preparation ci-dessus a
        # suspendu un compte, donc le journal porte deja une ligne.
        assert _lignes("abondement_credite") == []
        assert len(_lignes("compte_suspendu")) == 1


def test_un_credit_seul_se_lit_sans_ouvrir_la_base(app, agent):
    """Qui, combien, a qui, sous quelle reference — et rien de nominatif."""
    client, entetes = agent
    with app.app_context():
        identifiant = _salarie("seul@example.com").id

    client.post(
        "/api/admin/abondements",
        headers=entetes,
        json={
            "salarieIds": [identifiant],
            "montantCents": 7500,
            "reference": "dotation-audit-0004",
        },
    )

    with app.app_context():
        ligne = _lignes("abondement_credite")[0]
        assert ligne.target_type == "abondement"
        assert ligne.payload["salarie_id"] == identifiant
        assert ligne.payload["montant_cents"] == 7500
        assert ligne.payload["lot_taille"] == 1
        # Un seul compte : la cle n'est pas suffixee.
        assert ligne.payload["reference"] == "dotation-audit-0004"
        assert ligne.payload["employeur_id"] is not None
        for interdit in ("email", "nom", "salarie", "employeur"):
            assert interdit not in ligne.payload

        # Le montant est un entier de centimes : le payload est rehache par
        # `verify_audit.py` depuis le JSON exporte, et un flottant qui se
        # serialise autrement d'un moteur a l'autre romprait la chaine sur une
        # ligne honnete.
        assert isinstance(ligne.payload["montant_cents"], int)
