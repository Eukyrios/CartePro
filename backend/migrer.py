"""Met une base existante au niveau du schéma courant, sans la vider.

`seed.py` commence par un `db.drop_all()` : il fabrique un jeu de démonstration,
il ne migre rien. Et `db.create_all()`, appelé au démarrage, crée les tables qui
manquent mais **jamais** une colonne qui manque à une table qui existe. Entre
les deux, il n'y avait rien — donc une base déjà en service, avec des comptes
créés depuis l'interface, ne pouvait pas suivre une évolution du schéma
autrement qu'en étant détruite.

Ce script comble ce trou pour les trois ajouts de la gestion des comptes, du
tableau de bord et des abondements :

- `salaries.statut` — l'état du compte, « actif » pour l'existant ;
- `abondements.reference` — la clé d'idempotence des versements ;
- la table `mesures_compte` — l'historique motivé des mesures.

**Il est idempotent.** Il regarde ce qui est déjà là avant d'écrire, donc le
relancer deux fois ne fait rien la seconde fois et ne casse rien. Il n'efface
aucune ligne, ne modifie aucune écriture comptable, et ne désactive aucune
contrainte.

    python migrer.py            # applique ce qui manque
    python migrer.py --controle # dit ce qui manque, n'écrit rien
"""

import os
import sys

from sqlalchemy import inspect, text

from app import create_app
from db_uri import uri_ddl
from models import db

#: Les colonnes à ajouter, par table. Le type est écrit en SQL portable — un
#: VARCHAR et rien de plus : SQLAlchemy stocke une énumération Python comme le
#: **nom** de son membre, pas comme sa valeur, donc « actif » et non « actif »
#: accentué, et « cloture » et non « clôturé ».
COLONNES = {
    "salaries": [
        ("statut", "VARCHAR(9) NOT NULL DEFAULT 'actif'"),
    ],
    "abondements": [
        # Nullable : les abondements déjà en base n'ont pas de clé, et leur en
        # inventer une ne dirait rien de vrai. L'unicité est posée par un index
        # à part, plus bas, parce qu'un ALTER TABLE ADD COLUMN UNIQUE n'est pas
        # accepté par SQLite.
        ("reference", "VARCHAR(120)"),
    ],
}

#: Les index à poser après coup, par nom.
INDEX = {
    "ix_abondements_reference_unique": (
        "CREATE UNIQUE INDEX ix_abondements_reference_unique "
        "ON abondements (reference)"
    ),
}


def manquants(inspecteur):
    """Ce qui manque à la base, sans rien y écrire."""
    tables = set(inspecteur.get_table_names())

    colonnes = []
    for table, attendues in COLONNES.items():
        if table not in tables:
            # La table entière manque : `create_all` s'en charge, pas nous.
            continue
        presentes = {c["name"] for c in inspecteur.get_columns(table)}
        colonnes += [
            (table, nom, sql) for nom, sql in attendues if nom not in presentes
        ]

    index = []
    if "abondements" in tables:
        poses = {i["name"] for i in inspecteur.get_indexes("abondements")}
        index = [nom for nom in INDEX if nom not in poses]

    return {
        # Les tables ajoutées au schéma après la mise en service. `create_all`
        # les crée de toute façon au démarrage ; ce qui compte ici, c'est que
        # `--controle` les **nomme** — un contrôle qui n'en parle pas laisse
        # croire qu'une base est à niveau quand elle ne l'est pas.
        "tables": [
            t
            for t in ("mesures_compte", "partenaire_likes", "audit_log")
            if t not in tables
        ],
        "colonnes": colonnes,
        "index": index,
    }


def run_migration(controle=False):
    # En superutilisateur : migrer, c'est creer des tables et ajouter des
    # colonnes, et le role applicatif n'a pas ce droit sous Postgres — il ne
    # doit pas l'avoir, sinon le REVOKE sur `audit_log` ne voudrait plus rien
    # dire (le proprietaire garde tous ses droits). Voir `db_uri.py`. Sous
    # SQLite, les deux adresses sont la meme.
    os.environ["TICKET_TOUT_DATABASE_URI"] = uri_ddl()
    app = create_app()
    with app.app_context():
        inspecteur = inspect(db.engine)
        reste = manquants(inspecteur)

        if not any(reste.values()):
            print("OK Rien a migrer : la base est deja au niveau du schema.")
            return 0

        for table in reste["tables"]:
            print(f"  table manquante  : {table}")
        for table, nom, _ in reste["colonnes"]:
            print(f"  colonne manquante: {table}.{nom}")
        for nom in reste["index"]:
            print(f"  index manquant   : {nom}")

        if controle:
            print("\nControle seul, rien n'a ete ecrit. Relancer sans --controle.")
            return 1

        # 1. Les tables entierement nouvelles. `create_all` ne touche pas aux
        #    tables existantes, donc c'est sans risque pour le reste.
        if reste["tables"]:
            db.create_all()
            print(f"OK {len(reste['tables'])} table(s) creee(s).")

        # 2. Les colonnes, une par une, avec leur defaut : les lignes deja en
        #    base le recoivent, ce qui est exactement ce qu'on veut dire — un
        #    compte existant est un compte actif.
        with db.engine.begin() as connexion:
            for table, nom, sql in reste["colonnes"]:
                connexion.execute(text(f"ALTER TABLE {table} ADD COLUMN {nom} {sql}"))
                print(f"OK Colonne ajoutee : {table}.{nom}")
            for nom in reste["index"]:
                connexion.execute(text(INDEX[nom]))
                print(f"OK Index pose : {nom}")

        # 3. Relecture : on affirme le resultat apres l'avoir verifie.
        apres = manquants(inspect(db.engine))
        if any(apres.values()):
            print("\nECHEC Il manque encore quelque chose apres migration :", apres)
            return 2

        print("\nOK Base au niveau du schema. Aucune ligne effacee, aucune "
              "ecriture comptable modifiee.")
        return 0


if __name__ == "__main__":
    sys.exit(run_migration(controle="--controle" in sys.argv))
