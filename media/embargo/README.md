# Visuels sous embargo

**Ces fichiers ne sont pas diffusables.** Ils attendent l'accord écrit de
Benjamin Sellami, conseiller en communication du cabinet. Le gel de
communication était toujours actif à leur fabrication : ils sont préparés, pas
publiés.

Demandés le 9 septembre 2026, livrés le 10 septembre 2026.

## Ce que contient le dossier

| Fichier                  | Format      | Sujet                                        |
| ------------------------ | ----------- | -------------------------------------------- |
| `cartepro_social_01.png` | 1080 × 1350 | Le solde et l'historique                     |
| `cartepro_social_02.png` | 1080 × 1350 | Le paiement chez un partenaire               |
| `cartepro_social_03.png` | 1080 × 1350 | Le réseau de partenaires                     |
| `cartepro_mockup_01.png` | 1600 × 1200 | La carte en situation, posée sur un comptoir |
| `planches.html`          | source      | Les quatre planches, en HTML/CSS             |

Le mockup ne suit pas la série `cartepro_social_*` : ce n'est pas un visuel de
réseau social, et lui donner le numéro 04 de la série l'aurait fait passer pour
tel dans un dossier de presse.

## Régénérer

```bash
node tools/shots.js media/embargo/planches.html media/embargo 1
```

**L'échelle 1 en dernier argument n'est pas optionnelle.** `shots.js` double par
défaut, et la commande porte sur un format exact : sans elle, les visuels
sortent en 2160 × 2700.

Rien n'est chargé en ligne : les polices, le logotype, les vignettes
partenaires et la capture du QR viennent du dépôt.

## Ce qui a été vérifié, et comment

- **Dimensions** : lues dans l'en-tête IHDR des PNG livrés. 1080 × 1350 au pixel
  près pour les trois visuels sociaux.
- **Aucun bloc-marque, aucune Marianne, aucune mention de ministère** : le texte
  rendu de chaque planche a été relu automatiquement contre cette liste. Les
  logotypes employés sont les logotypes produit du dépôt, qui ne portent que le
  nom.
- **Le pied réglementaire est dans le cadre** : mesuré, 66 px de marge sous le
  pied pour les trois visuels sociaux, 42 px pour le mockup. `[data-shot]` porte
  `overflow: hidden`, donc un pied qui dépasse est un pied coupé — c'est arrivé
  à la première version du visuel 03, dont la grille débordait.
- **La mention est la phrase validée au caractère près**, comparée à
  `frontend/components/legal/mention.ts`, qui en est la source unique.
- **Contraste du pied** : échantillonné sur les pixels livrés, pas déduit du
  CSS. 6,77:1 sur papier, 9,29:1 sur le comptoir — au-dessus du seuil AA de
  4,5:1.
- **Longueur des messages** : 5, 6 et 6 mots. La commande en demandait moins de
  dix.
- **Aucun débordement** : zéro élément hors cadre sur les quatre planches.

## Deux limites à connaître avant de diffuser

**Le mockup est un rendu graphique, pas une photographie**, et il le dit
lui-même dans son pied. Aucune image générée n'a été employée. Si le cabinet
veut une photographie, il faut un cliché réel — la carte peut y être incrustée
ensuite.

**Les établissements nommés sont fictifs.** Le visuel 03 le porte dans son pied.
Ils viennent du jeu de démonstration : cinq conventionnés, à l'exclusion du
dossier encore en attente d'instruction, qu'un visuel de communication ne peut
pas présenter comme conventionné.
