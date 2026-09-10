# CartePro

Démonstrateur du crédit salarié de l'« Administration » : un employeur
crédite ses salariés, qui dépensent chez des partenaires conventionnés.

Front Next.js 15 (App Router, Tailwind v4), back Flask + **Postgres**. Le
moteur n'est pas un détail d'hébergement : le journal d'audit ne tient sa
garantie d'ajout seul que d'un privilège refusé en base, et SQLite n'a ni
utilisateur ni privilège — c'est un fichier, pas un serveur. Voir
« Le journal d'audit » plus bas. La suite de tests, elle, reste sur SQLite : un
chaînage d'empreintes se vérifie sans serveur, et `pytest` ne doit pas exiger
Docker.

## Démarrer

```bash
make install            # environnement Python du back, dépendances du front — une fois
cp backend/.env.example backend/.env   # y mettre les mots de passe et la clé HMAC
make postgres-up        # le conteneur Postgres (docker-compose.yml)
make provision-postgres # les tables, le rôle applicatif, le REVOKE sur audit_log
make seed               # jeu de données déterministe (⚠ efface la base)
make dev                # back sur :5000, front sur :3000
```

**L'ordre n'est pas indifférent.** `provision-postgres` crée les tables en
superutilisateur, pour qu'il en reste le propriétaire : sous Postgres, le
propriétaire d'une table garde tous ses droits dessus quoi que dise un REVOKE,
donc l'application ne doit surtout pas être propriétaire du journal qu'elle
écrit. L'application se connecte avec `cartepro_app`, qui ne peut ni créer ni
supprimer une table — voir `backend/db_uri.py`, qui explique les deux adresses.

`make seed` fait du DDL (il commence par un `drop_all()`), donc il se connecte
en superutilisateur et **rend les privilèges** en repartant : sans ce
rattrapage, il laissait une base parfaitement peuplée sur laquelle
l'application n'avait plus aucun droit.

`make dev` lance les deux serveurs et les arrête ensemble avec Ctrl+C. Sans
`make install` au préalable, le script s'arrête avec un message plutôt que de
démarrer un backend sans Flask.

`make seed` n'est pas optionnel après le passage au schéma normalisé : une base
née avant lui n'a pas les mêmes tables, et `db.create_all()` ne migre rien.

**Sans Docker**, le dépôt reste utilisable : sans `TICKET_TOUT_DATABASE_URI`
configurée, tout retombe sur SQLite (`backend/instance/app.db`) et l'ensemble
fonctionne — sauf la démonstration du privilège refusé, qui n'a alors plus
d'objet.

### Comptes de démonstration

Mot de passe commun à tous les comptes : `CartePro2026`.

Les montants ci-dessous sont ceux que `make seed` écrit. Ils bougent dès qu'on
se sert du démonstrateur — un paiement, une dotation — et `make seed` les
remet à l'identique.

**Salariés** — adresses en `…@administration.example`

| Compte           | Ce qu'il montre                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `camille.durand` | Le parcours complet : la carte, le QR de paiement, l'historique avec son crédit employeur et ses paiements. **32,50 €** au sortir du seed |
| `salarie0`       | Le solde épuisé — 0,00 € : tout partenaire refuse, et l'écran dit pourquoi                                                                |
| `salarie5`       | Le solde tout juste, sous cinq euros : seule l'Épicerie Sainte-Claire (4,50 €) passe, les quatre autres conventionnés refusent            |
| `salarie19`      | L'historique dense : assez d'opérations pour exercer les filtres et la pagination                                                         |
| `salarie38`      | Le solde confortable, pour enchaîner les paiements sans buter sur le refus                                                                |
| `salarie7`       | **Suspendu** : la connexion est refusée, et l'écran « Les comptes » porte le motif de la mesure                                           |
| `salarie2`       | **Clôturé**, solde nul : connexion refusée, et une clôture ne se lève pas                                                                 |

Le panel complet va de `salarie0` à `salarie49` — 51 comptes avec celui de
démonstration.

**Partenaires** — l'adresse de connexion est `contact@<slug>.fr`

