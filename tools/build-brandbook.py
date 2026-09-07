#!/usr/bin/env python3
"""Assemble le brand book Ticket Tout en HTML paginé A4.

Le tableau de contrastes n'est pas saisi à la main : il est repris de
tools/contrast.py, qui lit lui-même la palette dans globals.css. Une valeur
changée dans le CSS traverse donc le book au prochain assemblage.

    python3 tools/build-brandbook.py            # écrit docs/brand-book/brand-book.html
"""
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "docs/brand-book/brand-book.html"

rows = json.loads(
    subprocess.run(
        ["python3", str(ROOT / "tools/contrast.py"), "--json"],
        capture_output=True, text=True, check=True,
    ).stdout
)

def table(theme):
    out = []
    for r in [x for x in rows if x["theme"] == theme]:
        verdict = "conforme" if r["conforme"] else "sous le seuil"
        cls = "ok" if r["conforme"] else "ko"
        out.append(
            f"<tr class='{cls}'><td>{r['usage']}</td><td class='ou'>{r['ou']}</td>"
            f"<td><span class='pastille' style='background:{r['fg']}'></span><code>{r['fg']}</code></td>"
            f"<td><span class='pastille' style='background:{r['bg']}'></span><code>{r['bg']}</code></td>"
            f"<td class='ratio'>{r['ratio']:.2f}:1</td><td>{r['seuil']:.1f}:1</td>"
            f"<td class='verdict'>{verdict}</td></tr>"
        )
    return "\n".join(out)

fails = [r for r in rows if not r["conforme"]]
n = len(rows)

