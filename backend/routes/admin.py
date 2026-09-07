from decimal import Decimal

from flask import Blueprint, jsonify, request, Response

from decorators import admin_required
from models import FeaturedPick, Transaction, User, db
from services.csv_service import generate_transactions_csv

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/transactions.csv', methods=['GET'])
@admin_required
def export_transactions_csv():
    csv_data = generate_transactions_csv()

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=transactions.csv"}
    )


# --- Demandes pour devenir partenaire ---
#
# Une inscription partenaire crée un compte `role="partenaire"` mais
# `is_active=False` (voir `auth.py`) : il ne peut pas se connecter tant qu'un
# admin ne l'a pas approuvé ici. Refuser une demande réutilise la suppression
# déjà en place dans `routes/partenaires.py` (`DELETE
# /api/partenaires/admin/supprimer/<id>`), qui s'applique aussi bien à un
# compte en attente qu'à un compte actif.

def _serialize_request(user):
    data = user.partner_data if isinstance(user.partner_data, dict) else {}
    return {
        "id": user.id,
        "nom": user.company_name or user.username,
        "email": user.email,
        "secteur": data.get("secteur", ""),
        "adresse": data.get("adresse", ""),
        "ville": data.get("ville", ""),
        "codePostal": data.get("codePostal", ""),
        "demandeLe": user.created_at.isoformat() if user.created_at else None,
    }


@admin_bp.route('/partenaires/demandes', methods=['GET'])
@admin_required
def lister_demandes_partenaires():
    demandes = User.query.filter_by(role='partenaire', is_active=False).order_by(User.created_at.asc()).all()
    return jsonify({"demandes": [_serialize_request(u) for u in demandes]}), 200


@admin_bp.route('/partenaires/<int:partenaire_id>/approuver', methods=['POST'])
@admin_required
def approuver_partenaire(partenaire_id):
    partenaire = User.query.get(partenaire_id)
    if not partenaire or partenaire.role != 'partenaire':
        return jsonify({"error": "Demande introuvable."}), 404
    if partenaire.is_active:
        return jsonify({"error": "Ce compte est déjà actif."}), 409

    partenaire.is_active = True
    db.session.commit()
    return jsonify({"message": f"{partenaire.company_name or partenaire.username} est maintenant un partenaire actif."}), 200


# --- Liste des partenaires actifs, pour les deux sections ci-dessous ---

@admin_bp.route('/partenaires', methods=['GET'])
@admin_required
def lister_partenaires_actifs():
    partenaires = User.query.filter_by(role='partenaire', is_active=True).order_by(User.company_name.asc()).all()
    return jsonify({
        "partenaires": [
            {
                "id": p.id,
                "nom": p.company_name or p.username,
                "secteur": (p.partner_data or {}).get("secteur", ""),
                "ville": (p.partner_data or {}).get("ville", ""),
            }
            for p in partenaires
        ]
    }), 200


# --- Coup de cœur du Ministre : historique, création, réactivation ---
#
# Une ligne par choix (voir `models.FeaturedPick`) plutôt qu'un simple
# booléen sur le partenaire : changer de coup de cœur ajoute une ligne au
# lieu d'en écraser une, ce qui garde l'historique et permet de réactiver un
# choix précédent — exactement ce que demande cette section.

def _serialize_pick(pick):
    return {
        "id": pick.id,
        "partenaireId": pick.partner_id,
        "partenaireNom": pick.partner.company_name or pick.partner.username if pick.partner else "Partenaire supprimé",
        "commentaire": pick.comment,
        "actif": pick.active,
        "clics": pick.click_count,
        "creeLe": pick.created_at.isoformat() if pick.created_at else None,
    }


@admin_bp.route('/coup-de-coeur', methods=['GET'])
@admin_required
def lister_coup_de_coeur():
    picks = FeaturedPick.query.order_by(FeaturedPick.created_at.desc()).all()
    return jsonify({"choix": [_serialize_pick(p) for p in picks]}), 200