| Slug                           | Statut         | Ville     | Ticket  | Ce qu'il montre                                                                               |
| ------------------------------ | -------------- | --------- | ------- | --------------------------------------------------------------------------------------------- |
| `comptoir-du-midi`             | conventionné   | Marseille | 16,50 € | L'espace complet : encaisser, le réseau, les recettes                                         |
| `epicerie-sainte-claire`       | conventionné   | Grenoble  | 4,50 €  | Le moins cher du réseau — le seul qu'un solde sous cinq euros peut payer                      |
| `librairie-vasseur`            | conventionné   | Amiens    | 22,00 € | Une fiche rédigée : présentation, horaires, site                                              |
| `pharmacie-du-parc`            | conventionné   | Vincennes | 13,80 € | Le secteur santé du réseau, avec horaires et matériel à la location                           |
| `transports-regionaux-unifies` | conventionné   | Lyon      | 42,00 € | Le ticket le plus élevé : celui qui bute le plus souvent sur un solde insuffisant             |
| `sport-loisirs-aubagne`        | **en attente** | Aubagne   | 19,00 € | Encaissement et recettes **barrés** — l'accès dépend du conventionnement, pas de la connexion |

**Administration** — `admin@administration.example`. L'espace d'administration
**est** sa page d'accueil : les dossiers qui attendent une décision, les
comptes des deux côtés du comptoir, le tableau de bord national et l'écran qui
crédite. Un dossier s'ouvre à `/dossier/<slug>`, les recettes d'un
établissement à `/recettes/<slug>`, l'historique d'un salarié à
`/depenses/<id>`.

> **Une connexion refusée avec le bon mot de passe n'est pas une panne.**
> `check_credentials` exige un compte actif, donc un compte suspendu ou clôturé
> reçoit exactement le même message qu'un mot de passe faux — pour ne pas
> révéler quels comptes existent. Si un compte de démonstration n'entre plus,
> lisez son statut dans « Les comptes », ou relancez `make seed`.

Sans être connecté : la vitrine, le coup de cœur des utilisateurs, et la fiche
publique d'un partenaire — où la carte est barrée et invite à se connecter.

### Ce que le seed contient

`make seed` écrit un jeu déterministe : les mêmes chiffres à chaque exécution,
après un `db.drop_all()` qui efface tout ce qui précède.

- **6 partenaires** : 5 conventionnés, 1 en attente d'examen. Six villes et six
  catégories — alimentation, culture, mobilité, restauration, santé, sport —
  soit une par établissement. Les six fiches sont rédigées en français, avec
  présentation, horaires et site.
- **51 salariés** — les 50 du panel plus le compte de démonstration —
  rattachés à un employeur unique, « Administration ». 49 actifs, 1 suspendu,
  1 clôturé ; les deux mesures portent leur motif écrit.
- **200 opérations planifiées, 161 écrites**, 39 refusées. Une opération
  refusée ne s'écrit pas : le schéma n'a pas de statut « refusée », et c'est
  juste — un paiement refusé n'a pas eu lieu, ce n'est pas une écriture
  comptable. Le refus reste démontrable en direct, en tentant d'encaisser plus
  que le solde disponible.
- **Les cas limites** demandés : 3 soldes à zéro, 7 sous cinq euros.
- **Un export `backend/transactions.csv`**, régénéré à chaque passage.
- **Aucune décision d'instruction.** La table `decisions` part vide : les cinq
  conventionnés le sont d'emblée, et le dossier en attente n'a jamais été
  instruit. La première ligne s'écrit au premier geste, à l'écran ou avec
  `instruire.py`.

> **Deux écarts connus dans le seed**, à corriger côté code et non ici.
> Son message de fin annonce « 5 conventionnes, 3 en attente, 2 refuses » pour
> six établissements : les compteurs `EN_ATTENTE` et `REFUSES` de `seed.py`
> nomment encore quatre enseignes retirées de `NETWORK`, et la ligne les
> compte.
> Conséquence directe : **aucun partenaire refusé n'existe plus**, donc l'écran
> qui montre à un établissement écarté sa décision et son motif — le seul
> endroit où ce motif est lisible — n'a plus de données pour se démontrer.

