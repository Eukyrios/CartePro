"""Le point d'ecriture unique du journal d'audit.

Un seul appelant, `record_event`, plutot que vingt copies de calcul de hash
eparpillees dans les controleurs — c'est ce genre de copie qui finit par
diverger. Chaque route sensible l'appelle avec ses propres champs ; le calcul
du chainage lui-meme vit dans `audit_chain.py`, partage avec `verify_audit.py`.

Sur le commit : `record_event` n'en emet pas par defaut. La plupart des
appelants ont deja une ecriture metier a committer dans la meme transaction
(la decision d'instruction, la transaction validee, le compte modifie), et le
journal doit partager cette atomicite — soit les deux s'ecrivent, soit aucune.
Les quelques appelants qui n'ont rien d'autre a committer (une connexion
echouee, une transaction refusee avant toute ecriture metier) passent
`commit=True`.
"""
from datetime import datetime, timezone

from sqlalchemy import text

from audit_chain import GENESIS_PREV_HASH, compute_hash
from models import AuditLog, db

#: Cle arbitraire et fixe du verrou consultatif Postgres qui serialise les
#: ecritures de la chaine (voir plus bas). N'importe quel entier convient :
#: ce n'est pas un identifiant de ligne, juste un nom de verrou partage par
#: tous les appelants de `record_event`.
_CLE_VERROU_CHAINE = 725918


def record_event(
    action,
    actor_role,
    actor_id=None,
    target_type=None,
    target_id=None,
    payload=None,
    ip=None,
    occurred_at=None,
    commit=False,
):
    occurred_at = occurred_at or datetime.now(timezone.utc)
    actor_id = str(actor_id) if actor_id is not None else None
    target_id = str(target_id) if target_id is not None else None
    payload = payload or {}

    # Serialise les ecritures de la chaine : sans ca, deux requetes
    # concurrentes liraient la meme derniere ligne et calculeraient le meme
    # prev_hash, produisant deux enregistrements qui pretendent tous deux
    # suivre le meme predecesseur.
    #
    # Un `SELECT ... FOR UPDATE` sur audit_log ferait l'affaire — c'est la
    # premiere chose essayee ici — sauf qu'un verrou de ligne PostgreSQL
    # exige le privilege UPDATE sur la table, precisement celui que
    # `provision_postgres.py` revoque. Un verrou consultatif ne verrouille
    # aucune ligne ni aucune table : c'est un simple compteur nomme, que
    # n'importe quel role peut prendre sans droit particulier. Il se relache
    # tout seul a la fin de la transaction (`_xact_`).
    if db.session.bind is not None and db.session.bind.dialect.name == "postgresql":
        db.session.execute(text("SELECT pg_advisory_xact_lock(:cle)"), {"cle": _CLE_VERROU_CHAINE})

    dernier = db.session.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_hash = dernier.hash if dernier else GENESIS_PREV_HASH

    empreinte = compute_hash(
        prev_hash, occurred_at, actor_id, actor_role, action,
        target_type, target_id, payload, ip,
    )

    entree = AuditLog(
        occurred_at=occurred_at,
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        target_type=target_type,
        target_id=target_id,
        payload=payload,
        ip=ip,
        prev_hash=prev_hash,
        hash=empreinte,
    )
    db.session.add(entree)
    if commit:
        db.session.commit()
    return entree
