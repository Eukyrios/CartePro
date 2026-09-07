#!/usr/bin/env python3
"""Mesure les contrastes réellement utilisés par l'interface CartePro.

Les couleurs ne sont pas recopiées : elles sont lues dans
frontend/app/globals.css, le fichier unique où la palette est déclarée. Le
ratio suit WCAG 2.1 (luminance relative, seuils 4.5:1 texte courant, 3:1 texte
large et composants d'interface).

    python3 tools/contrast.py            # tableau lisible
    python3 tools/contrast.py --json     # pour le brand book
"""
import json
import pathlib
import re
import sys

CSS = pathlib.Path(__file__).resolve().parent.parent / "frontend/app/globals.css"


def tokens(block: str) -> dict[str, str]:
    """Les --tokens d'un bloc, résolus quand ils pointent l'un vers l'autre."""
    raw = dict(re.findall(r"(--[\w-]+):\s*([^;]+);", block))
    out = {}
    for name, value in raw.items():
        seen = 0
        while (m := re.fullmatch(r"var\((--[\w-]+)\)", value.strip())) and seen < 8:
            value = raw.get(m.group(1), value)
            seen += 1
        value = value.strip()
        if re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            out[name] = value.lower()
    return out


def read_palette():
    css = CSS.read_text()
    root = re.search(r"\n:root\s*\{(.*?)\n\}", css, re.S).group(1)
    dark = re.search(r"\n\.dark\s*\{(.*?)\n\}", css, re.S).group(1)
    theme = re.search(r"@theme\s*\{(.*?)\n\}", css, re.S).group(1)
    # Le blanc et le noir sont des valeurs Tailwind, pas des tokens déclarés :
    # sans elles, les couples « blanc sur violet de marque » — la carte, le
    # bloc Confiance, le pied de page — sortiraient du tableau.
    base = {"--color-white": "#ffffff", "--color-black": "#000000"} | tokens(theme)
    light = base | tokens(root)
    return light, light | tokens(dark)


def luminance(hex_colour: str) -> float:
    r, g, b = (int(hex_colour[i : i + 2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(fg: str, bg: str) -> float:
    a, b = luminance(fg), luminance(bg)
    return round((max(a, b) + 0.05) / (min(a, b) + 0.05), 2)


# Chaque couple est un usage réel, avec l'endroit où il se vérifie.
PAIRS = [
    ("Texte courant sur la page", "--cp-fg", "--cp-page", "corps de page", "AA"),
    ("Texte secondaire sur la page", "--cp-muted", "--cp-page", "adresses, aides de saisie", "AA"),
    ("Texte courant sur panneau", "--cp-fg", "--cp-surface", "panneau de la carte", "AA"),
    ("Accent de marque sur la page", "--cp-accent", "--cp-page", "libellés, liens, chiffres", "AA"),
    ("Accent de marque sur panneau", "--cp-accent", "--cp-surface", "étiquette « une carte »", "AA"),
    ("Ochre officiel sur la page", "--cp-official", "--cp-page", "mention de simulation", "AA"),
    ("Teal confirmé sur la page", "--cp-positive", "--cp-page", "crédits de l'historique", "AA"),
    ("Alerte prune sur la page", "--cp-alert", "--cp-page", "refus de paiement", "AA"),
    ("Alerte prune sur panneau", "--cp-alert", "--cp-surface", "refus dans un encart", "AA"),
    ("Blanc sur violet de marque", "--color-white", "--color-primary-700", "bloc « Confiance », carte", "AA"),
    ("Blanc sur violet foncé", "--color-white", "--color-primary-600", "bloc « Confiance » en thème sombre", "AA"),
    ("Bordure d'interface sur la page", "--cp-border", "--cp-page", "règles et cadres", "3:1"),
    ("Texte sur pied de page", "--color-white", "--cp-ink", "pied de page", "AA"),
]


def rows():
    light, dark = read_palette()
    for label, fg, bg, where, target in PAIRS:
        for theme, palette in (("clair", light), ("sombre", dark)):
            if fg not in palette or bg not in palette:
                continue
            r = ratio(palette[fg], palette[bg])
            floor = 4.5 if target == "AA" else 3.0
            yield {
                "usage": label,
                "theme": theme,
                "fg": palette[fg],
                "bg": palette[bg],
                "fg_token": fg,
                "bg_token": bg,
                "ratio": r,
                "seuil": floor,
                "conforme": r >= floor,
                "ou": where,
            }


if __name__ == "__main__":
    data = list(rows())
    if "--json" in sys.argv:
        print(json.dumps(data, ensure_ascii=False, indent=1))
    else:
        fails = 0
        print(f"{'usage':34} {'thème':7} {'avant':8} {'fond':8} {'ratio':>7}  seuil  verdict")
        for d in data:
            verdict = "conforme" if d["conforme"] else "SOUS LE SEUIL"
            fails += not d["conforme"]
            print(f"{d['usage'][:34]:34} {d['theme']:7} {d['fg']:8} {d['bg']:8} {d['ratio']:>7}  {d['seuil']:<5}  {verdict}")
        print(f"\n{len(data)} couples mesurés, {fails} sous le seuil.")