### Mettre en ligne sans les identifiants

Le panneau ci-dessus est commode en démonstration et n'a rien à faire sur un
site ouvert. Deux constructions de production, selon ce qu'on veut montrer :

```bash
make prod        # construit et sert le front, identifiants retirés du paquet
make prod-demo   # la même chose, identifiants affichés — c'est un choix explicite
```

Les deux cibles **refusent de démarrer tant que le port 3000 est pris** :
arrêtez `make dev` avant. Ce n'est pas une politesse envers le port — une
construction de production efface `frontend/.next`, que le serveur de
développement lit au même moment, et `next build` échoue alors en
`MODULE_NOT_FOUND` (« Cannot find module './611.js' ») **en laissant le serveur
de développement en erreur 500** jusqu'au prochain redémarrage.

`make prod` pose `NEXT_PUBLIC_COMPTES_DEMO=0`. Cette variable fait deux choses
qu'il vaut la peine de ne pas confondre :

|                                 | Bloc à l'écran | Chaînes dans le JavaScript livré |
| ------------------------------- | -------------- | -------------------------------- |
| `make dev`                      | affiché        | présentes                        |
| `make prod`                     | absent         | **absentes**                     |
| `make prod-demo`                | affiché        | présentes                        |
| production **sans** la variable | absent         | **présentes**                    |

La dernière ligne est le piège. Le bloc disparaît de lui-même dès que la
construction est une construction de production, mais une variable
`NEXT_PUBLIC_*` non définie se compile en lecture à l'exécution et non en
constante : le minifieur ne peut donc pas supprimer la branche morte, et les
trois adresses et le mot de passe restent lisibles dans les sources du
navigateur alors que l'écran, lui, est propre. Mesuré des deux façons.

**Un hébergeur — Vercel compris — doit donc poser `NEXT_PUBLIC_COMPTES_DEMO=0`
dans sa configuration**, sinon le site est présentable mais le paquet contient
encore les identifiants. Le drapeau et son explication tiennent dans
`frontend/components/account/demoAccounts.ts`.

Ces deux cibles ne lancent que le front : en production le backend est servi
ailleurs, et `NEXT_PUBLIC_API_URL` dit où (voir `frontend/next.config.ts`).

## L'API

Toutes les routes sont sous `/api`, échangent du JSON, et vivent dans
`backend/routes/` — sauf l'authentification, montée à la main dans `app.py`.
Le front n'appelle jamais le backend par son adresse : `next.config.ts` proxifie
`/api`, ce qui évite CORS en développement comme en production.

**L'authentification** est un jeton JWT porté par l'en-tête
`Authorization: Bearer <jeton>`, obtenu par `POST /api/auth/login`. Son identité
est `genre:id` — `salarie:39`, `partenaire:2`, `admin:1` — et il porte une
revendication `role` valant `user`, `partenaire` ou `admin`. Côté navigateur, le
jeton va dans `localStorage` si « Se souvenir de moi » est coché, dans
`sessionStorage` sinon : l'onglet fermé, la session est perdue.

### Qui peut quoi

Les tableaux qui suivent emploient quatre niveaux d'accès :

| Niveau                             | Ce qu'il exige                                                              |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `public`                           | rien du tout                                                                |
| `connecté`                         | un jeton valide, n'importe quel rôle                                        |
| `titulaire`                        | le compte concerné, et lui seul — un autre compte reçoit 404, l'admin aussi |
| `salarié` · `partenaire` · `admin` | ce rôle précisément                                                         |

Les refus sont uniformes : **401** sans jeton (`Missing Authorization Header`),
**403** avec un jeton du mauvais rôle. Mesuré route par route sur les vingt-deux
routes de lecture, avec quatre identités — anonyme, salarié, partenaire, admin —
et c'est ce que la liste `ROUTES` de `backend/test_admin_api.py` tient sous test.

### Public — aucun jeton

