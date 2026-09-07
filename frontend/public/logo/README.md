# Logotypes

Le logotype CartePro est **le nom, et rien d'autre** : « Carte » en Archivo 700,
« Pro » en Archivo 400. Une seule encre, deux graisses. Pas de pictogramme.

Trois marques dessinées ont été essayées devant la barre haute — un C évidé dans
une carte de paiement, la même carte en contour, la carte et ses ondes de sans
contact — et aucune ne tenait à côté du nom sans l'encombrer. Le nom seul a trois
propriétés qu'aucune n'avait ici : il ne rétrécit jamais mal, il n'a rien à faire
comprendre, et il suit `brand.name`, donc renommer le produit dans
`backend/theme.json` renomme le logotype sans qu'on redessine une lettre.

Les deux graisses sont de vraies fontes servies par `globals.css` — la 700 y est
déclarée `700 900`, donc `font-bold` et `font-black` tombent sur le même fichier.
Rien n'est synthétisé par le navigateur.

## En place

| Fichier               | Où                                                |
| --------------------- | ------------------------------------------------- |
| `wordmark-purple.svg` | le nom en #4a1b6b, sans fond                      |
| `wordmark-white.svg`  | le même en blanc, pour les fonds sombres          |
| `tile-white.svg`      | l'initiale en violet dans une boîte blanche, 128² |

Les deux premiers ne portent pas de fond : le logotype se pose sur la surface
qu'on lui donne. Ce sont les mêmes contours en deux encres, parce qu'une `<img>`
ne se recolore pas depuis CSS.

Ce ne sont **pas** ce que le site affiche par défaut. Le site rend le logotype
composé — voir plus bas ; ces SVG servent aux usages qui réclament un fichier :
brand book, mockups, exports, outils tiers. Pour que le site les emploie à la
place, il suffit de pointer `brand.logo` dessus dans `backend/theme.json`.

### Comment ils sont produits

Les lettres y sont des **tracés**, pas du texte : un fichier SVG ne peut pas
compter sur Archivo d'être installée chez celui qui l'ouvre. Ils sont extraits
des `.woff2` du dépôt avec fontTools, à l'approche du logotype composé (-0,02em),
et le `viewBox` est calé au plus juste sur les lettres, débord des rondes
compris, pour que le logotype remplisse sa boîte.

Une retouche du logotype composé — autre corps, autre approche, autre nom — ne se
propage donc pas d'elle-même : il faut régénérer ces fichiers.

## Le logotype composé

Dans l'application, le logotype est du texte, ce qui lui permet de suivre le
thème et le nom servi par le back.

| Composant   | Ce qu'il est                                                     |
| ----------- | ---------------------------------------------------------------- |
| `WordMark`  | le nom : `Carte` en gras, `Pro` en romain, une seule encre       |
| `Logotype`  | ce qu'_est_ le logotype — aujourd'hui `WordMark` et rien de plus |
| `BrandLogo` | `Logotype`, ou l'image du thème si `brand.logo` en donne une     |

`Logotype` reste une couche à lui seul bien qu'il ne tienne qu'une chose : c'est
là que se déciderait le retour d'un pictogramme, et l'endroit où les appelants
regardent. La taille se règle par `text-*` — la barre haute passe `text-[25px]`,
le pied `text-[27px]`, et la carte de crédit `text-[5.9cqw]`, donc sans un seul
pixel.

`WordMark` coupe le nom sur sa capitale intérieure : « CartePro » donne `Carte` +
`Pro`, « Carte Pro » ou « cartepro » reviennent d'un seul morceau et en gras. La
graisse se pose donc sur la coupure de n'importe quel nom, sans qu'une seconde
clé du thème ait à la déclarer.

## Favicon

« CartePro » ne tient pas dans un carré de 16 px. Le favicon garde la seule chose
qui y tienne : **l'initiale, dans une boîte blanche aux bords arrondis**.

La lettre est le C d'Archivo 700 — la fonte du logotype, pas une lettre
redessinée — posée à 60 % de la hauteur de la boîte. La boîte est blanche dans
les deux thèmes : elle porte le violet de marque, qui est la couleur de
l'identité, et le blanc lui donne un fond connu. Sur une barre d'onglets claire
la boîte se fond, mais le C reste lu à 11,3:1 ; sur une barre sombre la boîte
détache l'ensemble.

`app/icon.svg` est ce dessin, `public/logo/tile-white.svg` le même pour les
usages qui réclament un fichier, et `app/favicon.ico` sa rasterisation en
16/32/48/64/128/256 — faite avec Chrome et Pillow, voir le commit qui l'a
produite.

## Marques précédentes, gardées exprès

`legacy/` garde tout ce que le produit a porté avant, et rien n'y est servi :
aucun écran, aucun outil, aucun document ne pointe dessus.

| Fichiers                                                       | Ce que c'était                                   |
| -------------------------------------------------------------- | ------------------------------------------------ |
| `card-c-*.svg`                                                 | la carte au C et à la puce évidés, écartée       |
| `mark-*.svg`, `blue*.svg`, `white-on-blue.svg`, `original.svg` | le tracé vectorisé « Ticket Tout »               |
| `monogram-icon.svg`, `monogram-favicon.ico`                    | le monogramme à trois barres, plus ancien encore |

Les composants qui les dessinaient — `VectorMark` pour la carte au C, `LogoMark`
pour les trois barres — ont été retirés de `components/brand/` faute d'appelant.
L'artwork reste, donc la décision est réversible sans rien redessiner.
