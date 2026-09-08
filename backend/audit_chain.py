"""Le calcul du chainage d'integrite du journal d'audit.

Sans dependance a Flask ni a la base : c'est le meme code qui ecrit une ligne
(`services/audit_service.py`, dans l'application) et qui verifie un export
(`verify_audit.py`, en ligne de commande, sans base). Les deux ne peuvent pas
diverger silencieusement puisqu'ils appellent la meme fonction.

Ordre documente des champs concatenes avant hachage SHA-256, chacun separe par
le caractere « unit separator » (0x1F, absent de tout texte usuel) :

    prev_hash | occurred_at (ISO 8601, UTC, milliseconde) | actor_id
    | actor_role | action | target_type | target_id
    | payload (JSON canonique : cles triees, sans espace) | ip

`id` n'entre pas dans le calcul. C'est un detail de stockage attribue par la
base *apres* l'ecriture (SERIAL/AUTOINCREMENT) : l'inclure creerait une
dependance circulaire (il faudrait connaitre l'id pour calculer le hash, et
l'ecrire pour connaitre l'id). La chaine n'en a pas besoin pour etre verifiee :
seul l'ordre d'insertion compte, et cet ordre est verifie separement par la
continuite des `id` (voir `verify_audit.py`, qui detecte une suppression a la
rupture de sequence, distincte d'une alteration de contenu).
"""
import hashlib
import json
from datetime import timezone

GENESIS_PREV_HASH = "0" * 64
FIELD_SEPARATOR = "\x1f"


def canonical_payload(payload):
    """Serialisation JSON deterministe : memes octets a l'ecriture et a la verification."""
    if isinstance(payload, str):
        return payload
    return json.dumps(
        payload or {}, sort_keys=True, separators=(",", ":"), default=str, ensure_ascii=False
    )


def occurred_at_iso(occurred_at):
    """UTC, precision milliseconde, que l'entree vienne d'un datetime ou d'une chaine deja canonique."""
    if isinstance(occurred_at, str):
        return occurred_at
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)
    return occurred_at.astimezone(timezone.utc).isoformat(timespec="milliseconds")


def compute_hash(prev_hash, occurred_at, actor_id, actor_role, action, target_type, target_id, payload, ip):
    fields = [
        prev_hash or GENESIS_PREV_HASH,
        occurred_at_iso(occurred_at),
        actor_id or "",
        actor_role or "",
        action or "",
        target_type or "",
        target_id or "",
        canonical_payload(payload),
        ip or "",
    ]
    return hashlib.sha256(FIELD_SEPARATOR.join(fields).encode("utf-8")).hexdigest()
