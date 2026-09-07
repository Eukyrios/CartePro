from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, jwt_required


def admin_required(fn):
    """Exige un JWT valide dont le claim `role` vaut "admin".

    Centralise le contrôle répété dans plusieurs routes (`if
    claims.get("role") != "admin": return 403`) pour qu'une route admin
    oubliée ne puisse plus rester accessible à n'importe qui.
    """

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        if get_jwt().get("role") != "admin":
            return jsonify({"error": "Accès refusé. Réservé aux administrateurs."}), 403
        return fn(*args, **kwargs)

    return wrapper
