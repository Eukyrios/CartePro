"""Quelle base, lue où, et pourquoi il y en a deux adresses.

Le dispositif tourne sur **Postgres**, et non plus sur SQLite : le journal
d'audit ne tient sa garantie d'ajout seul que d'un `REVOKE UPDATE, DELETE`
accordé à l'utilisateur applicatif, et SQLite n'a ni utilisateur ni privilège —
c'est un fichier, pas un serveur. Un chaînage d'empreintes se vérifie sur les
deux ; un privilège refusé ne s'obtient que sur le second.

D'où **deux connexions à la même base**, et il faut savoir laquelle on prend :

- `uri_application()` — le rôle `cartepro_app`. CRUD complet sur les tables
  métier, `SELECT` et `INSERT` seuls sur `audit_log`. C'est la connexion de
  chaque requête HTTP, et elle ne peut **pas** créer ni supprimer une table :
  sous Postgres, le propriétaire d'une table garde tous ses droits quoi que
  dise un REVOKE, donc l'application ne doit surtout pas être propriétaire de
  ce qu'elle écrit ;
- `uri_ddl()` — le superutilisateur, propriétaire des tables. Réservé à ce qui
  crée, supprime ou modifie le schéma : `provision_postgres.py`, `seed.py`
  (qui commence par un `drop_all()`), `migrer.py`. Jamais une route.

C'est aussi ici qu'on lit `.env`, et ça n'allait pas de soi : `app.py` ne
l'avait jamais fait — seul `config.py` appelait `load_dotenv()`, et personne
n'importe `config.py`. Un `.env` pouvait donc annoncer Postgres pendant que
l'application tournait sur SQLite sans que rien ne le dise.

`load_dotenv()` n'écrase pas une variable déjà posée dans l'environnement, et
c'est la propriété dont dépendent les tests : chacun pose sa propre
`TICKET_TOUT_DATABASE_URI` — un fichier SQLite temporaire — **avant**
`create_app()`, et elle gagne. La suite reste donc sur SQLite, où le chaînage
se vérifie tout aussi bien, sans exiger un serveur pour lancer `pytest`.
"""
import os
import pathlib

from dotenv import load_dotenv

# Le `.env` d'à côté, désigné par son chemin et non cherché depuis le
# répertoire courant : `load_dotenv()` sans argument remonte l'arborescence
# depuis le CWD, donc `python backend/app.py` lancé depuis la racine ne trouvait
# rien et l'application repartait sur SQLite en silence — alors que le même
# fichier lancé depuis `backend/` prenait Postgres. Deux bases pour une même
# commande, selon l'endroit d'où on l'appelle : c'est le genre d'écart qu'on ne
# soupçonne qu'après une heure.
load_dotenv(pathlib.Path(__file__).with_name(".env"))

#: La base de repli, quand rien n'est configuré.
#:
#: SQLite, et non une erreur : `pytest` et un poste sans Docker doivent pouvoir
#: lancer l'application. Ce qui exige Postgres, c'est la démonstration du
#: privilège refusé — pas le fait de servir une page.
REPLI_SQLITE = "sqlite:///app.db"


def uri_application():
    """L'adresse dont l'application se sert à chaque requête."""
    return os.environ.get("TICKET_TOUT_DATABASE_URI", REPLI_SQLITE)


def uri_ddl():
    """L'adresse à prendre pour créer, supprimer ou modifier des tables.

    Le superutilisateur s'il est configuré, sinon celle de l'application — sous
    SQLite les deux sont la même chose, et un poste sans Postgres doit rester
    utilisable.
    """
    return os.environ.get("AUDIT_DB_SUPERUSER_URI") or uri_application()
