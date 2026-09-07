from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta, timezone
import jwt
import qrcode
import io
import base64
import os
from flask_jwt_extended import get_jwt_identity, jwt_required
from accounts import compte_depuis_identite
from models import Salaries, db

salaries_bp = Blueprint('salaries', __name__)

# Durée de vie du QR de paiement : cinq minutes, comme la règle du
# démonstrateur — un code à usage unique qui traîne une demi-heure n'est plus
# un code à usage unique.
QR_TTL = timedelta(minutes=5)
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-en-dev")

@salaries_bp.route('/<int:user_id>/solde', methods=['GET'])
@jwt_required()
def get_solde_positif(user_id):
    # 1. On cherche le salarié dans la base de données
    salarie = db.session.get(Salaries, user_id)

    # 2. Et on vérifie que c'est bien le sien : l'identité du jeton porte
    # désormais le genre du compte — « salarie:3 » — donc la comparaison passe
    # par le compte résolu, pas par un entier nu.
    demandeur = compte_depuis_identite(get_jwt_identity())
    if not salarie or not isinstance(demandeur, Salaries) or demandeur.id != salarie.id:
        return jsonify({"status": "error", "message": "Utilisateur introuvable"}), 404

    # 3. On récupère son vrai solde
    solde_brut = salarie.solde 
    
    return jsonify({
        "status": "success",
        "solde_numerique": solde_brut,
        "affichage_positif": f"{solde_brut:.2f}€ à dépenser chez vos partenaires préférés !"
    }), 200

@salaries_bp.route('/paiement/qr', methods=['POST'])
@jwt_required()
def generer_qr_code():
    """Le jeton que le salarié présente. `user_id` reste sa clé primaire :
    c'est ce que `/api/transactions/valider` décode pour trouver qui paie."""
    salarie = compte_depuis_identite(get_jwt_identity())
    if not isinstance(salarie, Salaries):
        return jsonify({"status": "error", "message": "Seul un salarié émet un QR de paiement."}), 403
    user_id = salarie.id

    # Cinq minutes, et une seule date pour les deux usages : le jeton portait
    # 30 minutes, calculées deux fois — une fois pour la signature, une fois
    # pour la réponse. Deux appels à now() donnent deux instants, donc un
    # écran qui affiche une validité que le jeton ne respecte pas.
    expiration = datetime.now(timezone.utc) + QR_TTL
    payload = {"user_id": user_id, "exp": expiration}
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    
    # Génération de l'image
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(token)
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return jsonify({
        "status": "success",
        "qr_image_base64": qr_b64,
        "raw_token_for_testing": token,
        "expiration": expiration.isoformat()
    }), 201