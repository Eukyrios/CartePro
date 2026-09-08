# Journal des modifications — retour à la version 1.0

Établi le **mardi 8 septembre 2026**, en réponse à l'instruction de M. Thomas
Vignal, conseiller numérique au Cabinet (courriel du lundi 7 septembre :
retour à la version 1.0 du cahier des charges du 31 août, retrait du document
annoté du 1er septembre).

Chaque ligne a été vérifiée dans le dépôt à cette date — identifiant de commit,
fichiers touchés, état constaté après coup. Rien n'est reconstitué de mémoire.
**Ce qui n'a pas été fait est dit tel quel, en section 3.**

Branche : `main`. Aucun historique n'a été réécrit (§ 5).

---

## 1. Retraits effectués

| #   | Retrait                                                                                                                                                                                 | Motif                                                                                                          | Commit    | Date             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------- | ---------------- |
| 1.1 | Les quatre partenaires nominatifs — Poney Dream 78, KostumParty, Glaces Artisanales Corrèze, Chapelier Fontaine — retirés du seed, des présentations rédigées, des coups de cœur, des comptes de démonstration, du README et des exemples de code. Remplacés par les six enseignes validées par le service juridique. | Point 1 : ces enseignes ne relèvent plus du périmètre contractuel de la version 1.0                            | `bf98d41` | 2026-09-08 11:37 |
| 1.2 | « Ministre » et « Ministère » dans la copie de l'interface et les commentaires — **59 lignes sur 25 fichiers**. Le répertoire `frontend/components/minister/` est supprimé et recréé en `administration/`.                                                                        | Point 4 : le nom de travail du Ministre disparaît de l'interface et du dépôt                                   | `dc5ec31` | 2026-09-07 16:20 |
| 1.3 | `frontend/components/data/ministerPicks.ts` — la sélection éditoriale écrite en dur dans le front                                                                                       | Point 4, et préalable au point 2                                                                               | `e2a62ee` | 2026-09-07 15:21 |
| 1.4 | Marianne, typographie de l'État — 4 fichiers `woff2` supprimés, remplacés par Archivo (licence OFL)                                                                                     | Point 4 : aucun actif d'État dans un dispositif qui n'est pas un service public                                | `3e46497` | 2026-09-07 17:56 |
| 1.5 | Le bleu institutionnel `#1b3a6b` et ses déclinaisons — **9 occurrences retirées**, palette rotée en violet ; icône, cartes des 51 salariés en base                                       | Point 4                                                                                                        | `3e46497` | 2026-09-07 17:56 |
| 1.6 | Les comptes de démonstration en `@administration.gouv.fr` — **8 occurrences sur 4 fichiers**, remplacées par `@administration.example` (TLD réservé IANA), en base et dans le seed        | Point 4 : un domaine en `.gouv.fr` laisse entendre un service public en exploitation                           | `3e46497` | 2026-09-07 17:56 |
| 1.7 | « in tabulis **Ministerii** scriptum est » dans le faux texte latin, affiché sur 12 fiches partenaires publiques                                                                        | Point 4 : du remplissage n'a pas à porter une mention d'État                                                   | `3e46497` | 2026-09-07 17:56 |
| 1.8 | « © 2026 FRANCE » en pied de page ; les exports du logotype en bleu institutionnel déplacés dans `logo/legacy/`                                                                          | Point 4                                                                                                        | `3e46497` | 2026-09-07 17:56 |
| 1.9 | Dans le brand book et ses planches : « Ministère du Job et Bonheur » (3), « du Ministre » (1), `cartepro.gouv.fr` (2), le bloc-marque ministériel (8 lignes retirées, 2 réécrites)                       | Point 4 — le brand book était explicitement listé « reste à traiter » au 7 septembre                           | `8941a8a` | 2026-09-08 11:37 |

L'inventaire détaillé du chantier de marque, avec ses captures « après », est
dans [`docs/retrait-marque/README.md`](../retrait-marque/README.md), ajouté par
`8d8716b` (2026-09-07 17:58).