HTML = f"""<!doctype html>
<html lang="fr">
<meta charset="utf-8" />
<title>Ticket Tout — brand book</title>
<style>
  @font-face {{ font-family: "Marianne"; font-weight: 400; src: url("../../frontend/public/fonts/Marianne-Regular.woff2") format("woff2"); }}
  @font-face {{ font-family: "Marianne"; font-weight: 500; src: url("../../frontend/public/fonts/Marianne-Medium.woff2") format("woff2"); }}
  @font-face {{ font-family: "Marianne"; font-weight: 700; src: url("../../frontend/public/fonts/Marianne-Bold.woff2") format("woff2"); }}
  @font-face {{ font-family: "Spectral"; font-weight: 400; src: url("../../frontend/public/fonts/Spectral-400-normal-latin.woff2") format("woff2"); }}
  @font-face {{ font-family: "Spectral"; font-weight: 400; font-style: italic; src: url("../../frontend/public/fonts/Spectral-400-italic-latin.woff2") format("woff2"); }}
  @font-face {{ font-family: "Spectral"; font-weight: 600; src: url("../../frontend/public/fonts/Spectral-600-normal-latin.woff2") format("woff2"); }}

  :root {{
    --bleu: #1b3a6b; --bleu-600: #2c527c; --bleu-300: #93aecd; --bleu-100: #dde5ef;
    --ochre: #7a571f; --teal: #1b6b67; --prune: #7c1d54;
    --papier: #f4f4f2; --encre: #0a0a0b; --gris: #555555; --filet: #d7d7d9;
  }}
  @page {{ size: A4; margin: 0; }}
  * {{ box-sizing: border-box; margin: 0; }}
  body {{ font-family: "Spectral", Georgia, serif; color: var(--encre); background: #fff; font-size: 10.5pt; line-height: 1.5; }}
  .page {{
    width: 210mm; height: 297mm; padding: 20mm 18mm 16mm; position: relative;
    page-break-after: always; break-after: page; overflow: hidden; display: flex; flex-direction: column;
  }}
  .page:last-child {{ page-break-after: auto; }}
  h1, h2, h3, .micro, th, .num {{ font-family: "Marianne", system-ui, sans-serif; }}
  h1 {{ font-size: 30pt; line-height: 0.92; letter-spacing: -0.03em; font-weight: 700; }}
  h2 {{ font-size: 18pt; line-height: 1; letter-spacing: -0.02em; font-weight: 700; margin-bottom: 4mm; }}
  h3 {{ font-size: 10pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin: 6mm 0 2mm; color: var(--bleu); }}
  p {{ margin-bottom: 3mm; max-width: 62ch; }}
  em {{ font-style: italic; }}
  .micro {{ font-size: 7.5pt; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }}
  .tete {{ display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid var(--encre); padding-bottom: 3mm; margin-bottom: 7mm; }}
  .tete .micro {{ color: var(--gris); }}
  .pied {{ margin-top: auto; padding-top: 4mm; border-top: 1px solid var(--filet); display: flex; justify-content: space-between; }}
  .pied .micro {{ color: var(--gris); font-size: 7pt; }}
  .regle {{ height: 2px; background: var(--encre); margin: 5mm 0; }}
  .encadre {{ border-left: 3px solid var(--bleu); background: var(--papier); padding: 4mm 5mm; margin: 4mm 0; }}
  .encadre.alerte {{ border-color: var(--prune); }}
  .encadre.ochre {{ border-color: var(--ochre); }}
  table {{ width: 100%; border-collapse: collapse; font-size: 8pt; }}
  th {{ text-align: left; font-size: 7pt; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 2px solid var(--encre); padding: 2mm 1.5mm; }}
  td {{ padding: 1.6mm 1.5mm; border-bottom: 1px solid var(--filet); vertical-align: middle; }}
  code {{ font-family: "Courier New", monospace; font-size: 7.5pt; }}
  .pastille {{ display: inline-block; width: 3.4mm; height: 3.4mm; border: 1px solid rgba(0,0,0,.25); vertical-align: -0.6mm; margin-right: 1.2mm; }}
  .ratio {{ font-family: "Marianne", sans-serif; font-weight: 700; }}
  tr.ko td {{ background: #fbeef5; }}
  tr.ko .verdict {{ color: var(--prune); font-weight: 700; }}
  .ou {{ color: var(--gris); }}
  figure {{ margin: 0; }}
  figure img {{ width: 100%; display: block; border: 1px solid var(--filet); }}
  figcaption {{ font-size: 7.5pt; color: var(--gris); margin-top: 2mm; }}
  .grille2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }}
  .grille3 {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }}
  .swatch {{ height: 26mm; display: flex; align-items: flex-end; padding: 2.5mm; color: #fff; }}
  .swatch.sombre {{ color: var(--encre); }}
  .swatch span {{ font-family: "Marianne", sans-serif; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.06em; }}
  ul {{ margin: 0 0 3mm 4mm; }}
  li {{ margin-bottom: 1.6mm; }}
  .interdit {{ border: 1px solid var(--filet); padding: 4mm; }}
  .interdit .micro {{ color: var(--prune); }}
  .couv {{ background: var(--bleu); color: #fff; justify-content: space-between; }}
  .couv h1 {{ font-size: 44pt; }}
  .couv .tete {{ border-color: rgba(255,255,255,.4); }}
  .couv .tete .micro, .couv .pied .micro {{ color: rgba(255,255,255,.75); }}
  .couv .pied {{ border-color: rgba(255,255,255,.3); }}
</style>

<!-- ============================ COUVERTURE ============================ -->
<section class="page couv">
  <div class="tete"><span class="micro">Administration</span><span class="micro">Document de travail</span></div>
  <div>
    <img src="../../frontend/public/logo/mark-white.svg" style="height:18mm" alt="Ticket Tout" />
    <h1 style="margin-top:12mm">Ticket&nbsp;Tout<br /><em style="font-family:Spectral,serif;font-weight:400;color:var(--bleu-300)">brand book applicable.</em></h1>
    <p style="margin-top:8mm;max-width:52ch;color:rgba(255,255,255,.86)">
      Règles d'usage de la marque « Ticket Tout » à l'intérieur de la charte
      ministérielle, chacune vérifiable dans l'application déjà développée :
      une valeur, un emplacement dans le code, ou une capture à l'appui.
    </p>
  </div>
  <div class="pied"><span class="micro">Démonstrateur — aucune valeur monétaire réelle</span><span class="micro">Page 1</span></div>
</section>

<!-- ============================ 1. LOGOTYPE ============================ -->
<section class="page">
  <div class="tete"><span class="micro">1 — Logotype</span><span class="micro">Ticket Tout</span></div>
  <h2>Le logotype et ses versions</h2>
  <p>
    Le logotype validé par l'administrateur est un cercle plein portant le mot-symbole
    en grotesque italique très grasse. Il est décliné ici en bleu institutionnel
    <code>#1B3A6B</code>. Les fichiers sources sont dans le dépôt, à
    <code>frontend/public/logo/</code>.
  </p>
  <div class="grille3" style="margin-top:5mm">
    <figure><div style="background:#fff;border:1px solid var(--filet);padding:6mm;display:grid;place-items:center;height:34mm"><img src="../../frontend/public/logo/mark-blue.svg" style="width:100%;border:0" alt="" /></div><figcaption><strong>Version principale</strong><br />mark-blue.svg — bleu #1B3A6B sur fond clair</figcaption></figure>
    <figure><div style="background:var(--bleu);padding:6mm;display:grid;place-items:center;height:34mm"><img src="../../frontend/public/logo/mark-white.svg" style="width:100%;border:0" alt="" /></div><figcaption><strong>Version monochrome</strong><br />mark-white.svg — réservé blanc sur fond bleu ou noir</figcaption></figure>
    <figure><div style="background:var(--papier);border:1px solid var(--filet);padding:6mm;display:grid;place-items:center;height:34mm"><img src="../../frontend/app/icon.svg" style="width:22mm;height:22mm;border:0" alt="" /></div><figcaption><strong>Version favicon</strong><br />app/icon.svg — 1081×1081, blanc sur pastille bleue</figcaption></figure>
  </div>
  <h3>Zone de protection et tailles minimales</h3>
  <p>
    Zone de protection : une marge égale à la hauteur du cercle du logotype, sur
    les quatre côtés, libre de tout texte, filet ou image. Dans l'application, le
    bloc-marque occupe le coin supérieur gauche de la barre, à 3,2&nbsp;vw du bord
    et sur une hauteur de 38&nbsp;px pour une barre de 76&nbsp;px : la moitié de la
    hauteur disponible reste vide autour de lui.
  </p>
  <ul>
    <li><strong>Écran</strong> — hauteur minimale 24&nbsp;px pour le logotype complet ; en dessous, utiliser la pastille favicon seule.</li>
    <li><strong>Impression</strong> — largeur minimale 25&nbsp;mm ; l'italique très grasse se referme en dessous.</li>
    <li><strong>Favicon</strong> — la pastille est lisible à partir de 32&nbsp;px ; à 16&nbsp;px le mot-symbole n'est plus déchiffrable et seule la pastille fait signe.</li>
  </ul>
  <figure style="margin-top:4mm"><img src="captures/bloc-marque.png" alt="" /><figcaption>Capture de l'application : bloc-marque en haut à gauche, barre de 76&nbsp;px — <code>components/layout/TopBar.tsx</code></figcaption></figure>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 2</span></div>
</section>

<!-- ==================== 2. CONFLIT LOGO / CHARTE ==================== -->
<section class="page">
  <div class="tete"><span class="micro">2 — Conflit documenté</span><span class="micro">Logotype et charte</span></div>
  <h2>Le logotype validé entre en conflit avec la charte</h2>
  <p>
    Le logotype a été validé en rouge. Ce rouge n'appartient pas à la palette
    ministérielle et ne peut pas cohabiter avec le bleu institutionnel dans un
    même composant. Les faits, mesurés :
  </p>
  <table style="margin:4mm 0">
    <tr><th>Couple</th><th>Ratio</th><th>Seuil applicable</th><th>Verdict</th></tr>
    <tr class="ko"><td>Rouge de marque #D81423 sur bleu institutionnel #1B3A6B</td><td class="ratio">2,20:1</td><td>3:1 (composant)</td><td class="verdict">inutilisable</td></tr>
    <tr class="ok"><td>Rouge de marque #D81423 sur blanc</td><td class="ratio">5,07:1</td><td>4,5:1 (texte)</td><td class="verdict">conforme</td></tr>
    <tr class="ok"><td>Bleu institutionnel #1B3A6B sur blanc</td><td class="ratio">11,27:1</td><td>4,5:1 (texte)</td><td class="verdict">conforme</td></tr>
  </table>
  <div class="encadre alerte">
    <span class="micro">Règle d'usage</span>
    <p style="margin:2mm 0 0">
      Les deux couleurs de marque ne sont jamais employées ensemble. Le logotype
      est utilisé <strong>soit</strong> en bleu institutionnel sur fond clair,
      <strong>soit</strong> en réservé blanc sur fond bleu. La version rouge est
      réservée aux supports où elle est seule sur blanc, sans bleu à proximité —
      et n'est présentée nulle part dans ce document comme conforme sur bleu.
    </p>
  </div>
  <h3>Typographie du mot-symbole</h3>
  <p>
    Le mot-symbole est dessiné dans une grotesque italique grasse étrangère à
    Marianne. Il est traité comme un <em>dessin</em>, non comme du texte : il
    n'est ni recomposé en Marianne, ni utilisé comme titre. Tout texte
    accompagnant le logotype est en Marianne.
  </p>
  <h3>Ce qui n'a pas pu être vérifié</h3>
  <p>
    La charte ministérielle complète (47 pages) n'a pas été transmise. N'ont donc
    pas pu être vérifiés : la position exacte du bloc-marque ministériel et sa
    zone de protection réglementaire, la cohabitation avec le bloc « Marianne »
    de l'État, les nuances secondaires officielles, et les règles de co-signature.
    Rien n'a été inventé à leur place : ces points sont signalés comme ouverts en
    dernière page.
  </p>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 3</span></div>
</section>

<!-- ============================ 3. PALETTE ============================ -->
<section class="page">
  <div class="tete"><span class="micro">3 — Palette</span><span class="micro">Dérivée de #1B3A6B</span></div>
  <h2>Palette et variables</h2>
  <p>
    La palette est déclarée dans <strong>un fichier unique</strong>,
    <code>frontend/app/globals.css</code>, sous forme de variables nommées que
    tous les écrans consomment. Changer une valeur y déplace toute l'interface :
    aucun écran ne porte de couleur en dur.
  </p>
  <h3>Primaire et rampe dérivée</h3>
  <div class="grille3">
    <div><div class="swatch" style="background:#1b3a6b"><span>#1B3A6B<br />--color-primary-700</span></div></div>
    <div><div class="swatch" style="background:#2c527c"><span>#2C527C<br />--color-primary-600</span></div></div>
    <div><div class="swatch" style="background:#16305a"><span>#16305A<br />--color-primary-800</span></div></div>
    <div><div class="swatch sombre" style="background:#93aecd"><span>#93AECD<br />--color-primary-300</span></div></div>
    <div><div class="swatch sombre" style="background:#dde5ef"><span>#DDE5EF<br />--color-primary-100</span></div></div>
    <div><div class="swatch" style="background:#0d1b32"><span>#0D1B32<br />--color-primary-950</span></div></div>
  </div>
  <h3>Accents — deux teintes obtenues par rotation du bleu</h3>
  <div class="grille3">
    <div><div class="swatch" style="background:#7a571f"><span>#7A571F<br />--cp-official</span></div><figcaption>Ochre officiel : mentions de simulation, badge « Partenaire officiel ».</figcaption></div>
    <div><div class="swatch" style="background:#1b6b67"><span>#1B6B67<br />--cp-positive</span></div><figcaption>Teal confirmé : crédits, confirmations de paiement.</figcaption></div>
    <div><div class="swatch" style="background:#7c1d54"><span>#7C1D54<br />--cp-alert</span></div><figcaption>Prune d'alerte : refus et erreurs. <strong>Pas de rouge</strong> — voir page 8.</figcaption></div>
  </div>
  <h3>Surfaces et encres</h3>
  <div class="grille3">
    <div><div class="swatch sombre" style="background:#ffffff;border:1px solid var(--filet)"><span>#FFFFFF<br />--cp-page</span></div></div>
    <div><div class="swatch sombre" style="background:#f4f4f2"><span>#F4F4F2<br />--cp-surface</span></div></div>
    <div><div class="swatch" style="background:#0a0a0b"><span>#0A0A0B<br />--cp-fg / --cp-ink</span></div></div>
  </div>
  <div class="encadre">
    <span class="micro">Vérifiable</span>
    <p style="margin:2mm 0 0">
      Le thème sombre redéfinit les mêmes noms, jamais d'autres :
      <code>--cp-accent</code> passe de <code>#1B3A6B</code> à <code>#86AAE8</code>,
      <code>--cp-official</code> à <code>#D8AB64</code>, <code>--cp-positive</code>
      à <code>#64D8D2</code>, <code>--cp-alert</code> à <code>#F0A8CD</code>.
      Aucun composant ne connaît ces valeurs.
    </p>
  </div>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 4</span></div>
</section>

<!-- ======================= 4. CONTRASTES (clair) ======================= -->
<section class="page">
  <div class="tete"><span class="micro">4 — Contrastes mesurés</span><span class="micro">Thème clair — RGAA AA</span></div>
  <h2>Contrastes réellement utilisés — thème clair</h2>
  <p style="margin-bottom:4mm">
    Chaque ligne est un couple texte/fond effectivement présent dans
    l'interface. Ratios calculés selon WCAG&nbsp;2.1 (luminance relative) par
    <code>tools/contrast.py</code>, qui lit les couleurs dans
    <code>globals.css</code> : le tableau se régénère avec la palette et ne peut
    pas la contredire. Seuils : 4,5:1 pour le texte courant, 3:1 pour les
    composants et bordures signifiantes.
  </p>
  <table>
    <tr><th>Usage</th><th>Où</th><th>Avant-plan</th><th>Fond</th><th>Ratio</th><th>Seuil</th><th>Verdict</th></tr>
    {table("clair")}
  </table>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 5</span></div>
</section>

<!-- ======================= 5. CONTRASTES (sombre) ====================== -->
<section class="page">
  <div class="tete"><span class="micro">4 — Contrastes mesurés</span><span class="micro">Thème sombre — RGAA AA</span></div>
  <h2>Contrastes réellement utilisés — thème sombre</h2>
  <table>
    <tr><th>Usage</th><th>Où</th><th>Avant-plan</th><th>Fond</th><th>Ratio</th><th>Seuil</th><th>Verdict</th></tr>
    {table("sombre")}
  </table>
  <div class="encadre alerte" style="margin-top:5mm">
    <span class="micro">Signalé, non dissimulé — {len(fails)} couple{"s" if len(fails) > 1 else ""} sous le seuil sur {n} mesurés</span>
    <p style="margin:2mm 0 0">
      Les filets d'interface (<code>--cp-border</code>, 1,44:1 en clair et
      1,45:1 en sombre) n'atteignent pas 3:1. Ils sont décoratifs : ils séparent
      des blocs sans être le seul indice d'un composant. Là où une bordure porte
      une information — le contour d'un champ de saisie — l'interface passe à
      <code>--cp-fg</code> au focus, soit 19,79:1. Aucun texte n'est en dessous
      de 4,5:1.
    </p>
  </div>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 6</span></div>
</section>

<!-- ========================== 6. TYPOGRAPHIE ========================== -->
<section class="page">
  <div class="tete"><span class="micro">5 — Typographie</span><span class="micro">Marianne &amp; Spectral</span></div>
  <h2>Hiérarchie typographique</h2>
  <p>
    Marianne pour les titres et tout l'appareil d'interface ; Spectral pour le
    corps de texte et les valeurs monétaires. Les deux familles sont
    <strong>embarquées dans le dépôt</strong> et servies depuis
    <code>frontend/public/fonts/</code> : dix fichiers <code>.woff2</code>,
    déclarés en <code>@font-face</code> dans <code>globals.css</code>. Aucun
    appel à un service de polices, ni à l'exécution ni à la compilation.
  </p>
  <table style="margin-top:4mm">
    <tr><th>Niveau</th><th>Famille</th><th>Taille</th><th>Graisse</th><th>Interligne</th><th>Où</th></tr>
    <tr><td>Titre d'écran</td><td>Marianne</td><td>clamp 38→64 px</td><td>700–900</td><td>0,84</td><td class="ou">« Bonjour Camille. »</td></tr>
    <tr><td>Titre de section</td><td>Marianne</td><td>clamp 34→58 px</td><td>700–900</td><td>0,86</td><td class="ou">« Historique. »</td></tr>
    <tr><td>Accent de titre</td><td>Spectral italique</td><td>hérite du titre</td><td>400</td><td>hérite</td><td class="ou">« de l'administrateur. »</td></tr>
    <tr><td>Sous-titre</td><td>Marianne</td><td>24–30 px</td><td>700</td><td>0,95</td><td class="ou">panneaux de réglages</td></tr>
    <tr><td>Corps</td><td>Spectral</td><td>15–19 px</td><td>400</td><td>1,55</td><td class="ou">adresses, descriptions</td></tr>
    <tr><td>Micro-libellé</td><td>Marianne</td><td>9–11 px, +0,16 em</td><td>700</td><td>1</td><td class="ou">« MONTANT DEMANDÉ »</td></tr>
    <tr><td>Valeur monétaire</td><td>Spectral</td><td>26–104 px</td><td>400–600</td><td>0,9</td><td class="ou">solde, carte, QR</td></tr>
  </table>
  <h3>Règles</h3>
  <ul>
    <li>Les micro-libellés sont toujours en capitales, interlettrage +0,16&nbsp;em, jamais en dessous de 9&nbsp;px.</li>
    <li>L'italique Spectral marque l'accent d'un titre : une respiration, jamais une insistance publicitaire.</li>
    <li>Les montants sont en Spectral, avec l'espace insécable étroite avant le symbole € produite par <code>Intl.NumberFormat("fr-FR")</code>.</li>
    <li>Aucune graisse synthétique : Marianne ne livre pas d'ExtraBold, la Bold couvre donc 700 à 900.</li>
  </ul>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 7</span></div>
</section>

<!-- ======================= 7. CARTE PHYSIQUE ========================= -->
<section class="page">
  <div class="tete"><span class="micro">6 — Carte physique</span><span class="micro">Recto / verso</span></div>
  <h2>La carte : recto et verso</h2>
  <p>
    Le point de départ était un rectangle bleu administratif. La carte porte
    désormais un motif dérivé du bleu institutionnel, un reflet spéculaire fixe,
    et un montant composé en Spectral : elle doit se sortir d'un portefeuille
    sans gêne.
  </p>
  <div class="grille2" style="margin-top:4mm">
    <figure><img src="assets/carte-recto.png" alt="" /><figcaption><strong>Recto</strong> — logotype réservé blanc en haut à gauche, puce, montant en Spectral, mention « Simulation » au-dessus du montant.</figcaption></figure>
    <figure><img src="assets/carte-verso.png" alt="" /><figcaption><strong>Verso</strong> — piste, bande de signature, mentions légales en Spectral et mention de simulation encadrée en ochre.</figcaption></figure>
  </div>
  <div class="encadre ochre">
    <span class="micro">Règle</span>
    <p style="margin:2mm 0 0">
      La mention « Simulation — aucune valeur monétaire » figure au recto
      <em>et</em> au verso. Elle n'est jamais réduite en dessous de 15&nbsp;px à
      l'écran ni de 6&nbsp;pt à l'impression, et jamais posée sur le motif : elle
      garde son propre encadré.
    </p>
  </div>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 8</span></div>
</section>

<!-- ==================== 8. MISES EN SITUATION ======================== -->
<section class="page">
  <div class="tete"><span class="micro">6 — Carte physique</span><span class="micro">Mises en situation</span></div>
  <h2>Mises en situation</h2>
  <figure><img src="assets/scene-bureau.png" alt="" /><figcaption>Posée — la carte à plat, motif et reflet visibles en lumière rasante.</figcaption></figure>
  <div class="grille2" style="margin-top:5mm">
    <figure><img src="assets/scene-portefeuille.png" alt="" /><figcaption>Portefeuille — seule la bande supérieure dépasse : le logotype et la mention restent dans le tiers haut du recto pour cette raison.</figcaption></figure>
    <figure><img src="assets/scene-terminal.png" alt="" /><figcaption>Terminal partenaire — le QR affiché est celui capturé dans l'application, avec sa mention de simulation.</figcaption></figure>
  </div>
  <div class="encadre">
    <span class="micro">Nature de ces images</span>
    <p style="margin:2mm 0 0">
      Ces trois vues sont des rendus synthétiques composés à partir des éléments
      du dépôt (polices, logotype, palette, capture du QR), non des
      photographies : aucun visuel photographique sous licence n'était
      disponible. Elles montrent des proportions et des cadrages, pas une
      matière. La mise en situation en main n'a pas été produite — voir la note
      d'omissions.
    </p>
  </div>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 9</span></div>
</section>

<!-- ================= 9. LA CARTE DANS L'INTERFACE — REPOS ============ -->
<section class="page">
  <div class="tete"><span class="micro">7 — La carte dans l'interface</span><span class="micro">État 1 : au repos</span></div>
  <h2>La carte au repos</h2>
  <p>
    Capture de l'application en fonctionnement, espace salarié, écran « Ma
    carte ». Session du compte de démonstration <code>employe@tickettout.fr</code>,
    registre remis à son état initial.
  </p>
  <figure style="margin-top:4mm"><img src="captures/carte-au-repos.png" alt="" /><figcaption>
    <code>/espace</code> — <code>components/espace/BalanceSection.tsx</code>. Le
    solde est celui du registre, pas une valeur écrite dans la page : la mention
    « Simulation » est posée au-dessus du montant, sur la carte elle-même.
  </figcaption></figure>
  <h3>Ce que la capture démontre</h3>
  <ul>
    <li>Le montant est composé en Spectral, la mention de simulation en Marianne micro-libellé.</li>
    <li>Le logotype est en réservé blanc sur le bleu institutionnel : jamais le rouge de marque sur ce fond.</li>
    <li>Le solde est formulé positivement dans la page qui l'accompagne : « Vous pouvez encore dépenser… ».</li>
  </ul>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 10</span></div>
</section>

<!-- ============== 10. LA CARTE DANS L'INTERFACE — PAIEMENT =========== -->
<section class="page">
  <div class="tete"><span class="micro">7 — La carte dans l'interface</span><span class="micro">État 2 : au moment du paiement</span></div>
  <h2>La carte au moment du paiement</h2>
  <p>
    Même session, écran de paiement d'un partenaire. Le bouton « Générer le QR »
    a réellement été actionné pendant la capture : le QR affiché est le jeton
    émis, avec son compte à rebours de cinq minutes.
  </p>
  <figure style="margin-top:4mm"><img src="captures/carte-au-paiement.png" alt="" /><figcaption>
    <code>/espace/partenaire/glaces-correze</code> —
    <code>components/espace/PartnerPayment.tsx</code>. Montant demandé par le
    partenaire (4,50&nbsp;€), solde du porteur, mention de simulation en ochre au
    dessus des deux, jeton valable 04:59 et à usage unique.
  </figcaption></figure>
  <div class="encadre ochre">
    <span class="micro">Règle vérifiable</span>
    <p style="margin:2mm 0 0">
      Partout où une valeur monétaire apparaît — solde, historique, QR, carte —
      la mention de simulation est visible sans interaction : ni au survol, ni
      derrière un dépliant. Elle est portée par la constante
      <code>SIMULATION_NOTICE</code> de <code>components/ui/surfaces.ts</code>.
    </p>
  </div>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 11</span></div>
</section>

<!-- ========================== 11. DÉCLINAISONS ======================= -->
<section class="page">
  <div class="tete"><span class="micro">8 — Déclinaisons</span><span class="micro">Web, réseaux, affiche</span></div>
  <h2>Déclinaisons</h2>
  <figure><img src="assets/bandeau.png" alt="" /><figcaption><strong>Bandeau web 1600×400</strong> — logotype réservé blanc en haut à gauche, accroche en Marianne, accent en Spectral italique, mention de simulation encadrée en ochre à droite.</figcaption></figure>
  <div class="grille2" style="margin-top:5mm">
    <figure><img src="assets/social.png" alt="" /><figcaption><strong>Visuel réseaux sociaux 1080×1080</strong> — fond papier, logotype bleu, aucune valeur monétaire affichée donc aucun montant à justifier.</figcaption></figure>
    <figure><img src="assets/affiche-a3.png" alt="" /><figcaption><strong>Gabarit d'affiche A3</strong> — 297×420&nbsp;mm. Le bandeau haut droit reste réservé au bloc-marque ministériel, dont les règles n'ont pas été transmises.</figcaption></figure>
  </div>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 12</span></div>
</section>

<!-- ========================== 12. INTERDITS =========================== -->
<section class="page">
  <div class="tete"><span class="micro">9 — Interdits</span><span class="micro">Tirés de l'interface</span></div>
  <h2>Ce qui est interdit</h2>
  <p>Chaque interdit ci-dessous vient d'un cas rencontré dans l'application, non d'une liste générique.</p>
  <div style="display:grid;gap:4mm;margin-top:4mm">
    <div class="interdit">
      <span class="micro">Interdit 1 — le rouge de marque comme couleur d'erreur</span>
      <p style="margin:2mm 0 0">
        Le rouge appartient au logotype. Un rouge qui signifie « marque » dans
        l'en-tête ne peut pas signifier « échec » dans un message : la première
        lecture apprise détruit l'autre. Les refus de paiement sont en prune
        <code>#7C1D54</code> (<code>--cp-alert</code>), et jamais portés par la
        couleur seule — filet à gauche et phrase explicite.
      </p>
    </div>
    <div class="interdit">
      <span class="micro">Interdit 2 — le bleu institutionnel en fond de bouton</span>
      <p style="margin:2mm 0 0">
        Contrainte de charte, et contrainte d'interface : les actions engageantes
        de l'application sont des cadres de 2&nbsp;px sur fond transparent ou sur
        l'encre <code>#0A0A0B</code>. Aucun bouton n'a <code>#1B3A6B</code> en
        remplissage — vérifiable dans <code>components/ui/surfaces.ts</code>.
      </p>
    </div>
    <div class="interdit">
      <span class="micro">Interdit 3 — le bloc-marque posé sur une photographie</span>
      <p style="margin:2mm 0 0">
        Les vignettes de partenaires portent leur nom en réservé blanc sur un
        voile sombre. Le logotype, lui, n'est jamais posé sur ces images : il
        reste dans la barre, sur fond uni. Sur la page de paiement, le nom du
        partenaire est un titre en Marianne à côté de la photographie, et la
        photographie ne porte aucun texte de marque.
      </p>
    </div>
    <div class="interdit">
      <span class="micro">Interdit 4 — un solde négatif ou un débit affiché sur la carte</span>
      <p style="margin:2mm 0 0">
        La carte n'affiche qu'un solde, jamais un débit ni un montant négatif :
        le registre refuse tout paiement supérieur au solde et le dit en clair.
        Une carte qui montrerait « −10,00&nbsp;€ » présenterait le dispositif
        comme une dette.
      </p>
    </div>
    <div class="interdit">
      <span class="micro">Interdit 5 — masquer la mention de simulation</span>
      <p style="margin:2mm 0 0">
        La mention ne peut pas être déplacée dans une infobulle, réduite sous
        15&nbsp;px, ni retirée d'un écran au motif qu'un autre écran la porte
        déjà. Elle accompagne la valeur, pas le parcours.
      </p>
    </div>
  </div>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 13</span></div>
</section>

<!-- ==================== 13. COHÉRENCE APPLICATIVE ==================== -->
<section class="page">
  <div class="tete"><span class="micro">10 — Cohérence</span><span class="micro">Book ↔ application</span></div>
  <h2>Où chaque règle se vérifie</h2>
  <table>
    <tr><th>Règle</th><th>Emplacement</th><th>État</th></tr>
    <tr><td>Palette en variables, fichier unique</td><td><code>frontend/app/globals.css</code></td><td>en place</td></tr>
    <tr><td>Polices embarquées, servies localement</td><td><code>frontend/public/fonts/</code> (10 fichiers)</td><td>en place</td></tr>
    <tr><td>Logotype en favicon</td><td><code>frontend/app/icon.svg</code>, <code>favicon.ico</code></td><td>en place</td></tr>
    <tr><td>Logotype dans l'espace salarié</td><td><code>TopBar</code> sur <code>/espace</code></td><td>en place</td></tr>
    <tr><td>Logotype dans l'espace partenaire</td><td>—</td><td class="verdict">espace non construit</td></tr>
    <tr><td>Logotype dans l'administration</td><td>—</td><td class="verdict">espace non construit</td></tr>
    <tr><td>« Ticket Tout » — onglets, pied de page, connexion</td><td><code>app/layout.tsx</code>, <code>Footer</code>, <code>AuthModal</code></td><td>en place</td></tr>
    <tr><td>« Ticket Tout » — jeux de démonstration</td><td><code>components/account/demoAccounts.ts</code></td><td>en place</td></tr>
    <tr><td>« Ticket Tout » — README, artefact de build</td><td><code>frontend/README.md</code>, <code>.github/artifact/RUN.md</code></td><td>en place</td></tr>
    <tr><td>« Ticket Tout » — courriels applicatifs, exports, pages d'erreur</td><td>—</td><td class="verdict">non produits</td></tr>
    <tr><td>Mention de simulation partout où un montant apparaît</td><td><code>SIMULATION_NOTICE</code>, 4 écrans</td><td>en place</td></tr>
    <tr><td>Solde formulé positivement</td><td><code>BalanceSection.tsx</code></td><td>en place</td></tr>
    <tr><td>Erreur distincte du rouge de marque</td><td><code>--cp-alert</code> → <code>--danger-fg</code></td><td>en place</td></tr>
    <tr><td>Catégories partenaires servies par les données</td><td><code>components/data/partnerCategories.ts</code></td><td>en place</td></tr>
    <tr><td>Démarrage depuis un clone, sans prestataire</td><td>aucun appel externe au build ni au runtime</td><td>en place</td></tr>
  </table>
  <div class="encadre">
    <span class="micro">Démonstration de la règle « une valeur déplace l'interface »</span>
    <p style="margin:2mm 0 0">
      La couleur d'erreur a été changée pendant la rédaction de ce book :
      <code>--danger-fg</code> pointait vers le rouge Tailwind, il pointe
      désormais vers <code>--cp-alert</code>. Une ligne modifiée dans
      <code>globals.css</code> a suffi — refus de paiement, bordures d'alerte et
      bouton de suppression de compte ont suivi, sans qu'aucun composant ne soit
      touché.
    </p>
  </div>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 14</span></div>
</section>

<!-- ========================= 14. OMISSIONS =========================== -->
<section class="page">
  <div class="tete"><span class="micro">Note d'omissions</span><span class="micro">Assumées</span></div>
  <h2>Ce qui n'a pas été produit, et pourquoi</h2>
  <h3>Faute de la charte ministérielle</h3>
  <ul>
    <li><strong>Position réglementaire du bloc-marque ministériel</strong> et sa zone de protection : le gabarit d'affiche lui réserve un emplacement vide plutôt que d'en inventer un.</li>
    <li><strong>Règles de co-signature</strong> État / administration / dispositif, et hiérarchie entre les trois blocs.</li>
    <li><strong>Nuances secondaires officielles</strong> : les accents de ce book sont dérivés de #1B3A6B par rotation de teinte, faute de liste officielle à respecter.</li>
    <li><strong>Marianne sous licence</strong> : les fichiers embarqués viennent du paquet public du système de design de l'État. Une diffusion hors démonstrateur demande la vérification des droits.</li>
  </ul>
  <h3>Faute d'écran existant</h3>
  <ul>
    <li><strong>Espace partenaire et espace administration</strong> : non construits. Le logotype ne peut donc pas y être montré, et le badge « Partenaire Officiel de l'administration » comme le contrôle « Featured » ne sont pas documentés en situation.</li>
    <li><strong>Courriels applicatifs, exports, pages d'erreur personnalisées</strong> : aucun de ces artefacts n'existe ; la règle de nommage est énoncée mais non illustrée.</li>
  </ul>
  <h3>Faute de matière photographique</h3>
  <ul>
    <li><strong>Mise en situation en main</strong> : aucune photographie sous licence n'était disponible et une main dessinée aurait été un croquis. Les trois vues produites sont des rendus synthétiques, signalés comme tels page 9.</li>
  </ul>
  <h3>Contrainte du format</h3>
  <ul>
    <li>
      <strong>Le texte de ce PDF n'est pas sélectionnable.</strong> Marianne est
      distribuée avec l'indicateur d'embarquement <code>fsType&nbsp;=&nbsp;4</code>
      — « Preview&nbsp;&amp; Print » — et le moteur d'impression refuse
      d'embarquer une police ainsi restreinte : il la remplace en silence par
      une Liberation Sans, ce qui aurait donné un brand book contredisant sa
      propre règle typographique. Les pages sont donc composées en HTML puis
      photographiées à 192&nbsp;dpi, ce qui est exactement l'usage que la
      licence autorise. La source composable reste
      <code>docs/brand-book/brand-book.html</code>.
    </li>
  </ul>

  <h3>Limites du démonstrateur, hors périmètre du book</h3>
  <ul>
    <li>Le jeton du QR n'est pas signé et le registre vit dans le navigateur : les règles de sécurité annoncées (usage unique, cinq minutes, refus au-delà du solde) sont appliquées côté client et devront l'être côté serveur.</li>
    <li>Les photographies de partenaires sont des visuels de remplacement générés à partir de la palette, non des images de lieux réels.</li>
  </ul>
  <div class="regle"></div>
  <p class="micro" style="color:var(--gris)">
    Assemblé par <code>tools/build-brandbook.py</code> — captures par
    <code>tools/capture.js</code>, contrastes par <code>tools/contrast.py</code>.
    Tout est reproductible depuis le dépôt.
  </p>
  <div class="pied"><span class="micro">Ticket Tout — brand book</span><span class="micro">Page 15</span></div>
</section>
</html>
"""

# Chaque page reçoit un identifiant de capture : le PDF est assemblé à partir
# d'images de ces pages, parce que Marianne porte fsType=4 — « Preview &
# Print » — et que Chrome refuse d'embarquer une police ainsi restreinte dans
# un PDF, la remplaçant en silence par une Liberation Sans. Photographier la
# page rend exactement l'usage que la licence autorise.
numbered = []
index = 0
for chunk in HTML.split('<section class="page'):
    if index:
        numbered.append(f'<section data-shot="page-{index:02d}" class="page' + chunk)
    else:
        numbered.append(chunk)
    index += 1
HTML = "".join(numbered)

OUT.write_text(HTML)
print(f"écrit {OUT.relative_to(ROOT)} — {HTML.count('class=\"page')} pages, {n} couples de contraste")