| Route                                | Ce qu'elle rend                                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/theme/`                    | L'identité visuelle : couleurs des deux thèmes, polices, logotype                                                                |
| `GET /api/partenaires/catalogue`     | Le réseau entier, 18 champs par fiche. Jeton **optionnel** : il ne sert qu'à remplir `liked_by_user`                             |
| `GET /api/partenaires/categories`    | Les catégories du réseau                                                                                                         |
| `GET /api/partenaires/coup-de-coeur` | La fiche la plus aimée, plus son `mot`                                                                                           |
| `GET /health`                        | État, version, environnement — aucune donnée métier                                                                              |
| `POST /api/auth/login`               | `{email, password}` → jeton et profil                                                                                            |
| `POST /api/auth/register`            | `{email, password, username, audience, partner?}` → 201. Un partenaire naît **en attente** ; 409 si l'email ou le SIREN est pris |
| `POST /api/auth/logout`              | Une politesse : le jeton est sans état, c'est le client qui l'efface                                                             |

### Compte connecté

| Route                      | Accès     | Ce qu'elle fait                                                                                                 |
| -------------------------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| `GET /api/auth/me`         | connecté  | Le profil du porteur du jeton, salarié, partenaire ou admin                                                     |
| `PUT /api/auth/profile`    | titulaire | Identité, fiche partenaire, style de carte, couleur d'avatar                                                    |
| `PUT /api/auth/password`   | titulaire | `{currentPassword, newPassword}` — 401 si l'actuel est faux, 400 sous six caractères                            |
| `DELETE /api/auth/account` | titulaire | Supprime le compte — **409 s'il porte des opérations** : elles sont immuables, donc il ne peut plus disparaître |
| `GET /api/transactions/me` | connecté  | Ses mouvements : crédits et paiements pour un salarié, encaissements pour un partenaire                         |

### Espace salarié

| Route                               | Accès     | Ce qu'elle fait                                                                          |
| ----------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `POST /api/salaries/paiement/qr`    | salarié   | Le QR de paiement : PNG en base64, jeton brut et date d'expiration. **5 minutes**        |
| `GET /api/salaries/<id>/solde`      | titulaire | Son solde, et le sien seulement — un autre salarié, l'administrateur compris, reçoit 404 |
| `POST /api/partenaires/<slug>/like` | salarié   | Pose ou retire le coup de cœur ; c'est lui qui désigne le `featured` du catalogue        |

### Espace partenaire

| Route                            | Accès                      | Ce qu'elle fait                                                                                                                                                                                                                              |
| -------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/transactions/valider` | partenaire **du paiement** | Encaisse : décode le QR, verrouille la ligne du salarié (`SELECT … FOR UPDATE`), écrit la transaction. 403 si le jeton n'est pas celui de l'établissement visé, 403 si l'établissement n'est pas conventionné, 400 si le solde ne suffit pas |
| `POST /api/partenaires/reexamen` | partenaire                 | Redépose un dossier refusé — 409 si le dossier n'est pas refusé                                                                                                                                                                              |

Rejouer le même QR ne crédite rien deux fois : `idempotency_key` porte le jeton,
et un second appel renvoie **200** avec la transaction d'origine au lieu d'en
écrire une nouvelle.

### Administration — les dossiers

Toutes ces routes portent `@admin_required` (`backend/decorators.py`).

| Route                                          | Ce qu'elle fait                                                                                                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/partenaires/demandes`          | Les dossiers en attente, avec leur historique de décisions                                                                                                                    |
| `GET /api/admin/partenaires`                   | Les conventionnés                                                                                                                                                             |
| `GET /api/admin/partenaires/<slug>`            | Un dossier complet : identité, fiche, décisions, encaissements                                                                                                                |
| `POST /api/admin/partenaires/<slug>/approuver` | `{motif}` — conventionne                                                                                                                                                      |
| `POST /api/admin/partenaires/<slug>/refuser`   | `{motif}` — écarte, et c'est ce motif que le titulaire lira, lui seul                                                                                                         |
| `POST /api/admin/partenaires/<slug>/suspendre` | `{motif}` — suspend ; l'établissement ne peut plus encaisser                                                                                                                  |
| `POST /api/admin/partenaires/<slug>/cloturer`  | `{motif}` — **définitif** : l'établissement quitte le dispositif                                                                                                              |
| `DELETE /api/partenaires/admin/supprimer/<id>` | Supprime un établissement, ou le **suspend** s'il porte des transactions. Le rôle est vérifié dans le corps de la route et non par le décorateur — même refus, autre écriture |

