# Logotypes

Le monogramme CartePro est une **carte de paiement dans laquelle sont évidés un
C et une puce** : un rectangle 112×80 aux coins arrondis (r 13), un C centré en
(41,40) — rayons 27 et 12,5, ouverture de 100° à droite — et une puce 20×18
posée en (80,31).

Un seul tracé, un seul remplissage, `fill-rule="evenodd"` : le C et la puce sont
des sous-chemins que la règle pair-impair creuse au lieu de peindre. Le
monogramme s'imprime donc dans n'importe quelle encre unique, y compris celle
que le salarié choisit pour sa carte, et il reste lisible jusqu'à 16 px.

## En place

| Fichier            | Où                                                             |
| ------------------ | -------------------------------------------------------------- |
| `mark-purple.svg`  | le monogramme en #4a1b6b, sans fond                            |
| `mark-white.svg`   | le même en blanc, pour les fonds sombres                       |
| `tile-purple.svg`  | blanc sur carré violet 128² — trombinoscopes, vignettes        |

Aucun des deux premiers ne porte de fond : le monogramme se pose sur la surface
qu'on lui donne. Ce sont les mêmes coordonnées en deux encres, parce qu'une
`<img>` ne se recolore pas depuis CSS.

Ces fichiers ne sont **pas** ce que le site affiche par défaut. Le site rend le
logotype composé — voir plus bas ; ces SVG servent aux usages qui réclament un
fichier : brand book, mockups, exports, outils tiers. Pour que le site les
emploie à la place, il suffit de pointer `brand.logo` dessus dans
`backend/theme.json`.

## Le logotype composé

Le logotype complet — monogramme **plus** le nom — n'est pas un fichier : il
vit dans `components/brand/`.

| Composant     | Ce qu'il est                                                       |
| ------------- | ------------------------------------------------------------------ |
| `VectorMark`  | le monogramme en ligne, en `currentColor`                          |
| `WordMark`    | le nom, en Archivo : `Carte` en gras, `Pro` en romain, une encre   |
| `Logotype`    | les deux assemblés, tout en em — une seule taille à régler         |
| `BrandLogo`   | `Logotype`, ou l'image du thème si `brand.logo` en donne une       |

C'est du texte et non un tracé, pour trois raisons : le nom vient de
`brand.name`, donc renommer le produit dans le thème renomme le logotype sans
qu'on redessine une lettre ; les deux graisses sont de vraies fontes servies par
`globals.css`, donc nettes à toute taille ; et le tout hérite de
`currentColor`, ce qu'une image ne peut pas faire — c'est ce qui permet à la
carte de crédit de porter le logotype dans l'encre du salarié.

Le monogramme, lui, est tenu à la main en quatre endroits — `VectorMark.tsx`,
`mark-purple.svg`, `mark-white.svg`, `tile-purple.svg` — plus `app/icon.svg`
et `app/favicon.ico` pour le favicon. Une retouche du tracé se reporte partout.

## Favicon

`app/icon.svg` : le monogramme blanc sur tuile violette, #4a1b6b en thème clair
et #6b2a99 en sombre. Blanc sur tuile et non violet sur transparence, parce
qu'une barre d'onglets a la couleur que le navigateur veut et que #4a1b6b
disparaît sur une barre sombre.

`app/favicon.ico` porte le même dessin en 16/32/48/64/128/256, rasterisé depuis
`icon.svg`. Il se refait avec Chrome et Pillow — voir le commit qui l'a produit.

## Marque précédente, gardée exprès

`legacy/` garde l'identité « Ticket Tout » que le produit portait avant : le
tracé vectorisé (`mark-blue.svg`, `mark-white.svg`, `blue.svg`,
`blue-transparent.svg`, `white-on-blue.svg`, `original.svg`) et, avant lui, le
monogramme à trois barres (`monogram-icon.svg`, `monogram-favicon.ico`).

Rien n'est supprimé, mais rien n'est plus servi non plus : aucun écran, aucun
outil et aucun document ne pointe dessus. Le composant `LogoMark` qui dessinait
le monogramme à trois barres, lui, a été retiré de `components/brand/Marks.tsx`,
faute d'appelant.
