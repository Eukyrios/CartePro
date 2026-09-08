"""L'API de lecture du journal d'audit : `GET /api/v1/admin/audit` et son export signe.

Reservee au role admin, comme le reste de l'administration (`decorators.py`).
Ne modifie jamais la table : c'est une route de lecture sur une table qui n'en
accepte de toute facon pas d'autre depuis l'utilisateur applicatif (voir
`provision_postgres.py`).
"""
import hashlib
import hmac
import json
import os
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from audit_chain import GENESIS_PREV_HASH
from decorators import admin_required
from models import AuditLog

audit_bp = Blueprint('audit', __name__)

#: Le nombre maximal d'enregistrements dans un export.
#:
#: Au-dela, la route refuse et demande une periode. Elle ne tronque pas, et
#: c'est le point : un export tronque porterait quand meme une signature valide
#: et un `chainDigest` coherent, donc il se verifierait sans erreur tout en
#: taisant des lignes. Refuser dit la verite ; tronquer mentirait bien.
PLAFOND_EXPORT = 50_000


def _parse_dt(brut):
    """Une date ISO 8601 (« 2026-09-08 » ou « 2026-09-08T10:00:00+00:00 »), ou None si absente/invalide."""
    if not brut:
        return None
    try:
        return datetime.fromisoformat(brut.replace("Z", "+00:00"))
    except ValueError:
        return None


def _occurred_at_iso(occurred_at):
    """UTC, precision milliseconde. `occurred_at` revient toujours naif de la
    base (colonne sans fuseau, valable sur SQLite comme sur Postgres) mais a
    toujours ete ecrit en UTC — voir `models.AuditLog.occurred_at`."""
    if occurred_at is None:
        return None
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)
    return occurred_at.astimezone(timezone.utc).isoformat(timespec="milliseconds")


def _serialiser(entree):
    return {
        "id": entree.id,
        "occurredAt": _occurred_at_iso(entree.occurred_at),
        "actorId": entree.actor_id,
        "actorRole": entree.actor_role,
        "action": entree.action,
        "targetType": entree.target_type,
        "targetId": entree.target_id,
        "payload": entree.payload,
        "ip": entree.ip,
        "prevHash": entree.prev_hash,
        "hash": entree.hash,
    }


def _filtrer(query):
    depuis = _parse_dt(request.args.get('depuis'))
    jusque = _parse_dt(request.args.get('jusque'))
    acteur = (request.args.get('acteur') or '').strip()
    action = (request.args.get('action') or '').strip()

    if depuis:
        query = query.filter(AuditLog.occurred_at >= depuis)
    if jusque:
        query = query.filter(AuditLog.occurred_at <= jusque)
    if acteur:
        query = query.filter(AuditLog.actor_id == acteur)
    if action:
        query = query.filter(AuditLog.action == action)
    return query, depuis, jusque


@audit_bp.route('/audit', methods=['GET'])
@admin_required
def lister_audit():
    """Le journal, filtrable par date (`depuis`, `jusque`), acteur (`acteur`) et action (`action`), pagine."""
    query, _, _ = _filtrer(AuditLog.query)

    try:
        page = max(int(request.args.get('page', 1)), 1)
    except (TypeError, ValueError):
        page = 1
    try:
        par_page = min(max(int(request.args.get('parPage', 50)), 1), 200)
    except (TypeError, ValueError):
        par_page = 50

    total = query.count()
    lignes = (
        query.order_by(AuditLog.id.asc())
        .offset((page - 1) * par_page)
        .limit(par_page)
        .all()
    )

    return jsonify({
        "entries": [_serialiser(e) for e in lignes],
        "page": page,
        "parPage": par_page,
        "total": total,
    }), 200


def _cle_hmac():
    cle = os.environ.get("AUDIT_EXPORT_HMAC_KEY")
    if not cle:
        raise RuntimeError(
            "AUDIT_EXPORT_HMAC_KEY absente de l'environnement : voir backend/.env.example."
        )
    return cle.encode("utf-8")


def signer_export(export_sans_signature):
    """La signature d'un export : HMAC-SHA256 sur sa serialisation JSON canonique.

    `verify_audit.py` doit reproduire exactement cette serialisation pour
    verifier la signature sans se connecter a la base — d'ou `sort_keys` et
    des separateurs sans espace, qui rendent la serialisation independante de
    la maniere dont l'export a ensuite ete reecrit sur disque.
    """
    corps = json.dumps(
        export_sans_signature, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )
    return hmac.new(_cle_hmac(), corps.encode("utf-8"), hashlib.sha256).hexdigest()


@audit_bp.route('/audit/export', methods=['GET'])
@admin_required
def exporter_audit():
    """Un export JSON signe de la periode demandee (`depuis`, `jusque`), avec le condense de la chaine.

    Le controleur verifie l'integrite avec `verify_audit.py`, ce fichier, et
    la cle — sans jamais se connecter a la base : c'est la base elle-meme qui
    est soupconnee en cas d'alteration.
    """
    query, depuis, jusque = _filtrer(AuditLog.query)

    combien = query.count()
    if combien > PLAFOND_EXPORT:
        # 422 : la requete est bien formee, c'est son contenu qui ne permet pas
        # de repondre — la convention du depot pour ce cas.
        return jsonify({
            "error": (
                f"{combien} enregistrements demandes, au-dela du plafond de "
                f"{PLAFOND_EXPORT} par export. Restreignez la periode avec "
                "« depuis » et « jusque » : un export tronque porterait une "
                "signature valide en taisant des lignes."
            )
        }), 422

    lignes = query.order_by(AuditLog.id.asc()).all()
    entries = [_serialiser(e) for e in lignes]

    export = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
        "range": {
            "from": depuis.isoformat() if depuis else None,
            "to": jusque.isoformat() if jusque else None,
        },
        "count": len(entries),
        "chainDigest": lignes[-1].hash if lignes else GENESIS_PREV_HASH,
        "entries": entries,
    }

    try:
        export["signature"] = signer_export(export)
    except RuntimeError as erreur:
        return jsonify({"error": str(erreur)}), 500

    return jsonify(export), 200