### Administration — les comptes et l'argent

| Route                                           | Ce qu'elle fait                                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET /api/admin/comptes[?genre=&statut=]`       | Les comptes **des deux côtés** — salariés et établissements — leur état, leur solde et leurs mesures |
| `GET /api/admin/comptes/<id>`                   | Un compte, avec l'historique complet de ses mesures                                                  |
| `GET /api/admin/comptes/<id>/mouvements`        | Ses crédits et ses paiements — même calcul que `/api/transactions/me`                                |
| `POST /api/admin/comptes/<id>/activer`          | `{motif}` — lève une suspension                                                                      |
| `POST /api/admin/comptes/<id>/suspendre`        | `{motif}` — le titulaire ne se connecte plus ; réversible                                            |
| `POST /api/admin/comptes/<id>/cloturer`         | `{motif}` — **définitif** ; rend le solde résiduel dans sa réponse                                   |
| `GET /api/admin/tableau-de-bord`                | Volume, partenaires actifs, courbe mensuelle, répartition par département — en un seul appel         |
| `GET /api/admin/abondements[?salarie=&limite=]` | Les crédits versés, du plus récent au plus ancien                                                    |
| `POST /api/admin/abondements`                   | `{salarieIds, montantCents, reference}` — crédite un lot de comptes                                  |
| `GET /api/admin/transactions`                   | Tous les paiements validés, en JSON                                                                  |
| `GET /api/admin/transactions.csv`               | Les mêmes en CSV, pour l'emporter — mention de démonstrateur en ligne 1, en-tête en ligne 2          |
| `POST /api/admin/transactions/<id>/annuler`     | `{motif}` — écrit une **contre-écriture**, jamais une modification                                   |
| `PUT /api/theme/`                               | L'identité visuelle, enregistrée dans `theme.json` — écran Style de `/parametres`                    |

### Administration — le journal d'audit

Préfixe `/api/v1/admin` et non `/api/admin` : c'est celui que la Cour des
comptes attend, au caractère près. Même `@admin_required`, donc mêmes refus.

| Route                            | Ce qu'elle rend                                                             |
| -------------------------------- | --------------------------------------------------------------------------- |
| `GET /api/v1/admin/audit`        | Le journal, filtrable `depuis`/`jusque`/`acteur`/`action`, paginé (200 max) |
| `GET /api/v1/admin/audit/export` | Le même en JSON signé (HMAC-SHA256), avec le condensé de la chaîne          |

### Interopérabilité

| Route                                | Accès        | Ce qu'elle rend                                         |
| ------------------------------------ | ------------ | ------------------------------------------------------- |
| `GET /api/v1/employees/<id>/balance` | **public** ⚠ | `{employee_id, balance, currency:"EUR"}`, 404 documenté |

Le §3.3 du cahier des charges exige « un endpoint permettant à un système tiers
d'interroger le solde d'un salarié », prévu pour les SIRH employeurs, et c'est
celui-là. **Il n'a aucun contrôle d'accès aujourd'hui**, et l'identifiant est un
entier séquentiel : les 51 soldes se lisent sans compte, en une boucle. Le
cahier des charges n'exige nulle part qu'il soit ouvert — « un système tiers »
nomme un appelant, pas une absence de contrôle. Une clé partagée en en-tête le
fermerait sans toucher au contrat JSON, qui est gelé par
`docs/journal-retour-v1/README.md`. Décision à prendre.

### Technique

