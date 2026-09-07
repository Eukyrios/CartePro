"""L'identite visuelle du site : couleurs, polices, logotype.

Une lecture publique et une ecriture reservee, au-dessus d'un fichier,
`backend/theme.json`. Le fichier est le magasin, pas une table : on ouvre
l'identite du site, on change une couleur, on recharge la page.

L'ecriture est venue apres : l'administration edite maintenant le theme depuis
`/parametres`, onglet Style, sans toucher au fichier ni au serveur. Le fichier
reste la source — ce que l'ecran enregistre, c'est lui — donc les deux voies
d'edition, l'editeur de texte et l'ecran, disent la meme chose.

Le fichier est relu **a chaque appel**, et c'est voulu : le mettre en cache
obligerait a redemarrer le serveur pour voir un changement, ce qui annule tout
l'interet. Un JSON de deux kilo-octets par chargement de page ne coute rien.

Les cles commencant par `_` sont des notes pour la personne qui edite le
fichier. Elles ne sortent pas par l'API : le front n'a pas a les recevoir, et
elles ne sont pas de la configuration.
"""
import json
import pathlib
import re

from flask import Blueprint, jsonify, request

from decorators import admin_required

theme_bp = Blueprint("theme", __name__)

FICHIER = pathlib.Path(__file__).resolve().parent.parent / "theme.json"

#: Ce que l'API accepte de servir. Une cle inconnue dans le fichier est
#: ignoree plutot que transmise : le front sait quoi faire de celles-ci, et
#: d'aucune autre.
COULEURS = (
    "page", "surface", "border", "fg", "muted", "ink",
    "accent", "official", "positive", "alert",
)


#: Une couleur CSS, et rien d'autre : trois ou six chiffres hexadecimaux.
#:
#: Le theme part dans une feuille de style — voir `themeToCss` cote front —
#: donc une valeur libre y entrerait telle quelle. Un `#fff; } body { ... }`
#: enregistre par un compte compromis reecrirait la page entiere. La forme est
#: donc verifiee ici, ou elle est ecrite, et pas seulement affichee.
HEX = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")

#: Ce qu'une pile de polices ne peut pas contenir. Meme raison que ci-dessus :
#: la valeur devient une declaration CSS, donc rien qui puisse la fermer.
POLICE_INTERDIT = re.compile(r"[;{}<>]")

#: La longueur d'un nom de marque et d'une pile de polices. Large, mais fini :
#: le fichier est relu a chaque appel de page.
MAX_NOM = 120
MAX_POLICE = 300


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


def _valider(recu):
    """Le theme propose, verifie cle par cle. Rend (theme, erreurs).

    Rien n'est ecrit si une seule valeur est refusee : un theme a moitie
    applique donnerait un site a moitie lisible, et l'ecran qui l'a envoye ne
    saurait pas laquelle de ses couleurs a pris.

    Une cle absente est acceptee et signifie « laisse la valeur compilee dans
    le CSS » — c'est la regle du fichier depuis le debut, l'ecran d'edition ne
    la change pas.
    """
    erreurs = []
    if not isinstance(recu, dict):
        return None, ["Le corps de la requete doit etre un objet JSON."]

    nom = (recu.get("brand") or {}).get("name")
    if nom is not None:
        if not isinstance(nom, str) or not nom.strip():
            erreurs.append("brand.name : un nom non vide est attendu.")
        elif len(nom.strip()) > MAX_NOM:
            erreurs.append(f"brand.name : {MAX_NOM} caracteres au plus.")

    polices = recu.get("fonts") or {}
    for cle in ("sans", "serif"):
        valeur = polices.get(cle)
        if valeur is None:
            continue
        if not isinstance(valeur, str) or not valeur.strip():
            erreurs.append(f"fonts.{cle} : une pile de polices est attendue.")
        elif len(valeur) > MAX_POLICE:
            erreurs.append(f"fonts.{cle} : {MAX_POLICE} caracteres au plus.")
        elif POLICE_INTERDIT.search(valeur):
            erreurs.append(
                f"fonts.{cle} : les caracteres ; {{ }} < > ne sont pas admis."
            )

    couleurs = recu.get("colors") or {}
    for theme in ("light", "dark"):
        groupe = couleurs.get(theme) or {}
        if not isinstance(groupe, dict):
            erreurs.append(f"colors.{theme} : un objet est attendu.")
            continue
        for cle, valeur in groupe.items():
            if cle not in COULEURS:
                erreurs.append(f"colors.{theme}.{cle} : couleur inconnue.")
            elif not isinstance(valeur, str) or not HEX.match(valeur.strip()):
                erreurs.append(
                    f"colors.{theme}.{cle} : un hexadecimal comme #4a1b6b est attendu."
                )

    if erreurs:
        return None, erreurs
    return recu, []


def _fusionner(fichier, recu):
    """Le theme recu, pose sur le fichier tel qu'il est.

    Une fusion et non un remplacement, pour garder les cles en `_` : le fichier
    porte son propre mode d'emploi — `_lisez_moi`, `_note` — ecrit pour la
    personne qui l'ouvre dans un editeur. Un PUT qui reecrirait l'objet entier
    l'effacerait au premier enregistrement fait depuis l'ecran.
    """
    sortie = dict(fichier)

    if "brand" in recu:
        marque = dict(sortie.get("brand") or {})
        marque.update(
            {c: v.strip() for c, v in recu["brand"].items() if c == "name"}
        )
        sortie["brand"] = marque

    if "fonts" in recu:
        polices = dict(sortie.get("fonts") or {})
        polices.update(
            {c: v.strip() for c, v in recu["fonts"].items() if c in ("sans", "serif")}
        )
        sortie["fonts"] = polices

    if "colors" in recu:
        couleurs = dict(sortie.get("colors") or {})
        for theme in ("light", "dark"):
            if theme not in recu["colors"]:
                continue
            groupe = dict(couleurs.get(theme) or {})
            groupe.update(
                {c: v.strip().lower() for c, v in recu["colors"][theme].items()}
            )
            couleurs[theme] = groupe
        sortie["colors"] = couleurs

    return sortie


@theme_bp.route("", methods=["PUT"])
@theme_bp.route("/", methods=["PUT"])
@admin_required
def ecrire_theme():
    """L'identite visuelle, enregistree. **Reserve a l'administration.**

    Ce que l'ecran envoie est verifie, fusionne avec le fichier, puis ecrit
    d'un bloc. La reponse est le theme relu depuis le disque et non celui qu'on
    vient de recevoir : l'ecran voit ainsi ce que le site servira reellement,
    nettoye des cles qu'il n'a pas a connaitre.
    """
    theme, erreurs = _valider(request.get_json(silent=True))
    if erreurs:
        return jsonify({"error": erreurs[0], "errors": erreurs}), 400

    try:
        brut = json.loads(FICHIER.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        brut = {}

    fusionne = _fusionner(brut, theme)
    try:
        FICHIER.write_text(
            json.dumps(fusionne, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    except OSError:
        return jsonify({"error": "Le theme n'a pas pu etre enregistre."}), 500

    return jsonify(lire_theme()), 200
