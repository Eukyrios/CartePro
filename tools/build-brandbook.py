#!/usr/bin/env python3
"""Assemble le brand book CartePro en HTML paginé A4.

Le tableau de contrastes n'est pas saisi à la main : il est repris de
tools/contrast.py, qui lit lui-même la palette dans globals.css. Une valeur
changée dans le CSS traverse donc le book au prochain assemblage.

    python3 tools/build-brandbook.py            # écrit docs/brand-book/brand-book.html
"""
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "docs/brand-book/brand-book.html"

# L'identité visuelle vient du fichier qui la porte, et non de valeurs
# recopiées ici : `backend/theme.json` est ce que l'application lit au
# démarrage, donc un book assemblé après un changement de thème montre le
# thème en vigueur. C'est la même raison qui fait lire les contrastes à
# tools/contrast.py plutôt que de les saisir.
THEME = json.loads((ROOT / "backend/theme.json").read_text(encoding="utf-8"))
CLAIR = THEME["colors"]["light"]
SOMBRE = THEME["colors"]["dark"]
MARQUE = THEME.get("brand", {}).get("name") or "CartePro"

# La rampe primaire est lue dans la feuille qui la déclare : elle sert aux
# utilitaires Tailwind, donc elle ne vit pas dans theme.json.
_CSS = (ROOT / "frontend/app/globals.css").read_text(encoding="utf-8")
RAMPE = dict(
    re.findall(r"--color-primary-(\d+):\s*(#[0-9a-fA-F]{6})", _CSS)
)


def figer_archivo():
    """Écrit les instances statiques d'Archivo dont le PDF a besoin.

    Voir le commentaire des `@font-face` : Chrome n'embarque pas une police
    variable dans un PDF. Les instances sont régénérées à chaque assemblage,
    pour qu'une mise à jour de la police du site traverse le book.
    """
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer

    source = ROOT / "frontend/public/fonts/Archivo-400-normal-latin.woff2"
    dossier = ROOT / "docs/brand-book/fonts"
    dossier.mkdir(parents=True, exist_ok=True)
    for poids in (400, 500, 700):
        police = TTFont(source)
        instancer.instantiateVariableFont(
            police, {"wght": poids}, inplace=True, updateFontNames=True
        )
        police["OS/2"].usWeightClass = poids
        police.flavor = "woff2"
        police.save(dossier / f"Archivo-{poids}-static.woff2")