Les mots « bloc-marque ministériel » subsistent volontairement en deux endroits
de `tools/build-brandbook.py` et du book qu'il produit : ils y décrivent ce qui
a été retiré et pourquoi la question est sans objet. **Ce n'est pas un
résidu — ne pas le « corriger ».**

---

## 2. Ce qui n'a pas eu à être retiré

Vérifié avant toute affirmation, sur l'arbre et sur la base locale au
8 septembre.

| Objet                                | Constat                                                                                                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Découvert de −150 €** (point 2)    | N'a jamais existé dans le dépôt. Le contrôle strict est en place depuis `5c42918` (2026-09-04 09:57) : `backend/routes/transactions.py` refuse en 400 tout débit supérieur au solde, avec message explicite.                  |
| **Salariés en solde négatif**        | **Zéro sur 51.** Requête sur `instance/app.db` : `somme(abondements) − somme(transactions validées)` est positive ou nulle pour chaque salarié. Il n'y a donc **aucun compte à ramener à zéro**, et aucune migration à écrire à ce titre. |
| **Clics sur le coup de cœur**        | La colonne `coups_de_coeur.nombre_clicks` existe (`d6bf73e`) mais vaut **0 sur les 4 lignes**. Aucun clic n'a jamais été enregistré : **rien à supprimer**, comme demandé en confirmation.                                    |
| **Spécification OpenAPI**            | **Aucun fichier OpenAPI ou Swagger n'a jamais été versionné** (`git log --all --name-only`). Le commit `665faba` porte « OpenAPI » dans son intitulé mais n'a livré que des routes. Il n'y a donc pas d'exemples à corriger.  |
| **Vidéo**                            | Aucune vidéo versionnée ni exportée dans le dépôt.                                                                                                                                                                          |

### Le cas demandé : le compte le plus proche du découvert

Aucun salarié n'étant en négatif, voici le compte qui s'en est le plus approché.
Il vaut démonstration du garde-fou, puisque c'est le refus qui l'a tenu à zéro
plutôt qu'à −10 €.

**Salarié #1 — `salarie0@administration.example`**

| Ligne                             | Montant   | Date       | Écrite ?                          |
| --------------------------------- | --------- | ---------- | --------------------------------- |
| Abondement employeur              | +50,00 €  | 2026-06-01 | oui                               |
| Transaction validée               | −30,00 €  | 2026-06-02 | oui                               |
| Transaction validée               | −20,00 €  | 2026-06-06 | oui                               |
| Opération planifiée de 10,00 €    | —         | 2026-06-11 | **non — refusée, jamais écrite**  |

**Solde résultant : 0,00 €.** La quatrième opération aurait porté le compte à
−10,00 € : elle a été refusée en amont et n'existe nulle part. Aucune migration
n'a donc à passer sur ce compte, ni sur les 50 autres.

Sur l'ensemble du jeu : **200 opérations planifiées, 161 écrites, 39 refusées**,
3 comptes à zéro, 7 sous cinq euros, **aucun négatif**.

---

## 3. Ce qui reste à retirer — non fait au 8 septembre midi

### 3.1 Le « Coup de cœur » est toujours en place (point 2)

Le renommage du 7 septembre (`dc5ec31`, `3e46497`) a traité le **point 4** —
plus aucune personne physique n'est nommée — mais **pas le point 2** :
l'encart éditorialisé existe toujours, sous le nom « coup de cœur de
l'administrateur ». Surface exacte à retirer :