| Route                                   | Accès  | Remarque                                                                                                                                                |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /apidocs/` · `GET /apispec_1.json` | public | Swagger UI monté par `flasgger` (`app.py`). **La spec ne déclare aucun chemin** : aucune route ne porte de docstring OpenAPI. À remplir ou à débrancher |

### Ce que le serveur tient, et pas l'écran

- **Une mesure se motive.** `422` sans motif, pour un compte comme pour un
  dossier — sauf l'annulation d'un paiement, qui répond `400`. L'état change
  **et** la ligne s'écrit dans `decisions` ou `mesures_compte`, jamais l'un
  sans l'autre, et rien ne s'efface : un compte suspendu puis réactivé puis
  clôturé garde ses trois lignes.
- **Une clôture ne se lève pas**, des deux côtés du comptoir : la route qui
  rouvrirait répond `409`. Clôturer ne supprime rien non plus — les
  transactions sont immuables, un solde reste calculable, les encaissements
  d'un établissement restent lisibles après coup. Ce n'est pas un refus : un
  dossier écarté se réexamine, un compte clôturé se redépose.
- **Créditer exige une clé d'idempotence.** C'est la seule route qui crée de
  l'argent sur un compte : `reference` est obligatoire (`422` sans elle), et
  renvoyer la même clé rend la **même** réponse avec `rejoue: true` au lieu de
  créditer une seconde fois. Le lot est atomique — un seul compte fermé ou
  inconnu, et rien n'est écrit.
- **Le statut d'un établissement s'applique côté serveur.** L'interface barre
  déjà l'encaissement à un établissement en attente ou écarté, mais une
  barrière d'interface n'est pas un contrôle d'accès : sans la vérification de
  `routes/transactions.py`, un appel direct encaissait quand même.
- **La carte est exacte au département, jamais à l'adresse.** L'écran dessine
  une France en aplats, agrégés depuis le code postal. C'est ce que la donnée
  permet : le réseau porte une adresse, pas des coordonnées, donc une épingle
  demanderait de géocoder — d'inventer une précision qui n'existe pas. Le fond
  de carte est fabriqué une fois par `python3 tools/build-carte.py` dans
  `frontend/public/carte/` et servi comme un fichier statique : aucune
  bibliothèque de cartographie, aucun appel à un tiers.

`backend/test_admin_api.py` vérifie deux choses séparément : que chaque route
refuse ce qu'elle doit refuser, et qu'une décision change le statut **et**
écrit sa ligne. Sa liste `ROUTES` couvre **19 des 23 routes d'administration**
ci-dessus, journal compris ; les quatre qui manquent au test de refus sont
`GET /api/admin/comptes/<id>/mouvements`, `GET /api/admin/transactions`,
`PUT /api/theme/` et `DELETE /api/partenaires/admin/supprimer/<id>` — toutes
gardées, aucune sous test. `backend/test_admin_espace.py` couvre le motif obligatoire, la
clôture définitive, l'historique qui ne s'efface pas et la dotation envoyée
deux fois qui ne crédite qu'une fois. `backend/test_audit_couverture.py` couvre
ce que le journal consigne de ces gestes — et ce qu'il ne consigne pas.

## Exploiter le dispositif

Quatre gestes qui ne passent pas par le navigateur, ou pas seulement :
instruire un dossier, changer l'identité visuelle, lire le journal d'audit,
faire évoluer une base déjà en service.

### Instruire un dossier

Deux chemins, un seul geste. À l'écran, avec le compte d'administration :
l'accueil **est** la liste des dossiers, et chaque ligne ouvre `/dossier/<slug>`,
où la décision se prend. Il n'y a pas de préfixe `/admin` — comme pour un
salarié ou un partenaire, la page d'accueil est l'espace du compte. En ligne de
commande, sans passer par le navigateur :

```bash
cd backend
python instruire.py                                              # l'état des six dossiers
python instruire.py accepter sport-loisirs-aubagne "motif écrit"
python instruire.py refuser  sport-loisirs-aubagne "motif écrit"
```

Les deux appellent le même code — `backend/instruction.py` — précisément pour
qu'une décision prise à l'écran et une décision prise au clavier laissent la
même trace. Chaque geste écrit une décision **motivée** dans la table
`decisions`, et rien n'est effacé : les précédentes restent. C'est ce que la
traçabilité exige, et c'est ce que le partenaire lit dans son espace — lui
seul. Le catalogue public donne le statut d'un établissement, jamais le motif
d'une décision : le statut est un fait, le motif est un dossier.

Le motif est obligatoire, refus comme acceptation : le serveur répond 422 sans
lui.

Au sortir du seed, `python instruire.py` liste six dossiers dont **aucun ne
porte de décision**, et `sport-loisirs-aubagne` est le seul en attente : c'est
donc là que le premier geste s'exerce.

### Changer l'identité visuelle

Couleurs, polices et logotype vivent dans **`backend/theme.json`**. On ouvre le
fichier, on change une valeur, on recharge la page : rien à recompiler, rien à
redémarrer. Le front lit `GET /api/theme` et pose une feuille de style qui
surcharge celle qu'il embarque.

Deux façons d'éditer, le même fichier au bout des deux : l'éditeur de texte, ou
**`/parametres` → Style** avec un compte d'administration, qui écrit par
`PUT /api/theme` et applique le thème sans même recharger. L'écran couvre le nom
de marque, les deux polices et les dix couleurs de chaque thème ; il ne touche
pas aux chemins de logotype, qui désignent des fichiers de `frontend/public`.

```json
"colors": { "light": { "accent": "#4a1b6b" }, "dark": { "accent": "#c186e8" } },
"fonts":  { "sans": "\"Archivo\", Arial, sans-serif" },
"brand":  { "name": "CartePro", "logo": "/logo/wordmark-purple.svg" }
```

Ce que le fichier ne dit pas retombe sur les valeurs compilées dans
`frontend/app/globals.css`, qui restent la référence — un serveur muet laisse le
site exactement tel qu'il est livré. Deux thèmes, clair et sombre, parce
qu'aucune clarté unique ne tient sur du blanc **et** sur du presque noir.

`brand.logo` vide affiche le logotype vectorisé du composant, qui prend la
couleur d'accent et suit donc le thème. Y mettre un chemin — le fichier va dans
`frontend/public/` — affiche cette image à la place. Le solde de la carte, lui,
garde sa couleur propre : elle appartient au salarié, qui la choisit dans ses
paramètres.

Après un changement de couleur, mesurez : `python3 tools/contrast.py` vérifie
les 26 couples que l'interface emploie réellement, lus dans le CSS.

Pour ajouter une police, posez le `.woff2` dans `frontend/public/fonts` et
déclarez-la en `@font-face` dans `globals.css` : rien ne télécharge de police,
ni au build ni à l'exécution, pour que l'application démarre depuis un clone
sans compte nulle part.

### Le journal d'audit

Chaque opération sensible écrit une ligne dans `audit_log`, en **ajout seul** :
qui a fait quoi, à qui, quand, depuis quelle adresse. Chaque ligne porte
l'empreinte SHA-256 de la précédente, si bien qu'une altération ou une
suppression intercalaire se voit — et la garantie ne tient pas au code mais à
un `REVOKE UPDATE, DELETE` en base, posé sur l'utilisateur applicatif. C'est ce
qui exige **Postgres**, et pourquoi c'est le moteur du dispositif et non une
option : SQLite n'a pas de notion d'utilisateur, donc pas de privilège à
révoquer. Seule la suite de tests reste sur SQLite — le chaînage s'y vérifie
tout aussi bien, et `pytest` ne doit pas exiger un serveur.

Le journal se lit par deux routes d'administration, décrites dans
« Administration — le journal d'audit » plus haut : leur préfixe est
`/api/v1/admin` et non `/api/admin`, parce que c'est celui qu'attend la
Cour des comptes.

Le parcours Postgres, depuis la racine :

```bash
cp backend/.env.example backend/.env   # y mettre les mots de passe et la clé HMAC
make postgres-up                        # le conteneur postgres:16-alpine
make provision-postgres                 # les tables, le rôle applicatif, le REVOKE
make migrate-audit-data                 # recopie la base SQLite, écrit la genèse
make audit-demo                         # altère une copie jetable, et le prouve
```

`make provision-postgres` affiche les privilèges **effectifs** du rôle
applicatif, lus dans `information_schema.role_table_grants` et non affirmés :
`audit_log : ['INSERT', 'SELECT']`. Un export se vérifie sans toucher à la base
— c'est le point, puisque c'est la base qui est soupçonnée :

```bash
cd backend && python verify_audit.py export.json
```

Codes de sortie : 0 conforme, 1 altéré, 2 erreur. La note technique est dans
`docs/audit-log/note.md` : ce qu'elle couvre, ce qu'elle ne couvre pas, et les
limites assumées.

### Faire évoluer une base déjà en service

`make seed` commence par un `db.drop_all()` : il fabrique un jeu de
démonstration, il ne migre rien. Et le `db.create_all()` du démarrage crée les
tables qui manquent, jamais une colonne qui manque à une table qui existe.

Pour une base qu'on veut garder — des comptes créés depuis l'interface, des
paiements réels :

```bash
cd backend
python migrer.py --controle   # dit ce qui manque, n'écrit rien
python migrer.py              # ajoute ce qui manque
```

Idempotent : le relancer ne fait rien la seconde fois. Il n'efface aucune
ligne, ne modifie aucune écriture comptable, et ne désactive aucune contrainte.

## Structure

```
backend/     Flask : app.py, auth.py, accounts.py, models.py, routes/, seed.py
             theme.json  L'identité visuelle : couleurs, polices, logotype
             instruire.py  Accepter, refuser, suspendre ou clôturer un partenaire
             db_uri.py  Quelle base, lue où : l'adresse de l'application et
                        celle du superutilisateur, et pourquoi il y en a deux
             migrer.py  Ajoute à une base en service ce que le schéma a gagné
             audit_chain.py  Le chaînage SHA-256, partagé par l'écriture et la
                             vérification — sans Flask ni base, à dessein
             services/audit_service.py  `record_event`, le point d'écriture
                             unique du journal
             verify_audit.py  Vérifie un export sans se connecter à la base
             provision_postgres.py  Les tables, le rôle applicatif, le REVOKE
             migrate_sqlite_to_postgres.py  Recopie la base et écrit la genèse
             demo_audit_tamper.sh  La démonstration d'altération, sur une copie
             `models.py` porte le schéma normalisé (Employeur, Salaries,
             Partenaire, Transaction, Abondement, MesureCompte, PartenaireLike,
             Decision, Admin, AuditLog) ; `accounts.py` traduit ces tables vers
             le contrat que le front consomme, pour qu'aucune route n'ait à le
             refaire