def pastilles(paires):
    """Une grille de nuances : la valeur affichée est celle du fichier."""
    out = []
    for valeur, nom, legende in paires:
        # Le texte passe en encre sur une nuance claire : la classe `sombre` du
        # book veut dire « fond clair, encre foncée », pas « thème sombre ».
        clair = int(valeur[1:3], 16) * 0.299 + int(valeur[3:5], 16) * 0.587 + int(valeur[5:7], 16) * 0.114 > 150
        classe = "swatch sombre" if clair else "swatch"
        bord = ";border:1px solid var(--filet)" if valeur.lower() in ("#ffffff", "#fff") else ""
        bloc = (
            f'<div><div class="{classe}" style="background:{valeur}{bord}">'
            f'<span>{valeur.upper()}<br />{nom}</span></div>'
        )
        bloc += f"<figcaption>{legende}</figcaption></div>" if legende else "</div>"
        out.append(bloc)
    return "\n    ".join(out)

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
<title>CartePro — brand book</title>
<style>
  /*
   * Archivo en instances **statiques**, propres à ce document.
   *
   * Le site sert un fichier variable — un seul woff2, axe wght de 100 à 900 —
   * et le navigateur y prélève la graisse demandée. Chrome refuse en revanche
   * d'embarquer une police variable dans un PDF : il la remplaçait en silence
   * par une Liberation Sans, ce qui donnait un brand book composé dans une
   * police que ses propres règles interdisent. Constaté sur le PDF assemblé :
   * Spectral, qui est statique, s'embarquait ; Archivo, non.
   *
   * `tools/build-brandbook.py` fige donc trois instances à 400, 500 et 700
   * dans `docs/brand-book/fonts/` — mêmes contours, une graisse chacune — et
   * le document les déclare. Le site n'est pas touché : il garde son fichier
   * variable, qui est plus léger à servir.
   */
  @font-face {{ font-family: "Archivo"; font-weight: 400; src: url("fonts/Archivo-400-static.woff2") format("woff2"); }}
  @font-face {{ font-family: "Archivo"; font-weight: 500; src: url("fonts/Archivo-500-static.woff2") format("woff2"); }}
  @font-face {{ font-family: "Archivo"; font-weight: 700; src: url("fonts/Archivo-700-static.woff2") format("woff2"); }}
  @font-face {{ font-family: "Spectral"; font-weight: 400; src: url("../../frontend/public/fonts/Spectral-400-normal-latin.woff2") format("woff2"); }}
  @font-face {{ font-family: "Spectral"; font-weight: 400; font-style: italic; src: url("../../frontend/public/fonts/Spectral-400-italic-latin.woff2") format("woff2"); }}
  @font-face {{ font-family: "Spectral"; font-weight: 600; src: url("../../frontend/public/fonts/Spectral-600-normal-latin.woff2") format("woff2"); }}

  :root {{
    --accent: {CLAIR["accent"]}; --accent-600: #5f2a86; --accent-300: {SOMBRE["accent"]}; --accent-100: #ece0f5;
    --ochre: {CLAIR["official"]}; --teal: {CLAIR["positive"]}; --prune: {CLAIR["alert"]};
    --papier: {CLAIR["surface"]}; --encre: {CLAIR["ink"]}; --gris: {CLAIR["muted"]}; --filet: {CLAIR["border"]};
  }}
  @page {{ size: A4; margin: 0; }}
  /* Le numéro de page est compté, pas écrit : chaque `.pied` portait son rang
     en dur, et une page insérée au milieu faisait mentir toutes les suivantes. */
  body {{ counter-reset: page-book; }}
  .page {{ counter-increment: page-book; }}
  .num-page::before {{ content: "Page " counter(page-book); }}
  * {{ box-sizing: border-box; margin: 0; }}
  body {{ font-family: "Spectral", Georgia, serif; color: var(--encre); background: #fff; font-size: 10.5pt; line-height: 1.5; }}
  .page {{
    width: 210mm; height: 297mm; padding: 20mm 18mm 16mm; position: relative;
    page-break-after: always; break-after: page; overflow: hidden; display: flex; flex-direction: column;
  }}
  .page:last-child {{ page-break-after: auto; }}
  h1, h2, h3, .micro, th, .num {{ font-family: "Archivo", system-ui, sans-serif; }}
  h1 {{ font-size: 30pt; line-height: 0.92; letter-spacing: -0.03em; font-weight: 700; }}
  h2 {{ font-size: 18pt; line-height: 1; letter-spacing: -0.02em; font-weight: 700; margin-bottom: 4mm; }}
  h3 {{ font-size: 10pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin: 6mm 0 2mm; color: var(--accent); }}
  p {{ margin-bottom: 3mm; max-width: 62ch; }}
  em {{ font-style: italic; }}
  .micro {{ font-size: 7.5pt; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }}
  .tete {{ display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid var(--encre); padding-bottom: 3mm; margin-bottom: 7mm; }}
  .tete .micro {{ color: var(--gris); }}
  .pied {{ margin-top: auto; padding-top: 4mm; border-top: 1px solid var(--filet); display: flex; justify-content: space-between; }}
  .pied .micro {{ color: var(--gris); font-size: 7pt; }}
  .regle {{ height: 2px; background: var(--encre); margin: 5mm 0; }}
  .encadre {{ border-left: 3px solid var(--accent); background: var(--papier); padding: 4mm 5mm; margin: 4mm 0; }}
  .encadre.alerte {{ border-color: var(--prune); }}
  .encadre.ochre {{ border-color: var(--ochre); }}
  table {{ width: 100%; border-collapse: collapse; font-size: 8pt; }}
  th {{ text-align: left; font-size: 7pt; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 2px solid var(--encre); padding: 2mm 1.5mm; }}
  td {{ padding: 1.6mm 1.5mm; border-bottom: 1px solid var(--filet); vertical-align: middle; }}
  code {{ font-family: "Courier New", monospace; font-size: 7.5pt; }}
  .pastille {{ display: inline-block; width: 3.4mm; height: 3.4mm; border: 1px solid rgba(0,0,0,.25); vertical-align: -0.6mm; margin-right: 1.2mm; }}
  .ratio {{ font-family: "Archivo", sans-serif; font-weight: 700; }}
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
  .swatch span {{ font-family: "Archivo", sans-serif; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.06em; }}
  ul {{ margin: 0 0 3mm 4mm; }}
  li {{ margin-bottom: 1.6mm; }}
  .interdit {{ border: 1px solid var(--filet); padding: 4mm; }}
  .interdit .micro {{ color: var(--prune); }}
  .couv {{ background: var(--accent); color: #fff; justify-content: space-between; }}
  .couv h1 {{ font-size: 44pt; }}
  .couv .tete {{ border-color: rgba(255,255,255,.4); }}
  .couv .tete .micro, .couv .pied .micro {{ color: rgba(255,255,255,.75); }}
  .couv .pied {{ border-color: rgba(255,255,255,.3); }}
</style>

<!-- ============================ COUVERTURE ============================ -->
<section class="page couv">
  <div class="tete"><span class="micro">CartePro</span><span class="micro">Document de travail</span></div>
  <div>
    <img src="../../frontend/public/logo/wordmark-white.svg" style="height:18mm" alt="CartePro" />
    <!-- Le titre ne répète pas le nom : le logotype est désormais le
         mot-symbole lui-même, et « CartePro » apparaissait donc deux fois de
         suite sur la couverture, en deux dessins différents du même mot. -->
    <h1 style="margin-top:12mm">Brand book<br /><em style="font-family:Spectral,serif;font-weight:400;color:var(--accent-300)">applicable.</em></h1>
    <p style="margin-top:8mm;max-width:52ch;color:rgba(255,255,255,.86)">
      Règles d'usage de la marque « CartePro », chacune vérifiable dans
      l'application déjà développée : une valeur, un emplacement dans le code,
      ou une capture à l'appui.
    </p>
  </div>
  <div class="pied"><span class="micro">Démonstrateur — aucune valeur monétaire réelle</span><span class="micro num-page"></span></div>
</section>

<!-- ============================ 1. LOGOTYPE ============================ -->
<section class="page">
  <div class="tete"><span class="micro">1 — Logotype</span><span class="micro">CartePro</span></div>
  <h2>Le logotype et ses versions</h2>
  <p>
    Le logotype CartePro est le nom seul, sans pictogramme : <code>Carte</code>
    en Archivo 700, <code>Pro</code> en Archivo 400, dans une seule encre — le
    violet de marque <code>#4A1B6B</code>. Trois marques dessinées ont été
    essayées et écartées : elles n'ajoutaient rien que le nom ne disait déjà, et
    aucune ne tenait à 16&nbsp;px sans se refermer. Une seule encre et deux
    graisses, donc : le logotype s'imprime dans n'importe quelle teinte unique,
    y compris celle que le salarié choisit pour sa carte. Les fichiers sources
    sont à <code>frontend/public/logo/</code> ; dans l'application, le logotype
    est du texte — <code>components/brand/Logotype.tsx</code>.
  </p>
  <div class="grille3" style="margin-top:5mm">
    <figure><div style="background:#fff;border:1px solid var(--filet);padding:6mm;display:grid;place-items:center;height:34mm"><img src="../../frontend/public/logo/wordmark-purple.svg" style="width:100%;border:0" alt="" /></div><figcaption><strong>Version principale</strong><br />wordmark-purple.svg — violet #4A1B6B sur fond clair</figcaption></figure>
    <figure><div style="background:var(--accent);padding:6mm;display:grid;place-items:center;height:34mm"><img src="../../frontend/public/logo/wordmark-white.svg" style="width:100%;border:0" alt="" /></div><figcaption><strong>Version monochrome</strong><br />wordmark-white.svg — réservé blanc sur fond violet ou noir</figcaption></figure>
    <figure><div style="background:var(--papier);border:1px solid var(--filet);padding:6mm;display:grid;place-items:center;height:34mm"><img src="../../frontend/app/icon.svg" style="width:22mm;height:22mm;border:0" alt="" /></div><figcaption><strong>Version favicon</strong><br />app/icon.svg — 128×128, l'initiale dans une boîte blanche</figcaption></figure>
  </div>
  <h3>Zone de protection et tailles minimales</h3>
  <p>
    Zone de protection : une marge égale à la hauteur des capitales, sur les
    quatre côtés, libre de tout texte, filet ou image. Dans l'application, le
    logotype occupe le coin supérieur gauche de la barre, à 3,2&nbsp;vw du bord
    et sur une hauteur de 38&nbsp;px pour une barre de 76&nbsp;px : la moitié de la
    hauteur disponible reste vide autour de lui.
  </p>
  <ul>
    <li><strong>Écran</strong> — corps minimal 15&nbsp;px pour le nom complet ; en dessous, utiliser l'initiale seule.</li>
    <li><strong>Impression</strong> — largeur minimale 22&nbsp;mm ; en dessous la distinction des deux graisses se perd.</li>
    <li><strong>Favicon</strong> — l'initiale dans sa boîte blanche, lisible dès 16&nbsp;px ; le nom entier n'y tient pas.</li>
  </ul>
  <figure style="margin-top:4mm"><img src="captures/bloc-marque.png" alt="" /><figcaption>Capture de l'application : bloc-marque en haut à gauche, barre de 76&nbsp;px — <code>components/layout/TopBar.tsx</code></figcaption></figure>
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ==================== 2. LOGOTYPE ET COULEUR ==================== -->
<section class="page">
  <div class="tete"><span class="micro">2 — Le logotype et sa couleur</span><span class="micro">Un seul couple</span></div>
  <h2>Une marque, deux états</h2>
  <p>
    Le logotype n'a qu'une couleur, et c'est ce qui a changé. La version
    précédente en portait deux — un rouge de marque validé hors palette, et le
    bleu institutionnel d'une charte d'État — qui ne pouvaient pas cohabiter :
    mesuré à l'époque, le rouge sur le bleu donnait 2,20:1 pour un seuil de
    3:1, donc inutilisable dans un même composant. La question ne se pose plus.
    Le mot-symbole est monochrome et prend l'accent de la marque ou le réservé
    blanc, jamais autre chose.
  </p>
  <table style="margin:4mm 0">
    <tr><th>Couple</th><th>Ratio</th><th>Seuil applicable</th><th>Verdict</th></tr>
    <tr class="ok"><td>Violet de marque #4A1B6B sur blanc</td><td class="ratio">12,65:1</td><td>4,5:1 (texte)</td><td class="verdict">conforme</td></tr>
    <tr class="ok"><td>Réservé blanc sur violet de marque</td><td class="ratio">12,65:1</td><td>4,5:1 (texte)</td><td class="verdict">conforme</td></tr>
    <tr class="ok"><td>Violet clair #C186E8 sur fond sombre #12091B</td><td class="ratio">7,26:1</td><td>4,5:1 (texte)</td><td class="verdict">conforme</td></tr>
  </table>
  <div class="encadre">
    <span class="micro">Règle d'usage</span>
    <p style="margin:2mm 0 0">
      Le logotype est employé <strong>soit</strong> en violet de marque sur fond
      clair, <strong>soit</strong> en réservé blanc sur fond violet ou presque
      noir. Le thème sombre lui donne le violet clair, qui est la même couleur
      relevée pour tenir sur un fond sombre — et non une seconde couleur de
      marque. Aucune troisième teinte n'est prévue.
    </p>
  </div>
  <h3>Typographie du mot-symbole</h3>
  <p>
    Le mot-symbole est le nom composé, sans pictogramme : <em>Carte</em> en
    graisse pleine et <em>Pro</em> en graisse moyenne, dans la police
    d'interface. Il est traité comme un <em>dessin</em> — il n'est pas recomposé
    à la volée et ne sert jamais de titre. Tout texte qui l'accompagne est en
    Archivo.
  </p>
  <h3>Ce que ce document ne couvre plus</h3>
  <p>
    Les pages précédentes de ce book listaient ce qui n'avait pas pu être
    vérifié faute d'une charte d'État : position réglementaire d'un bloc-marque
    ministériel, zone de protection, co-signature, nuances officielles
    secondaires. Le dispositif n'est plus présenté comme un service public et ne
    porte plus aucun signe d'État — ces points sont sans objet, et leur
    disparition est elle-même consignée en dernière page.
  </p>
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ============================ 3. PALETTE ============================ -->
<section class="page">
  <div class="tete"><span class="micro">3 — Palette</span><span class="micro">Dérivée de {CLAIR["accent"].upper()}</span></div>
  <h2>Palette et variables</h2>
  <p>
    La palette est déclarée dans <strong>deux fichiers, et deux seulement</strong> :
    la rampe primaire dans <code>frontend/app/globals.css</code>, où les
    utilitaires la consomment, et les dix jetons <code>--cp-*</code> dans
    <code>backend/theme.json</code>, que l'application lit au démarrage.
    Changer une valeur y déplace toute l'interface, et ce book — les nuances
    ci-dessous sont lues dans ces fichiers à l'assemblage, non recopiées.
  </p>
  <h3>Primaire et rampe dérivée</h3>
  <div class="grille3">
    {pastilles([
      (RAMPE.get("700", "#4a1b6b"), "--color-primary-700", ""),
      (RAMPE.get("600", "#5b2c7c"), "--color-primary-600", ""),
      (RAMPE.get("800", "#3e165a"), "--color-primary-800", ""),
      (RAMPE.get("300", "#b593cd"), "--color-primary-300", ""),
      (RAMPE.get("100", "#e8ddef"), "--color-primary-100", ""),
      (RAMPE.get("950", "#230d32"), "--color-primary-950", ""),
    ])}
  </div>
  <h3>Accents — trois signaux, et pourquoi ils ne suivent pas la teinte</h3>
  <div class="grille3">
    {pastilles([
      (CLAIR["official"], "--cp-official", "Ochre officiel : mentions de simulation, badge « Partenaire officiel »."),
      (CLAIR["positive"], "--cp-positive", "Teal confirmé : crédits, confirmations de paiement."),
      (CLAIR["alert"], "--cp-alert", "Prune d'alerte : refus et erreurs. <strong>Pas de rouge</strong> — voir la page « Interdits »."),
    ])}
  </div>
  <div class="encadre">
    <span class="micro">Décision</span>
    <p style="margin:2mm 0 0">
      Ces trois teintes n'ont <strong>pas</strong> été tournées avec le reste
      quand l'accent est passé du bleu au violet. Ce sont des signaux, pas des
      déclinaisons de la marque : l'ochre dit « ceci est simulé », le teal
      « ceci est acquis », la prune « ceci est refusé ». Les dériver du violet
      les aurait rapprochées les unes des autres, et la rotation appliquée au
      reste aurait donné un olive à la place du teal. La prune reste la plus
      proche du violet, et c'est la limite connue de ce choix.
    </p>
  </div>
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<section class="page">
  <div class="tete"><span class="micro">3 — Palette</span><span class="micro">Surfaces et thème sombre</span></div>
  <h2>Surfaces, encres et déclinaison sombre</h2>
  <h3>Surfaces et encres</h3>
  <div class="grille3">
    {pastilles([
      (CLAIR["page"], "--cp-page", ""),
      (CLAIR["surface"], "--cp-surface", ""),
      (CLAIR["ink"], "--cp-fg / --cp-ink", ""),
    ])}
  </div>
  <div class="encadre">
    <span class="micro">Vérifiable</span>
    <p style="margin:2mm 0 0">
      Le thème sombre redéfinit les mêmes noms, jamais d'autres :
      <code>--cp-accent</code> passe de <code>{CLAIR["accent"].upper()}</code> à
      <code>{SOMBRE["accent"].upper()}</code>, <code>--cp-official</code> à
      <code>{SOMBRE["official"].upper()}</code>, <code>--cp-positive</code> à
      <code>{SOMBRE["positive"].upper()}</code>, <code>--cp-alert</code> à
      <code>{SOMBRE["alert"].upper()}</code>, et le fond de page à
      <code>{SOMBRE["page"].upper()}</code>. Aucun composant ne connaît ces
      valeurs.
    </p>
  </div>
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
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
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
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
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ========================== 6. TYPOGRAPHIE ========================== -->
<section class="page">
  <div class="tete"><span class="micro">5 — Typographie</span><span class="micro">Archivo &amp; Spectral</span></div>
  <h2>Hiérarchie typographique</h2>
  <p>
    Archivo pour les titres et tout l'appareil d'interface ; Spectral pour le
    corps de texte et les valeurs monétaires. Les deux familles sont
    <strong>embarquées dans le dépôt</strong> et servies depuis
    <code>frontend/public/fonts/</code> : dix fichiers <code>.woff2</code>,
    déclarés en <code>@font-face</code> dans <code>globals.css</code>. Aucun
    appel à un service de polices, ni à l'exécution ni à la compilation.
  </p>
  <table style="margin-top:4mm">
    <tr><th>Niveau</th><th>Famille</th><th>Taille</th><th>Graisse</th><th>Interligne</th><th>Où</th></tr>
    <tr><td>Titre d'écran</td><td>Archivo</td><td>clamp 38—64 px</td><td>700–900</td><td>0,84</td><td class="ou">« Bonjour Camille. »</td></tr>
    <tr><td>Titre de section</td><td>Archivo</td><td>clamp 34—58 px</td><td>700–900</td><td>0,86</td><td class="ou">« Historique. »</td></tr>
    <tr><td>Accent de titre</td><td>Spectral italique</td><td>hérite du titre</td><td>400</td><td>hérite</td><td class="ou">« de l'administrateur. »</td></tr>
    <tr><td>Sous-titre</td><td>Archivo</td><td>24–30 px</td><td>700</td><td>0,95</td><td class="ou">panneaux de réglages</td></tr>
    <tr><td>Corps</td><td>Spectral</td><td>15–19 px</td><td>400</td><td>1,55</td><td class="ou">adresses, descriptions</td></tr>
    <tr><td>Micro-libellé</td><td>Archivo</td><td>9–11 px, +0,16 em</td><td>700</td><td>1</td><td class="ou">« MONTANT DEMANDÉ »</td></tr>
    <tr><td>Valeur monétaire</td><td>Spectral</td><td>26–104 px</td><td>400–600</td><td>0,9</td><td class="ou">solde, carte, QR</td></tr>
  </table>
  <h3>Règles</h3>
  <ul>
    <li>Les micro-libellés sont toujours en capitales, interlettrage +0,16&nbsp;em, jamais en dessous de 9&nbsp;px.</li>
    <li>L'italique Spectral marque l'accent d'un titre : une respiration, jamais une insistance publicitaire.</li>
    <li>Les montants sont en Spectral, avec l'espace insécable étroite avant le symbole € produite par <code>Intl.NumberFormat("fr-FR")</code>.</li>
    <li>Aucune graisse synthétique : les trois fichiers Archivo embarqués sont 400, 500 et 700, et la Bold couvre 700 à 900.</li>
  </ul>
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ======================= 7. CARTE PHYSIQUE ========================= -->
<section class="page">
  <div class="tete"><span class="micro">6 — Carte physique</span><span class="micro">Recto / verso</span></div>
  <h2>La carte : recto et verso</h2>
  <p>
    Le point de départ était un rectangle bleu administratif, abandonné avec le reste de l'identité d'État. La carte porte
    désormais un motif dérivé du violet de marque, un reflet spéculaire fixe,
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
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ==================== 8. MISES EN SITUATION ======================== -->
<section class="page">
  <div class="tete"><span class="micro">6 — Carte physique</span><span class="micro">Mises en situation</span></div>
  <h2>Mises en situation</h2>
  <!-- Les trois vues côte à côte. En pleine largeur puis deux colonnes, la
       page dépassait l'A4 de 82 puis 97px, et le PDF coupait l'encadré du bas :
       ce sont les images qui donnent sa hauteur à cette page, donc c'est leur
       largeur qu'il faut réduire. -->
  <div class="grille3">
    <figure><img src="assets/scene-bureau.png" alt="" /><figcaption>Posée — la carte à plat, motif et reflet en lumière rasante.</figcaption></figure>
    <figure><img src="assets/scene-portefeuille.png" alt="" /><figcaption>Portefeuille — le logotype et la mention restent au-dessus du rabat, et c'est pour cela qu'ils vivent dans le tiers haut du recto.</figcaption></figure>
    <figure><img src="assets/scene-terminal.png" alt="" /><figcaption>Terminal partenaire — le QR est celui capturé dans l'application, avec sa mention de simulation.</figcaption></figure>
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
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ================= 9. LA CARTE DANS L'INTERFACE — REPOS ============ -->
<section class="page">
  <div class="tete"><span class="micro">7 — La carte dans l'interface</span><span class="micro">État 1 : au repos</span></div>
  <h2>La carte au repos</h2>
  <p>
    Capture de l'application en fonctionnement, espace salarié, écran « Ma
    carte ». Session du compte de démonstration <code>employe@cartepro.fr</code>,
    registre remis à son état initial.
  </p>
  <figure style="margin-top:4mm"><img src="captures/carte-au-repos.png" alt="" /><figcaption>
    <code>/espace</code> — <code>components/espace/BalanceSection.tsx</code>. Le
    solde est celui du registre, pas une valeur écrite dans la page : la mention
    « Simulation » est posée au-dessus du montant, sur la carte elle-même.
  </figcaption></figure>
  <h3>Ce que la capture démontre</h3>
  <ul>
    <li>Le montant est composé en Spectral, la mention de simulation en Archivo micro-libellé.</li>
    <li>Le logotype est en réservé blanc sur le violet de marque : jamais le rouge de marque sur ce fond.</li>
    <li>Le solde est formulé positivement dans la page qui l'accompagne : « Vous pouvez encore dépenser… ».</li>
  </ul>
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
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
    <code>/espace/partenaire/epicerie-sainte-claire</code> —
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
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ============ 8. LA VITRINE, ÉCRAN PAR ÉCRAN ==================== -->
<section class="page">
  <div class="tete"><span class="micro">8 — La vitrine</span><span class="micro">Quatre écrans</span></div>
  <h2>La page d'accueil, écran par écran</h2>
  <p>
    La vitrine défile par écrans pleins, un sujet par écran, avec un rail
    latéral qui les nomme. Les quatre captures ci-dessous sont l'intégralité de
    la page pour un visiteur non connecté&nbsp;: il n'y en a pas d'autres.
  </p>
  <div class="grille2">
    <figure><img src="captures/accueil-public.png" alt="" /><figcaption><strong>Accroche</strong> — le titre, la carte en volume, et le seul bouton de la page : celui qui mène au coup de cœur.</figcaption></figure>
    <figure><img src="captures/fonctionnement.png" alt="" /><figcaption><strong>Fonctionnement</strong> — la pile de cartes qu'on pousse à la main ou aux flèches, une étape par carte.</figcaption></figure>
    <figure><img src="captures/coup-de-coeur.png" alt="" /><figcaption><strong>Coup de cœur</strong> — un seul partenaire nommé, avec la phrase de l'administrateur. Le contenu vient de la table <code>coups_de_coeur</code>.</figcaption></figure>
    <figure><img src="captures/confiance.png" alt="" /><figcaption><strong>Confiance</strong> — le dernier écran, celui à qui appartient le pied de page : les deux ensemble font exactement une fenêtre.</figcaption></figure>
  </div>
  <div class="encadre">
    <span class="micro">Vérifiable</span>
    <p style="margin:2mm 0 0">
      L'accent du titre est en Spectral italique dans les quatre&nbsp;; le rail
      ne numérote pas le premier écran, parce que l'en-tête lui appartient.
    </p>
  </div>
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ============ 9. LES TROIS ESPACES ============================== -->
<section class="page">
  <div class="tete"><span class="micro">9 — Les trois espaces</span><span class="micro">Un compte, un espace</span></div>
  <h2>La page d'accueil change avec le compte</h2>
  <p>
    Il n'y a pas de section « administration » ni de section « partenaire » :
    l'accueil <em>est</em> l'espace du compte connecté, et c'est le rôle porté
    par le jeton qui décide lequel — voir
    <code>components/account/AccountSpace.tsx</code>. La marque, le rail et le
    pied de page sont les mêmes dans les trois.
  </p>
  <div class="grille2">
    <figure><img src="captures/espace-salarie.png" alt="" /><figcaption><strong>Salarié</strong> — la carte, le solde et le QR de paiement côte à côte.</figcaption></figure>
    <figure><img src="captures/partenaire-encaissement.png" alt="" /><figcaption><strong>Partenaire</strong> — l'encaissement : le code se saisit ou se scanne, le montant est celui de la fiche.</figcaption></figure>
    <figure><img src="captures/admin-demandes.png" alt="" /><figcaption><strong>Administration</strong> — les dossiers en attente d'instruction, en tableau : une ligne ouvre le dossier.</figcaption></figure>
    <figure><img src="captures/partenaire-refus.png" alt="" /><figcaption><strong>Établissement écarté</strong> — sa décision et son motif, en premier écran. Visible de lui seul : le catalogue public ne les sert pas.</figcaption></figure>
  </div>
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ============ 10. INSTRUIRE, ENCAISSER, COMPTER =================== -->
<section class="page">
  <div class="tete"><span class="micro">10 — Les écrans de gestion</span><span class="micro">Décider et compter</span></div>
  <h2>Là où l'argent et les décisions se lisent</h2>
  <div class="grille2">
    <figure><img src="captures/admin-dossier.png" alt="" /><figcaption><strong>Un dossier</strong> — toutes les pièces, l'historique des décisions avec leurs motifs, puis la décision. Le motif est obligatoire : c'est ce que l'établissement lira.</figcaption></figure>
    <figure><img src="captures/admin-recettes.png" alt="" /><figcaption><strong>Les recettes d'un établissement</strong> — le total tombe sur la colonne des montants, qui ferme la ligne. La colonne d'annulation n'existe que sur cet écran.</figcaption></figure>
    <figure><img src="captures/partenaire-recettes.png" alt="" /><figcaption><strong>Ses propres recettes</strong> — le même composant, sans l'annulation : un encaissement est irréversible de ce côté du comptoir.</figcaption></figure>
    <figure><img src="captures/reseau.png" alt="" /><figcaption><strong>Le réseau</strong> — la même liste pour tous, filtrée par nom, catégorie, ville et code postal.</figcaption></figure>
  </div>
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ============ 11. LES ÉCRANS DE SERVICE ========================== -->
<section class="page">
  <div class="tete"><span class="micro">11 — Écrans de service</span><span class="micro">Ceux qu'on oublie</span></div>
  <h2>Connexion, réglages, conditions, erreur</h2>
  <p>
    Ces quatre écrans portent la marque autant que les autres, et c'est
    précisément pour cela qu'ils sont ici : ce sont ceux qu'un kit de marque
    oublie.
  </p>
  <div class="grille2">
    <figure><img src="captures/dialogue-connexion.png" alt="" /><figcaption><strong>Connexion</strong> — un seul écran, sans onglets : le serveur retrouve le compte par son adresse, quel que soit son genre. Les trois comptes de démonstration y sont offerts.</figcaption></figure>
    <figure><img src="captures/parametres.png" alt="" /><figcaption><strong>Réglages</strong> — le style de la carte, le profil, la sécurité. Les champs sont carrés, à angle vif, comme le reste.</figcaption></figure>
    <figure><img src="captures/conditions.png" alt="" /><figcaption><strong>Conditions d'utilisation</strong> — le seul écran qui se lit de haut en bas d'une traite, donc sans écrans pleins ni rail.</figcaption></figure>
    <figure><img src="captures/page-404.png" alt="" /><figcaption><strong>Page 404</strong> — sous le gabarit racine, donc avec la barre haute, le pied de page et la mention de démonstrateur.</figcaption></figure>
  </div>
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ========================== 12. DÉCLINAISONS ======================= -->
<section class="page">
  <div class="tete"><span class="micro">12 — Déclinaisons</span><span class="micro">Web, réseaux, affiche</span></div>
  <h2>Déclinaisons</h2>
  <figure><img src="assets/bandeau.png" alt="" /><figcaption><strong>Bandeau web 1600×400</strong> — logotype réservé blanc en haut à gauche, accroche en Archivo, accent en Spectral italique, mention de simulation encadrée en ochre à droite.</figcaption></figure>
  <div class="grille2" style="margin-top:5mm">
    <figure><img src="assets/social.png" alt="" /><figcaption><strong>Visuel réseaux sociaux 1080×1080</strong> — fond papier, logotype bleu, aucune valeur monétaire affichée donc aucun montant à justifier.</figcaption></figure>
    <figure><img src="assets/affiche-a3.png" alt="" /><figcaption><strong>Gabarit d'affiche A3</strong> — 297×420&nbsp;mm. Le bandeau haut droit est laissé libre : c'est la réserve d'un partenaire co-signataire, pas celle d'un bloc-marque d'État.</figcaption></figure>
  </div>
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ========================== 13. INTERDITS =========================== -->
<section class="page">
  <div class="tete"><span class="micro">13 — Interdits</span><span class="micro">Tirés de l'interface</span></div>
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
      <span class="micro">Interdit 2 — le violet de marque en fond de bouton</span>
      <p style="margin:2mm 0 0">
        Contrainte de charte, et contrainte d'interface : les actions engageantes
        de l'application sont des cadres de 2&nbsp;px sur fond transparent ou sur
        l'encre <code>#0A0A0B</code>. Aucun bouton n'a l'accent en
        remplissage — vérifiable dans <code>components/ui/surfaces.ts</code>.
      </p>
    </div>
    <div class="interdit">
      <span class="micro">Interdit 3 — le bloc-marque sur une photographie</span>
      <p style="margin:2mm 0 0">
        Les vignettes de partenaires portent leur nom en réservé blanc sur un
        voile sombre. Le logotype, lui, n'est jamais posé sur ces images : il
        reste dans la barre, sur fond uni. Sur la fiche, le nom du partenaire
        est un titre à côté de la photographie, qui ne porte aucun texte de
        marque.
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
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ==================== 14. COHÉRENCE APPLICATIVE ==================== -->
<section class="page">
  <div class="tete"><span class="micro">14 — Cohérence</span><span class="micro">Book et application</span></div>
  <h2>Où chaque règle se vérifie</h2>
  <table>
    <tr><th>Règle</th><th>Emplacement</th><th>État</th></tr>
    <tr><td>Palette en variables, fichier unique</td><td><code>frontend/app/globals.css</code></td><td>en place</td></tr>
    <tr><td>Polices embarquées, servies localement</td><td><code>frontend/public/fonts/</code> (10 fichiers)</td><td>en place</td></tr>
    <tr><td>Logotype en favicon</td><td><code>frontend/app/icon.svg</code>, <code>favicon.ico</code></td><td>en place</td></tr>
    <tr><td>Logotype dans l'espace salarié</td><td><code>TopBar</code> sur <code>/espace</code></td><td>en place</td></tr>
    <tr><td>Logotype dans l'espace partenaire</td><td><code>PartnerSpace</code> sur <code>/espace</code></td><td>en place</td></tr>
    <tr><td>Logotype dans l'administration</td><td><code>AdminSpace</code> sur <code>/espace</code>, <code>/dossier/&lt;slug&gt;</code></td><td>en place</td></tr>
    <tr><td>« CartePro » — onglets, pied de page, connexion</td><td><code>app/layout.tsx</code>, <code>Footer</code>, <code>AuthModal</code></td><td>en place</td></tr>
    <tr><td>« CartePro » — jeux de démonstration</td><td><code>components/account/demoAccounts.ts</code></td><td>en place</td></tr>
    <tr><td>« CartePro » — README, artefact de build</td><td><code>frontend/README.md</code>, <code>.github/artifact/RUN.md</code></td><td>en place</td></tr>
    <tr><td>« CartePro » — courriels applicatifs, exports, pages d'erreur</td><td>—</td><td class="verdict">non produits</td></tr>
    <tr><td>Mention de simulation partout où un montant apparaît</td><td><code>SIMULATION_NOTICE</code>, 4 écrans</td><td>en place</td></tr>
    <tr><td>Solde formulé positivement</td><td><code>BalanceSection.tsx</code></td><td>en place</td></tr>
    <tr><td>Erreur distincte du rouge de marque</td><td><code>--cp-alert</code> puis <code>--danger-fg</code></td><td>en place</td></tr>
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
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<!-- ========================= 14. OMISSIONS =========================== -->
<section class="page">
  <div class="tete"><span class="micro">Note d'omissions</span><span class="micro">Assumées</span></div>
  <h2>Ce qui n'a pas été produit, et pourquoi</h2>
  <h3>Ce qui a disparu de cette liste</h3>
  <p>
    Les éditions précédentes ouvraient cette page sur quatre points laissés en
    suspens faute d'une charte d'État : position réglementaire d'un bloc-marque
    ministériel, règles de co-signature, nuances officielles secondaires, et la
    licence de Marianne. Ils sont sans objet. Le dispositif ne se présente plus
    comme un service public&nbsp;: il ne porte plus de bloc-marque d'État, la
    palette est dérivée de son propre accent, et la typographie d'interface est
    Archivo, sous licence ouverte — donc diffusable sans vérification de droits.
  </p>
  <p>
    Deux autres points ont été réglés par le code plutôt que par une note&nbsp;:
    l'espace partenaire et l'espace d'administration existent, et sont montrés
    en situation aux pages qui précèdent ; les pages d'erreur personnalisées
    aussi.
  </p>
  <h3>Faute d'écran existant</h3>
  <ul>
    <li><strong>Courriels applicatifs</strong> : le dispositif n'envoie aucun message — aucune bibliothèque de messagerie n'est embarquée. La règle de nommage est énoncée, non illustrée, et le restera tant qu'il n'y a rien à illustrer.</li>
    <li><strong>Annulation d'un paiement</strong> : l'écran existe et la décision se saisit, mais la route serveur répond « non implémenté ». L'opération inverse demande une colonne de liaison que le schéma n'a pas encore.</li>
  </ul>
  <h3>Faute de matière photographique</h3>
  <ul>
    <li><strong>Mise en situation en main</strong> : aucune photographie sous licence n'était disponible et une main dessinée aurait été un croquis. Les trois vues produites sont des rendus synthétiques, signalés comme tels à la page « Mises en situation ».</li>
  </ul>
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>

<section class="page">
  <div class="tete"><span class="micro">Note d'omissions</span><span class="micro">Limites connues</span></div>
  <h2>Ce que le démonstrateur ne fait pas encore</h2>
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
  <div class="pied"><span class="micro">CartePro — brand book</span><span class="micro num-page"></span></div>
</section>
</html>
"""

# Chaque page reçoit un identifiant de capture.
#
# Il ne sert plus à fabriquer le PDF : celui-ci est imprimé par
# `tools/print-pdf.js`, qui rend un vrai document texte — Archivo est sous
# licence ouverte, donc embarquable, ce que Marianne n'était pas. L'identifiant
# reste parce qu'il permet de photographier une page précise quand on veut
# comparer deux éditions à l'image.
numbered = []
index = 0
for chunk in HTML.split('<section class="page'):
    if index:
        numbered.append(f'<section data-shot="page-{index:02d}" class="page' + chunk)
    else:
        numbered.append(chunk)
    index += 1
HTML = "".join(numbered)

figer_archivo()
OUT.write_text(HTML)
print(f"écrit {OUT.relative_to(ROOT)} — {HTML.count('class=\"page')} pages, {n} couples de contraste")
