#!/usr/bin/env python3
"""Fabrique le fond de carte des départements pour le tableau de bord.

    python3 tools/build-carte.py            # écrit frontend/public/carte/departements.json

Pourquoi un script plutôt qu'un fichier déposé une fois : l'asset est dérivé,
et un dérivé qu'on ne sait pas refabriquer devient intouchable. Ici la source,
la projection et le degré de simplification sont écrits, donc la carte se
regénère — plus fine, plus grossière, ou depuis un découpage à jour.

**Source** : france-geojson de Grégoire David, découpage des 96 départements
métropolitains, version simplifiée. Données issues d'OpenStreetMap et de
l'IGN, réutilisables librement. Rien n'est téléchargé à l'exécution de
l'application : ce script écrit un fichier, et l'application lit ce fichier.

**Projection** : conique conforme de Lambert, parallèles 44°N et 49°N — celle
qui donne à la France sa forme d'hexagone. Une équirectangulaire la couche,
une Mercator l'étire vers le nord.

**Ce que la carte ne porte pas** : l'outre-mer. Le découpage source s'arrête à
la métropole, et il n'y a pas de projection unique où La Réunion et le
Finistère tiennent ensemble à une échelle lisible. Les départements d'outre-mer
sont donc listés à part par l'écran, jamais posés au hasard sur le fond.
"""
import json
import math
import pathlib
import sys
import urllib.request

SOURCE = (
    "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/"
    "departements-version-simplifiee.geojson"
)
ROOT = pathlib.Path(__file__).resolve().parent.parent
DEST = ROOT / "frontend/public/carte/departements.json"

LARGEUR = 640.0      # unités de viewBox
TOLERANCE = 0.9      # simplification Douglas-Peucker, en unités de viewBox
AIRE_MINIMALE = 0.8  # sous ce seuil un anneau est un îlot : on le laisse

PHI1, PHI2, PHI0, LAMBDA0 = map(math.radians, (44.0, 49.0, 46.5, 3.0))


def lambert(lon, lat):
    """Longitude/latitude → plan, en conique conforme de Lambert."""
    phi, lam = math.radians(lat), math.radians(lon)
    t = lambda p: math.tan(math.pi / 4 + p / 2)
    n = math.log(math.cos(PHI1) / math.cos(PHI2)) / math.log(t(PHI2) / t(PHI1))
    f = math.cos(PHI1) * t(PHI1) ** n / n
    rho = f / t(phi) ** n
    rho0 = f / t(PHI0) ** n
    return (
        rho * math.sin(n * (lam - LAMBDA0)),
        rho0 - rho * math.cos(n * (lam - LAMBDA0)),
    )


def douglas_peucker(points, tol):
    """Simplifie un anneau en ne gardant que les sommets qui portent la forme."""
    if len(points) < 3:
        return points
    ax, ay = points[0]
    bx, by = points[-1]
    dx, dy = bx - ax, by - ay
    norme = math.hypot(dx, dy)
    pire, index = 0.0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        ecart = (
            math.hypot(px - ax, py - ay)
            if norme == 0
            else abs(dy * px - dx * py + bx * ay - by * ax) / norme
        )
        if ecart > pire:
            pire, index = ecart, i
    if pire <= tol:
        return [points[0], points[-1]]
    return (
        douglas_peucker(points[: index + 1], tol)[:-1]
        + douglas_peucker(points[index:], tol)
    )


def aire(points):
    total = 0.0
    for i, (x1, y1) in enumerate(points):
        x2, y2 = points[(i + 1) % len(points)]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2


def main():
    chemin = sys.argv[1] if len(sys.argv) > 1 else None
    if chemin:
        brut = json.load(open(chemin, encoding="utf-8"))
    else:
        print(f"Téléchargement de {SOURCE}")
        with urllib.request.urlopen(SOURCE, timeout=60) as reponse:
            brut = json.load(reponse)

    entites = []
    for f in brut["features"]:
        g = f["geometry"]
        anneaux = (
            list(g["coordinates"])
            if g["type"] == "Polygon"
            else [p[0] for p in g["coordinates"]]
        )
        entites.append(
            (
                f["properties"]["code"],
                f["properties"]["nom"],
                [[lambert(x, y) for x, y in r] for r in anneaux],
            )
        )

    # Un cadrage commun : chaque département est placé dans le même repère, ce
    # qui est toute la différence entre une carte et 96 dessins.
    xs = [p[0] for _, _, rr in entites for r in rr for p in r]
    ys = [p[1] for _, _, rr in entites for r in rr for p in r]
    echelle = LARGEUR / (max(xs) - min(xs))
    hauteur = (max(ys) - min(ys)) * echelle
    # y inversé : en SVG il descend, en géographie il monte.
    place = lambda p: ((p[0] - min(xs)) * echelle, (max(ys) - p[1]) * echelle)

    departements = []
    for code, nom, anneaux in entites:
        traces = []
        for anneau in anneaux:
            points = [place(p) for p in anneau]
            if aire(points) < AIRE_MINIMALE:
                continue
            simple = douglas_peucker(points, TOLERANCE)
            if len(simple) < 4:
                continue
            traces.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in simple) + "Z")
        if traces:
            departements.append({"code": code, "nom": nom, "d": "".join(traces)})

    departements.sort(key=lambda e: e["code"])
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(
        json.dumps(
            {
                "largeur": round(LARGEUR),
                "hauteur": round(hauteur),
                "source": "france-geojson (gregoiredavid) — OpenStreetMap / IGN",
                "departements": departements,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    octets = DEST.stat().st_size
    print(
        f"écrit {DEST.relative_to(ROOT)} — {len(departements)} départements, "
        f"{octets // 1024} Kio"
    )


if __name__ == "__main__":
    main()