@admin_bp.route('/coup-de-coeur', methods=['POST'])
@admin_required
def creer_coup_de_coeur():
    data = request.get_json(silent=True) or {}
    partenaire_id = data.get("partenaireId")
    comment = (data.get("commentaire") or "").strip()

    if not partenaire_id:
        return jsonify({"error": "Un partenaire est requis."}), 400
    partenaire = User.query.filter_by(id=partenaire_id, role='partenaire', is_active=True).first()
    if not partenaire:
        return jsonify({"error": "Partenaire introuvable."}), 404

    # Un seul choix actif à la fois : celui-ci le devient, les autres cessent
    # de l'être — sans jamais toucher aux lignes existantes autrement que sur
    # ce booléen.
    FeaturedPick.query.filter_by(active=True).update({"active": False})
    pick = FeaturedPick(partner_id=partenaire.id, comment=comment, active=True)
    db.session.add(pick)
    db.session.commit()
    return jsonify({"choix": _serialize_pick(pick)}), 201


@admin_bp.route('/coup-de-coeur/<int:pick_id>/activer', methods=['POST'])
@admin_required
def activer_coup_de_coeur(pick_id):
    pick = FeaturedPick.query.get(pick_id)
    if not pick:
        return jsonify({"error": "Choix introuvable."}), 404

    FeaturedPick.query.filter_by(active=True).update({"active": False})
    pick.active = True
    db.session.commit()
    return jsonify({"choix": _serialize_pick(pick)}), 200


# --- Historique de paiement d'un partenaire, et contre-passation ---
#
# Une transaction validée est immuable dès qu'elle existe (voir les triggers
# `before_update`/`before_delete` dans `models.py`) — "annuler" n'y touche
# donc jamais. Ça insère une transaction inverse, de statut "remboursement",
# qui recrédite le salarié et reprend au partenaire, et qui référence
# l'originale via `reverses_transaction_id`. L'originale reste lisible telle
# quelle : c'est la ligne comptable qui corrige, jamais celle qu'on corrige.

def _serialize_transaction(transaction, reversed_ids):
    return {
        "id": transaction.id,
        "date": transaction.date.isoformat() if transaction.date else None,
        "montantCents": round(transaction.montant * 100),
        "salarie": transaction.salarie.username if transaction.salarie else "Salarié supprimé",
        "statut": transaction.statut,
        "estRemboursement": transaction.reverses_transaction_id is not None,
        "rembourse": transaction.id in reversed_ids,
    }


@admin_bp.route('/partenaires/<int:partenaire_id>/transactions', methods=['GET'])
@admin_required
def historique_paiements_partenaire(partenaire_id):
    partenaire = User.query.get(partenaire_id)
    if not partenaire or partenaire.role != 'partenaire':
        return jsonify({"error": "Partenaire introuvable."}), 404

    transactions = (
        Transaction.query.filter_by(partenaire_id=partenaire_id)
        .order_by(Transaction.date.desc())
        .all()
    )
    reversed_ids = {
        t.reverses_transaction_id
        for t in transactions
        if t.reverses_transaction_id is not None
    }
    return jsonify({
        "transactions": [_serialize_transaction(t, reversed_ids) for t in transactions],
    }), 200


@admin_bp.route('/transactions/<int:transaction_id>/annuler', methods=['POST'])
@admin_required
def annuler_transaction_forcee(transaction_id):
    original = db.session.query(Transaction).with_for_update().filter_by(id=transaction_id).first()
    if not original:
        return jsonify({"error": "Transaction introuvable."}), 404
    if original.statut != "validee" or original.reverses_transaction_id is not None:
        return jsonify({"error": "Seule une transaction validée, non déjà un remboursement, peut être annulée."}), 400
    if Transaction.query.filter_by(reverses_transaction_id=original.id).first():
        return jsonify({"error": "Cette transaction a déjà été annulée."}), 409

    salarie = db.session.query(User).with_for_update().filter_by(id=original.salarie_id).first()
    partenaire = db.session.query(User).with_for_update().filter_by(id=original.partenaire_id).first()
    montant = Decimal(str(original.montant))

    if Decimal(str(partenaire.solde)) < montant:
        db.session.rollback()
        return jsonify({"error": "Solde du partenaire insuffisant pour reprendre ce montant."}), 400

    salarie.solde = round(float(Decimal(str(salarie.solde)) + montant), 2)
    partenaire.solde = round(float(Decimal(str(partenaire.solde)) - montant), 2)

    remboursement = Transaction(
        salarie_id=original.salarie_id,
        partenaire_id=original.partenaire_id,
        montant=original.montant,
        statut="remboursement",
        reverses_transaction_id=original.id,
    )
    db.session.add(remboursement)
    db.session.commit()

    return jsonify({
        "message": f"Transaction {transaction_id} annulée : {original.montant} € recrédités au salarié.",
        "remboursementId": remboursement.id,
    }), 200