| Emplacement                                                                                               | Ce qui s'y trouve                                                     |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `backend/models.py`                                                                                       | `CoupDeCoeur`, `CoupDeCoeurStatut`, colonne `nombre_clicks` (`d6bf73e`, 2026-09-07 10:44) |
| Base                                                                                                      | table `coups_de_coeur`, **4 lignes, statut `actif`**                  |
| `backend/routes/partenaires.py:96`                                                                        | route publique `GET /api/partenaires/coup-de-coeur`                   |
| `backend/seed.py`                                                                                         | `MOTS_ADMINISTRATEUR` et le semis des coups de cœur                   |
| `frontend/components/administration/`                                                                     | `AdminPickSection.tsx`, `useAdminPick.ts`                             |
| `HeroSection.tsx`, `SectionNav.tsx`, `HomeSwitch.tsx`, `EmployeeSpace.tsx`, `PartnerPayment.tsx`, `partners.ts` | rappels et navigation vers l'encart                              |
| `docs/brand-book/captures/`                                                                               | `coup-de-coeur.png` et `coup-de-coeur-sombre.png`, **ajoutées le 8 septembre** par `8941a8a` |

Un commit `f9156f5` (2026-09-07 17:12, Ilhan Davenne) **désactive** l'encart
côté frontend seulement. Il vit sur `origin/front-homepage-admin`, **n'est pas
fusionné dans `main`**, et ne touche ni le modèle, ni la route, ni la base.
Il ne satisfait pas le point 2.

### 3.2 Les conventionnements sont semés sans décision (point 3)

Le circuit existe : table `Decision`, motif obligatoire (le serveur répond
**422** sans lui), `backend/instruction.py` et `backend/instruire.py`
(`0e83bc8`, 2026-09-07 21:37), et `backend/test_admin_api.py` vérifie qu'une
décision change le statut **et** écrit sa ligne.

Mais rien ne le fait respecter par les données. `backend/seed.py` pose le
statut `valide` directement (`statut_de()`), sans écrire de décision : seuls les
refus en produisent une. Relevé le 8 septembre sur `backend/instance/app.db`
— base encore antérieure à `bf98d41`, donc 16 partenaires :

- `partenaires` : 11 `valide`, 3 `en_attente`, 2 `refuse` ;
- `decisions` : **4 lignes seulement** — 2 refus, 1 réexamen, 1 refus après réexamen ;
- **les 11 conventionnés n'ont aucune décision associée.**

Le seed du 8 septembre en porte 13 : le défaut se reproduit à l'identique, en
plus grand. C'est exactement l'état que le point 3 interdit — conventionné sans
décision ni motif. La régularisation demandée (« régularisation du 07/09 »)
**n'est pas écrite**.

### 3.3 Le sort des écritures pointant sur les partenaires retirés (point 1)

**Non tranché.** Le seed repart d'une base vide, donc le jeu de démonstration
régénéré est propre ; mais une base déjà en service — comme
`backend/instance/app.db` au 8 septembre — porte **39 transactions sur 164 qui
référencent les quatre partenaires retirés** : `chapelier-fontaine` 14,
`glaces-correze` 10, `poney-dream-78` 9, `kostumparty` 6. Ces écritures sont
validées, donc immuables. Le choix (substitution,
anonymisation du libellé, partenaire archivé, contre-écritures), sa
justification en deux lignes, et le script de migration idempotent restent à
produire. Aucune contrainte de clé étrangère n'a été désactivée, et il n'est
pas prévu de le faire.

### 3.4 Résidus nominatifs constatés

| Résidu                                                                                                          | Origine                          | État                                                                             |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| `frontend/public/partenaires/{poney-dream-78,kostumparty,glaces-correze,chapelier-fontaine}.svg`                | recolorisés, non supprimés, par `bf98d41` | **toujours versionnés**, plus référencés par le seed (0 occurrence) — 4 fichiers portant le nom d'enseignes retirées |
| `tools/capture.js:126` — `PARTENAIRE_EN_ATTENTE \|\| "kostumparty"`                                              | introduit par `8941a8a`          | valeur par défaut pointant sur un partenaire qui n'existe plus ; le partenaire en attente est désormais `sport-loisirs-aubagne` |

---

## 4. Ce qui doit continuer de marcher — état vérifié le 8 septembre