frontend/    Next.js — voir frontend/components/README.md pour la répartition
docs/
  audit-log/note.md  La note technique du journal d'audit
  brand-book/  Le brand book : sources HTML, captures, et le PDF de 15 pages
  03_Projet_CGU_Ticket_Tout.docx  Le projet de CGU. Document de référence,
               transcrit dans frontend/components/legal/cgu.ts, que la page
               /conditions affiche
tools/       Les scripts qui produisent le brand book (voir plus bas)
.github/     La CI : build du front et publication de l'artefact
Makefile     install / seed / dev / clean, et le parcours du journal :
             postgres-up / postgres-down / provision-postgres /
             migrate-audit-data / audit-demo
docker-compose.yml  Le Postgres de développement, sur la boucle locale
start.sh     Ce que `make dev` exécute
```

`backend/` et `frontend/` sont frères : le back vivait sous `src/backend`, un
dossier `src/` qui n'enveloppait que lui pendant que le front était à la racine.

## Le brand book

Le PDF livré est `docs/brand-book/cartepro-brand-book.pdf`. Il se régénère,
dans cet ordre, depuis la racine :

```bash
python3 tools/contrast.py          # mesure les 26 couples de contraste (RGAA AA)
node    tools/capture.js           # captures de l'application en fonctionnement
python3 tools/build-brandbook.py   # assemble docs/brand-book/brand-book.html
node    tools/shots.js             # rend chaque page en image
python3 tools/assemble-pdf.py      # relie les pages en PDF
```

`capture.js` et `shots.js` pilotent Chrome par le protocole DevTools et
demandent donc l'application démarrée (`make dev`) et un Chrome disponible.
`contrast.py` et `build-brandbook.py` n'ont besoin de rien d'autre que du dépôt.
