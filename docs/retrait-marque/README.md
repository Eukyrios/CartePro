# Retrait des marqueurs d'État — inventaire et preuve

Établi le 7 septembre 2026. Chaque ligne a été vérifiée dans le dépôt, pas
reconstituée de mémoire.

## 1. Ce qui portait une marque d'État, et ce qui en a été fait

| Emplacement                                                | Ce qui s'y trouvait                                                                    | État                                                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `frontend/public/fonts/Marianne-*.woff2` (4 fichiers)      | Marianne, la typographie de l'État                                                     | **supprimés**, remplacés par Archivo (8 woff2, licence OFL)                                 |
| `frontend/app/globals.css`                                 | 31 valeurs de bleu institutionnel                                                      | **rotées** en violet sombre (teinte 275°)                                                   |
| `frontend/app/icon.svg`                                    | tuile bleu institutionnel (`#1b3a6b`, variante sombre `#3f6897`)                       | **retintée** en violet (`#4a1b6b` / `#6b2a99`)                                              |
| Copie de l'interface — 20 fichiers                         | « Ministère », « Ministre », « du Ministre »                                            | **remplacés** par « administration » / « administrateur »                                    |
| Commentaires de code — 8 fichiers                          | « the ministry vouches for », « the Minister's selection »…                             | **remplacés**                                                                               |
| `backend/seed.py` — faux texte latin                       | « in tabulis **Ministerii** scriptum est » (affiché sur 12 fiches partenaires publiques) | **remplacé** par « in tabulis nostris », et les 12 fiches migrées en base                    |
| Jeu de données de démonstration                            | 52 comptes en `@administration.`**`gouv.fr`**                                          | **remplacés** par `@administration.example` (TLD réservé IANA), en base et dans le seed      |
| `frontend/components/layout/Footer.tsx`                    | « © 2026 **FRANCE** »                                                                   | **remplacé** par « © 2026 CartePro »                                                         |
| `frontend/public/logo/{blue,white-on-blue,original}.svg`   | exports du logotype en bleu institutionnel                                             | **déplacés** dans `logo/legacy/`                                                            |
| Cartes de paiement des 51 salariés (base)                  | `couleur_carte = #1b3a6b`                                                              | **retintées** en `#4a1b6b`                                                                  |

## 2. Où figure la mention

Texte exact, source unique : `frontend/components/legal/mention.ts`, doublé
côté serveur par `backend/mention.py`. `backend/test_mention.py` compare les
deux copies et échoue si l'une dérive.

> Démonstrateur technique, ne constitue pas un service public en exploitation.

| Emplacement                    | Mécanisme                                                  | Vérifié                        |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------ |
| Toutes les pages               | pied de page, monté une fois dans le gabarit racine        | mesuré sur 6 pages             |
| Page 404                       | `frontend/app/not-found.tsx` (créée)                       | HTTP 404 + mention, en production |
| Page d'erreur serveur          | `frontend/app/error.tsx` (créée)                           | rendu observé                  |
| Erreur de gabarit racine       | `frontend/app/global-error.tsx` (créée)                    | rendu observé                  |
| Description de la page         | `metadata.description`                                     | mesuré                         |
| Balises de partage             | `openGraph` + `twitter` (créées)                           | mesuré                         |
| Manifeste de l'application     | `frontend/app/manifest.ts` (créé)                          | mesuré                         |
| Export CSV                     | 1re ligne, préfixée `#` ; l'en-tête reste en ligne 2       | test automatisé                |

## 3. Captures « après »

`captures/` — les cinq écrans les plus visibles, plus le pied de page, en
1440×900, thème clair, depuis une **construction de production** :

| Fichier                   | Écran                          |
| ------------------------- | ------------------------------ |
| `00-pied-de-page.png`     | le pied de page et la mention  |
| `01-accueil.png`          | vitrine publique               |
| `02-espace-salarie.png`   | espace salarié                 |
| `03-fiche-partenaire.png` | fiche partenaire               |
| `04-parametres.png`       | paramètres du compte           |
| `05-page-404.png`         | page 404                       |

Chaque écran a aussi sa capture `-pied.png`, pied de page à l'écran.

## 4. Ce qui reste à traiter

- **`docs/brand-book/`** — le brand book, ses 15 pages PNG, son PDF et
  `mockups.html` portent encore « Ministère du Job et Bonheur », « validé par
  le Ministre », « Zone réservée au bloc-marque ministériel » et
  `cartepro.gouv.fr`. Documents non repris : ils n'ont été ni corrigés ni mis
  de côté.
- **`docs/03_Projet_CGU_Ticket_Tout.docx`** — divergent de sa transcription
  `frontend/components/legal/cgu.ts`, et son nom porte encore l'ancienne marque.
- **Contraste** — `tools/contrast.py` : 26 paires mesurées, 2 sous le seuil.
  Les deux concernent le filet neutre `#d7d7d9`, antérieur à ce chantier. La
  conformité RGAA n'est donc pas acquise et ne doit pas être affirmée.

## 5. Ce qui n'a jamais existé

À vérifier avant toute affirmation contraire, l'historique Git ayant été
consulté (`git log --all --name-only`) :

- **aucun bloc-marque de l'État**, aucun logo de ministère, aucun « Liberté ·
  Égalité · Fraternité », aucun logotype « RF » n'a jamais figuré dans les
  interfaces. Le seul actif de l'État présent a été Marianne, la typographie.
  Le fichier `docs/brand-book/captures/bloc-marque.png` montre le bloc-marque
  **du produit**, pas celui de l'État.
- **aucun envoi d'e-mail** : le projet n'embarque aucune bibliothèque de
  messagerie et n'expédie aucun message. Il n'y a pas d'e-mail transactionnel
  où placer la mention.
- **aucun gabarit d'export PDF** dans l'application. Le seul PDF produit est
  le brand book, par `tools/assemble-pdf.py`.
- **aucune vidéo** exportée ou versionnée.
- **aucune capture dans le README**, ni à la racine ni dans `frontend/`.
