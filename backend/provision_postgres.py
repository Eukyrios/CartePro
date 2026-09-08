"""Provisionne la base Postgres : les tables, l'utilisateur applicatif, et le
privilege refuse sur `audit_log` que le mail de Vignal exige.

Pourquoi un utilisateur different pour creer les tables et pour y ecrire :
sous Postgres, le proprietaire d'une table garde toujours tous les droits
dessus, quoi que dise un REVOKE — seul un GRANT a un role qui n'est *pas*
proprietaire peut etre reellement restreint. Donc :

  1. Le superutilisateur (`AUDIT_DB_SUPERUSER_URI`) cree les tables. C'est lui
     qui en est proprietaire.
  2. Le role applicatif `cartepro_app` (celui de `TICKET_TOUT_DATABASE_URI`,
     celui que l'application utilise a chaque requete) recoit un GRANT
     explicite sur chaque table — complet sur les tables metier, et
     SELECT + INSERT seul sur `audit_log`, avec un REVOKE UPDATE, DELETE
     explicite en plus (redondant avec l'absence de GRANT, et volontairement :
     un futur `GRANT ALL ON ALL TABLES` ne rouvrirait pas le droit en
     silence).

Idempotent : peut se relancer sans effet de bord.

Usage :
    python provision_postgres.py
"""
import os
import sys

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

APP_ROLE = "cartepro_app"


def _superuser_uri():
    uri = os.environ.get("AUDIT_DB_SUPERUSER_URI")
    if not uri:
        sys.exit("AUDIT_DB_SUPERUSER_URI absente de l'environnement (voir .env.example).")
    return uri


def _app_password():
    mdp = os.environ.get("CARTEPRO_APP_DB_PASSWORD")
    if not mdp:
        sys.exit("CARTEPRO_APP_DB_PASSWORD absente de l'environnement (voir .env.example).")
    return mdp


def creer_role(connexion, mot_de_passe):
    existe = connexion.execute(
        text("SELECT 1 FROM pg_roles WHERE rolname = :role"), {"role": APP_ROLE}
    ).first()
    if existe:
        connexion.execute(
            text(f"ALTER ROLE {APP_ROLE} WITH LOGIN PASSWORD :mdp"), {"mdp": mot_de_passe}
        )
        print(f"Role « {APP_ROLE} » deja present : mot de passe mis a jour.")
    else:
        connexion.execute(
            text(f"CREATE ROLE {APP_ROLE} WITH LOGIN PASSWORD :mdp"), {"mdp": mot_de_passe}
        )
        print(f"Role « {APP_ROLE} » cree.")


def creer_tables(uri_superutilisateur):
    """Les tables, creees et donc possedees par le superutilisateur."""
    ancienne = os.environ.get("TICKET_TOUT_DATABASE_URI")
    os.environ["TICKET_TOUT_DATABASE_URI"] = uri_superutilisateur
    try:
        # Importes ici, apres avoir pose la variable d'environnement que
        # `create_app()` lit pour construire son moteur.
        from app import create_app
        from models import db

        app = create_app()
        with app.app_context():
            db.create_all()
        print("Tables creees (ou deja presentes), proprietaire : superutilisateur.")
    finally:
        if ancienne is None:
            os.environ.pop("TICKET_TOUT_DATABASE_URI", None)
        else:
            os.environ["TICKET_TOUT_DATABASE_URI"] = ancienne


def accorder_privileges(connexion):
    connexion.execute(text(f"GRANT USAGE ON SCHEMA public TO {APP_ROLE}"))

    # Tables metier : acces complet, l'utilisateur applicatif en a besoin pour
    # fonctionner normalement (CRUD classique).
    #
    # La liste vient du schema et non d'un litteral ecrit a la main. Elle en
    # etait un, figee a huit noms, et elle avait deja rate les deux tables
    # ajoutees depuis — `mesures_compte` et `partenaire_likes` : sous Postgres,
    # `cartepro_app` n'avait alors aucun privilege dessus, donc toute mesure de
    # compte et tout coup de coeur echouaient en « permission denied » sur une
    # base pourtant provisionnee sans erreur. Derivee, elle ne peut plus rater
    # une table ; le journal reste la seule exception, traitee juste apres.
    from models import AuditLog, db

    tables_metier = sorted(
        table for table in db.metadata.tables if table != AuditLog.__tablename__
    )
    for table in tables_metier:
        connexion.execute(text(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO {APP_ROLE}"))

    # Le journal d'audit : ajout seul. Pas d'UPDATE, pas de DELETE — c'est la
    # ligne qui porte la demande de la Cour des comptes.
    connexion.execute(text(f"GRANT SELECT, INSERT ON audit_log TO {APP_ROLE}"))
    connexion.execute(text(f"REVOKE UPDATE, DELETE ON audit_log FROM {APP_ROLE}"))

    # Les sequences des id auto-incrementes : sans USAGE dessus, un INSERT
    # echoue meme avec le GRANT INSERT ci-dessus.
    connexion.execute(text("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO " + APP_ROLE))

    print(f"Privileges accordes a « {APP_ROLE} » (audit_log : SELECT, INSERT seuls).")


def verifier(connexion):
    """Confirme, en interrogeant le catalogue systeme, que le refus est bien en place."""
    droits = connexion.execute(
        text(
            "SELECT privilege_type FROM information_schema.role_table_grants "
            "WHERE table_name = 'audit_log' AND grantee = :role"
        ),
        {"role": APP_ROLE},
    ).fetchall()
    accordes = sorted(d[0] for d in droits)
    print(f"Privileges effectifs de « {APP_ROLE} » sur audit_log : {accordes}")
    if "UPDATE" in accordes or "DELETE" in accordes:
        sys.exit("ECHEC : UPDATE ou DELETE encore accorde sur audit_log. Provisioning incorrect.")
    if "INSERT" not in accordes or "SELECT" not in accordes:
        sys.exit("ECHEC : SELECT/INSERT manquant sur audit_log. L'application ne pourra pas ecrire le journal.")
    print("Verification OK : SELECT + INSERT accordes, UPDATE + DELETE absents.")


def main():
    uri_superutilisateur = _superuser_uri()
    mot_de_passe = _app_password()

    creer_tables(uri_superutilisateur)

    moteur = create_engine(uri_superutilisateur)
    with moteur.connect() as connexion:
        with connexion.begin():
            creer_role(connexion, mot_de_passe)
            accorder_privileges(connexion)
        with connexion.begin():
            verifier(connexion)


if __name__ == "__main__":
    main()
