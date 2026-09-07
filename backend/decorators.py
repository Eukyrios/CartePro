"""Les gardes des routes protegees.

Repris de la branche `front-homepage-admin`, ou le decorateur avait ete ecrit
pour la meme raison : le controle du role etait recopie a la main dans chaque
route (`if get_jwt().get("role") != "admin": return 403`), et une route
d'administration ajoutee sans la ligne restait ouverte a tout le monde. C'est
exactement ce qui etait arrive ici a `POST /api/admin/transactions/<id>/annuler`,
qui n'avait ni `@jwt_required` ni controle de role : n'importe qui pouvait
l'appeler.

Un decorateur ne peut pas etre oublie a moitie. Soit la route en porte un, soit
elle n'en porte pas, et l'absence se voit a la lecture.
"""

from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, jwt_required


def admin_required(fn):
    """Exige un jeton valide dont le claim `role` vaut "admin".

    Le claim est pose a l'emission du jeton — voir `auth.py`, qui appelle
    `accounts.role(compte)` — et vaut "admin" pour un compte de la table
    `admins`, "partenaire" pour un partenaire, "user" pour un salarie.

    `@jwt_required()` est applique en dessous, donc un appel sans jeton repond
    401 (« il manque une identite ») et un appel avec un jeton de salarie
    repond 403 (« cette identite ne suffit pas »). Les deux ne se confondent
    pas, et c'est utile a qui debogue.
    """

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        if get_jwt().get("role") != "admin":
            return jsonify({"error": "Accès refusé. Réservé aux administrateurs."}), 403
        return fn(*args, **kwargs)

    return wrapper
