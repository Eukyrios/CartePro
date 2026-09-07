"""L'identite visuelle du site : couleurs, polices, logotype.

Une route de lecture au-dessus d'un fichier, `backend/theme.json`. Le fichier
est le magasin, pas une table : on veut pouvoir ouvrir l'identite du site,
changer une couleur et recharger la page. Une table demanderait un ecran
d'administration pour la meme chose, et ce n'est pas ce qui manque le plus a ce
demonstrateur.

Le fichier est relu **a chaque appel**, et c'est voulu : le mettre en cache
obligerait a redemarrer le serveur pour voir un changement, ce qui annule tout
l'interet. Un JSON de deux kilo-octets par chargement de page ne coute rien.

Les cles commencant par `_` sont des notes pour la personne qui edite le
fichier. Elles ne sortent pas par l'API : le front n'a pas a les recevoir, et
elles ne sont pas de la configuration.
"""
import json
import pathlib

from flask import Blueprint, jsonify

theme_bp = Blueprint("theme", __name__)

FICHIER = pathlib.Path(__file__).resolve().parent.parent / "theme.json"

#: Ce que l'API accepte de servir. Une cle inconnue dans le fichier est
#: ignoree plutot que transmise : le front sait quoi faire de celles-ci, et
#: d'aucune autre.
COULEURS = (
    "page", "surface", "border", "fg", "muted", "ink",
    "accent", "official", "positive", "alert",
)


def _sans_notes(valeur):
    """Retire les cles de commentaire, a tous les niveaux."""
    if isinstance(valeur, dict):
        return {
            cle: _sans_notes(v)
            for cle, v in valeur.items()
            if not cle.startswith("_")
        }
    return valeur


def _chaines(source, cles):
    """Les seules cles attendues, et seulement si elles portent du texte."""
    if not isinstance(source, dict):
        return {}
    return {
        cle: source[cle].strip()
        for cle in cles
        if isinstance(source.get(cle), str) and source[cle].strip()
    }


def lire_theme():
    """Le theme, nettoye. Un fichier absent ou casse rend un theme vide.

    Vide est une reponse valable : le front retombe alors sur les valeurs
    compilees dans son CSS. Une identite visuelle ne doit pas pouvoir empecher
    le site de s'afficher — c'est pourquoi rien ici ne leve.
    """
    try:
        brut = json.loads(FICHIER.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"brand": {}, "fonts": {}, "colors": {"light": {}, "dark": {}}}

    brut = _sans_notes(brut)
    couleurs = brut.get("colors") or {}
    return {
        "brand": _chaines(brut.get("brand"), ("name", "logo", "logoWhite")),
        "fonts": _chaines(brut.get("fonts"), ("sans", "serif")),
        "colors": {
            "light": _chaines(couleurs.get("light"), COULEURS),
            "dark": _chaines(couleurs.get("dark"), COULEURS),
        },
    }


@theme_bp.route("", methods=["GET"])
@theme_bp.route("/", methods=["GET"])
def theme():
    return jsonify(lire_theme()), 200