| Exigence                                          | État                        | Preuve                                                                                                                                                              |
| ------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Export CSV, **colonnes et ordre inchangés**       | colonnes conformes, **mais voir l'alerte ci-dessous** | `backend/services/csv_service.py` — les six colonnes `id;date_iso8601;employee_id;partner_id;amount_cents;status` et leur ordre sont inchangés depuis `3be8a14` (2026-09-04) |
| `GET /api/v1/employees/{id}/balance`              | contrat identique           | `backend/routes/sirh.py`, inchangé depuis `48c6758` (2026-09-07 14:25) ; ni `bf98d41` ni `8941a8a` n'y touchent. Réponse : `{employee_id, balance, currency:"EUR"}`, 404 documenté |
| Seed déterministe sur base vide                   | vérifié                     | rejoué le 8 septembre : 18 partenaires (13 conventionnés / 3 en attente / 2 refusés), 161 transactions écrites, 39 refusées — **mêmes chiffres qu'avant le remplacement** |
| Tests d'intégrité                                 | au vert                     | 34 tests passés : `test_admin_api.py`, `test_auth_api.py`, `test_mention.py`                                                                                        |

> **Alerte, à porter à la connaissance du Cabinet.** Les colonnes n'ont pas
> bougé, mais le fichier a gagné une **ligne 1 préfixée `#`** portant la mention
> de démonstrateur, ajoutée le 7 septembre par `3e46497`. L'en-tête est donc en
> **ligne 2**. Un lecteur qui ignore les lignes de commentaire (`comment='#'`,
> le comportement par défaut de la plupart des tableurs) retrouve exactement le
> fichier de vendredi ; un lecteur strictement positionnel lira la mention comme
> première ligne de données. Le choix a été fait pour que la mention accompagne
> un fichier qui quitte l'application. **Il est réversible sur demande.**

---

## 5. Historique Git — non réécrit, conformément au point 4

Aucun `rebase`, aucun `filter-branch`, aucune force. Les messages de commit
antérieurs portent encore l'ancien nom de travail et sont conservés en l'état :

| Commit    | Date             | Message                                                                    |
| --------- | ---------------- | -------------------------------------------------------------------------- |
| `85eeb00` | 2026-09-03 | `refactor: changed cartepro to ticket tout`                                       |
| `a896b15` | 2026-09-03 | `feat: brand favicon and icon, finish the ticket tout rename`                     |
| `502b813` | 2026-09-04 | `refactor: improved the section chosen by the minister and swaped logo…`          |
| `a0d3c04` | 2026-09-06 | `refactor: change "coup de coeur d ministre" to display a single partener…`       |
| `f9156f5` | 2026-09-07 | `refactor(frontend): disable coup de cœur du Ministre everywherol` (non fusionné) |

Branches conservées : `backup/pre-claude-trailer`, `backup/pre-msg-rewrite`,
`backup/pre-msg-shorten`, `reconcile/pr7`, et les branches distantes
`origin/front-homepage-admin`, `origin/backend-connection`,
`origin/feat/auth`, `origin/feat/dbSettingUp`, `origin/feat/dbUpdate`.

---

## 6. Les six enseignes en vigueur

Semées par `bf98d41`, fiches rédigées en français, une par catégorie utile.

| Enseigne                     | Catégorie      | Ville     | Slug                           | Statut          |
| ---------------------------- | -------------- | --------- | ------------------------------ | --------------- |
| Le Comptoir du Midi          | restauration   | Marseille | `comptoir-du-midi`             | conventionné    |
| Épicerie Sainte-Claire       | alimentation   | Grenoble  | `epicerie-sainte-claire`       | conventionné    |
| Librairie Vasseur            | culture        | Amiens    | `librairie-vasseur`            | conventionné    |
| Pharmacie du Parc            | santé          | Vincennes | `pharmacie-du-parc`            | conventionné    |
| Transports Régionaux Unifiés | mobilité       | Lyon      | `transports-regionaux-unifies` | conventionné    |
| Sport Loisirs Aubagne        | sport          | Aubagne   | `sport-loisirs-aubagne`        | **en attente**  |

Le dernier est laissé en attente d'examen à dessein : le démonstrateur doit
pouvoir montrer un dossier non conventionné, encaissement et recettes barrés.
