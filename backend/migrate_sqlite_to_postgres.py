"""Copie les donnees existantes de `instance/app.db` (SQLite) vers Postgres.

La demande de garder « les memes informations dans les tables » en migrant de
moteur : chaque ligne existante est recopiee avec son id d'origine (les
partenaires, salaries, decisions, transactions, abondements de la semaine
ecoulee) — rien n'est recree, rien n'est resemé.

Ce que ce script ne fait pas, et pourquoi : il n'invente aucune ecriture dans
`audit_log` pour ces operations anterieures. Le journal demarre a
l'execution de ce script, avec un enregistrement de genese qui le dit — voir
`docs/audit-log/note.md`, §1. Antidater des ecritures d'audit pour la semaine
passee serait exactement la fraude que le dispositif est cense rendre
visible.

Ecrit avec le superutilisateur (`AUDIT_DB_SUPERUSER_URI`), pas avec
l'utilisateur applicatif : il faut poser des id explicites, ce qu'un simple
GRANT INSERT permettrait deja, mais c'est une operation d'administration de
base, pas un appel de l'application — le meme principe que le reste de ce
chantier.

Usage :
    python provision_postgres.py          # d'abord : tables + roles + GRANT/REVOKE
    python migrate_sqlite_to_postgres.py   # ensuite : les donnees
"""
import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

load_dotenv()

from audit_chain import GENESIS_PREV_HASH, compute_hash
from models import (
    Abondement,
    Admin,
    AuditLog,
    Categorie,
    Decision,
    Employeur,
    MesureCompte,
    Partenaire,
    PartenaireLike,
    Salaries,
    Transaction,
    db,
)

#: Ordre de copie : chaque table avant celles qui la referencent par cle
#: etrangere, sans quoi l'insertion echoue sur une contrainte non satisfaite.
#:
#: `MesureCompte` et `PartenaireLike` referencent `salaries`, la seconde aussi
#: `partenaires` : d'ou leur place apres les deux. Elles manquaient — leurs
#: lignes n'etaient pas copiees et leurs sequences restaient a zero, donc le
#: premier coup de coeur insere par l'application collisionnait sur la cle
#: primaire d'une ligne migree.
ORDRE = [
    Employeur,
    Categorie,
    Admin,
    Salaries,
    Partenaire,
    Transaction,
    Abondement,
    MesureCompte,
    PartenaireLike,
    Decision,
]

#: Le garde qui rend l'oubli suivant bruyant.
#:
#: Une liste ecrite a la main ne bouge pas toute seule : c'est sa vertu — elle
#: porte l'ordre des cles etrangeres, qu'aucune introspection ne devine — et
#: c'est son defaut, puisqu'un modele ajoute ailleurs n'y apparait pas. Le
#: defaut se paie en silence : la table n'est pas copiee et personne ne le voit.
#: D'ou ce controle, qui refuse la migration plutot que de la faire a moitie.
_MODELES_ABSENTS = (
    {mapper.class_.__tablename__ for mapper in db.Model.registry.mappers}
    - {modele.__tablename__ for modele in ORDRE}
    - {AuditLog.__tablename__}
)
if _MODELES_ABSENTS:
    sys.exit(
        f"Tables absentes d'ORDRE : {sorted(_MODELES_ABSENTS)}. Les ajouter, "
        "chacune apres celles qu'elle reference par cle etrangere, sinon leurs "
        "lignes ne seront pas copiees et leurs sequences resteront desalignees."
    )


def _source_uri():
    chemin = os.environ.get(
        "SQLITE_SOURCE_PATH",
        os.path.join(os.path.dirname(__file__), "instance", "app.db"),
    )
    if not os.path.exists(chemin):
        sys.exit(f"Base source introuvable : {chemin} (SQLITE_SOURCE_PATH pour en indiquer une autre).")
    return f"sqlite:///{chemin}"


def _dest_uri():
    uri = os.environ.get("AUDIT_DB_SUPERUSER_URI")
    if not uri:
        sys.exit("AUDIT_DB_SUPERUSER_URI absente de l'environnement (voir .env.example).")
    return uri


def copier_table(modele, session_source, session_dest):
    if session_dest.query(modele).count() > 0:
        print(f"{modele.__tablename__} : deja peuplee cote Postgres, ignoree.")
        return
    colonnes = [c.key for c in inspect(modele).mapper.column_attrs]
    lignes = session_source.query(modele).order_by(modele.id).all()
    for ligne in lignes:
        donnees = {c: getattr(ligne, c) for c in colonnes}
        session_dest.add(modele(**donnees))
    session_dest.commit()
    print(f"{modele.__tablename__} : {len(lignes)} ligne(s) copiee(s).")


def reinitialiser_sequences(engine_dest):
    """Postgres ignore les id explicites qu'on vient d'inserer : sans ce
    realignement, le premier INSERT normal de l'application entrerait en
    collision avec un id deja repris de SQLite."""
    with engine_dest.connect() as connexion:
        with connexion.begin():
            for modele in ORDRE:
                table = modele.__tablename__
                connexion.execute(text(
                    "SELECT setval("
                    "  pg_get_serial_sequence(:table, 'id'),"
                    "  COALESCE((SELECT MAX(id) FROM " + table + "), 1),"
                    "  (SELECT MAX(id) FROM " + table + ") IS NOT NULL"
                    ")"
                ), {"table": table})
    print("Sequences Postgres realignees sur MAX(id).")


def ecrire_enregistrement_genese(session_dest):
    if session_dest.query(AuditLog).first():
        print("audit_log non vide : enregistrement de genese deja present, rien a faire.")
        return
    maintenant = datetime.now(timezone.utc)
    payload = {
        "message": (
            "Demarrage du journal d'audit. La base existait deja depuis une "
            "semaine au moment de cette migration : les operations "
            "anterieures (partenaires valides, abondements, migration V1.0 "
            "du 2026-09-08) ne sont pas tracees dans ce journal, et ne sont "
            "pas reconstituees a posteriori. Voir docs/audit-log/note.md."
        ),
    }
    empreinte = compute_hash(
        GENESIS_PREV_HASH, maintenant, None, "system", "audit_genesis",
        None, None, payload, None,
    )
    session_dest.add(AuditLog(
        occurred_at=maintenant, actor_id=None, actor_role="system",
        action="audit_genesis", target_type=None, target_id=None,
        payload=payload, ip=None, prev_hash=GENESIS_PREV_HASH, hash=empreinte,
    ))
    session_dest.commit()
    print("Enregistrement de genese ecrit dans audit_log.")


def main():
    engine_source = create_engine(_source_uri())
    engine_dest = create_engine(_dest_uri())
    session_source = sessionmaker(bind=engine_source)()
    session_dest = sessionmaker(bind=engine_dest)()

    for modele in ORDRE:
        copier_table(modele, session_source, session_dest)

    session_source.close()
    reinitialiser_sequences(engine_dest)
    ecrire_enregistrement_genese(session_dest)
    session_dest.close()
    print("Migration terminee.")


if __name__ == "__main__":
    main()
