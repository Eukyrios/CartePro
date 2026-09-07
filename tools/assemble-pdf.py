#!/usr/bin/env python3
"""Assemble les pages capturées en un seul PDF A4.

Le PDF est fait d'images de pages, et non de texte : Marianne porte
fsType=4 — « Preview & Print » — et Chrome refuse d'embarquer une police ainsi
restreinte dans un PDF, la remplaçant en silence par une Liberation Sans. Le
book afficherait alors une typographie que ses propres règles interdisent.
Photographier la page rend exactement l'usage que la licence autorise.

Conséquence assumée : le texte n'est pas sélectionnable. Elle est consignée
dans la note d'omissions du book.
"""
import pathlib
import sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = sorted((ROOT / "docs/brand-book/pages").glob("page-*.png"))
OUT = ROOT / "docs/brand-book/cartepro-brand-book.pdf"

# Les captures sont à 2× la taille CSS : 96 dpi × 2.
DPI = 192

if not PAGES:
    sys.exit("aucune page dans docs/brand-book/pages — lancer tools/shots.js d'abord")

images = []
for p in PAGES:
    im = Image.open(p)
    if im.mode != "RGB":
        im = im.convert("RGB")
    images.append(im)

first, rest = images[0], images[1:]
first.save(OUT, "PDF", save_all=True, append_images=rest, resolution=DPI)

mm = 25.4
w, h = first.size
print(f"{len(images)} pages -> {OUT.relative_to(ROOT)}")
print(f"  page 1 : {w}×{h} px à {DPI} dpi = {w / DPI * mm:.0f}×{h / DPI * mm:.0f} mm (A4 = 210×297)")
print(f"  poids  : {OUT.stat().st_size / 1024 / 1024:.2f} Mo")
