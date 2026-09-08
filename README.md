# CartePro

Démonstrateur du crédit salarié de l'« Administration » : un employeur
crédite ses salariés, qui dépensent chez des partenaires conventionnés.

Front Next.js 15 (App Router, Tailwind v4), back Flask + SQLite.

## Démarrer

```bash
make install   # environnement Python du back, dépendances du front — une fois
make seed      # jeu de données déterministe (⚠ efface la base)
make dev       # back sur :5000, front sur :3000
```

`make dev` lance les deux et les arrête ensemble avec Ctrl+C. Sans `make install`
au préalable, le script s'arrête avec un message plutôt que de démarrer un
backend sans Flask.

`make seed` n'est pas optionnel après le passage au schéma normalisé : une base
née avant lui n'a pas les mêmes tables, et `db.create_all()` ne migre rien.

### Comptes de démonstration

Mot de passe commun pour tous : `CartePro2026`.

Un compte par situation à montrer — chacun ouvre sur un écran différent.

**Salariés** — `…@administration.example`

| Identifiant      | Solde    | Ce qu'il montre                                                                                                     |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `camille.durand` | 32,50 €  | Le parcours normal : la carte, le QR, l'historique avec son crédit employeur et deux paiements                      |
| `salarie0`       | 0,00 €   | Le solde épuisé — tout partenaire refuse, et l'écran dit pourquoi                                                   |
| `salarie5`       | 4,96 €   | Le solde tout juste : seul le partenaire le moins cher passe — Glaces Corrèze à 4,50 € — les quinze autres refusent |
| `salarie19`      | —        | L'historique dense : sept opérations, de quoi exercer les filtres et la pagination                                  |
| `salarie38`      | 149,26 € | Le solde confortable, pour enchaîner les paiements sans buter sur le refus                                          |

**Administration** — `admin@administration.example`

| Identifiant                    | Ce qu'il montre                                                                                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin@administration.example` | L'espace d'administration, qui **est** sa page d'accueil : les trois dossiers en attente à instruire, puis les treize conventionnés. Un dossier s'ouvre à `/dossier/<slug>`, l'écran « Les comptes » porte un rang d'établissements et un rang de salariés ; les recettes d'un établissement s'ouvrent à `/recettes/<slug>` et l'historique d'un salarié à `/depenses/<id>` — les deux derniers portent l'état du compte et ses mesures à côté de leur titre. Plus l'export CSV de toutes les transactions (`/api/admin/transactions.csv`) |

**Partenaires** — `contact@<slug>.fr`

| Identifiant                     | Statut         | Ce qu'il montre                                                                                                                                               |
| ------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contact@comptoir-du-midi.fr`   | conventionné   | L'espace complet : encaisser, réseau, recettes. Coup de cœur de l'administrateur, fiche rédigée, horaires                                                     |
| `contact@sport-loisirs-aubagne.fr` | **en attente** | Encaissement et recettes **barrés** — l'accès dépend du conventionnement, pas de la connexion                                                              |
| `contact@spa-vosges.fr`         | **refusé**     | Son espace ouvre sur la décision, son motif et le bouton de réexamen. Refusé deux fois : l'historique de l'instruction est visible avec `python instruire.py` |
| `contact@camping-etang-bleu.fr` | **refusé**     | Un refus simple, jamais réexaminé                                                                                                                             |
| `contact@cinema-rex-lille.fr`   | conventionné   | Une fiche de **démonstration** : présentation en latin, pastille « Fiche de démonstration »                                                                   |

Sans être connecté : la vitrine, le coup de cœur de l'administrateur, et la
fiche publique d'un partenaire — où la carte est barrée et invite à se
connecter. Les cinquante salariés du panel vont de `salarie0` à `salarie49`.

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

### Instruire un dossier

Deux chemins, un seul geste. À l'écran, en se connectant avec le compte
d'administration : l'accueil **est** la liste des dossiers, et chaque ligne
ouvre le dossier à `/dossier/<slug>`, où la décision se prend. Il n'y a pas de
préfixe `/admin` — comme pour un salarié ou un partenaire, la page d'accueil est
l'espace du compte. En ligne de commande, sans passer par le navigateur :

```bash
cd backend
python instruire.py                                  # l'état des dix-huit dossiers
python instruire.py refuser  spa-vosges  "motif écrit"
python instruire.py accepter sport-loisirs-aubagne "motif écrit"
```

Les deux appellent le même code — `backend/instruction.py` — précisément pour
qu'une décision prise à l'écran et une décision prise au clavier laissent la
même trace. Chaque geste écrit une décision **motivée** dans la table
`decisions`, et rien n'est effacé : les précédentes restent. C'est ce que la
traçabilité exige, et c'est ce que le partenaire lit dans son espace — lui
seul, le motif ne sort jamais par le catalogue public.

Le motif est obligatoire, refus comme acceptation : le serveur répond 422 sans
lui.

### L'API d'administration

Toutes ces routes portent `@admin_required` (`backend/decorators.py`) : sans
jeton c'est 401, avec un jeton de salarié ou de partenaire c'est 403.

| Route                                          |                                                                |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `GET /api/admin/partenaires/demandes`          | Les dossiers en attente, avec leur historique de décisions     |
| `GET /api/admin/partenaires`                   | Les conventionnés                                              |
| `POST /api/admin/partenaires/<slug>/approuver` | `{ motif }` — conventionne                                     |
| `POST /api/admin/partenaires/<slug>/refuser`   | `{ motif }` — écarte, et c'est ce motif que le titulaire lira  |
| `POST /api/admin/partenaires/<slug>/suspendre` | `{ motif }` — suspend, et le compte ne peut plus se connecter  |
| `PUT /api/theme`                               | L'identité visuelle, enregistrée — écran Style de /parametres  |
| `GET /api/admin/transactions`                  | Tous les paiements validés, en JSON — l'écran « Les comptes »  |
| `GET /api/admin/transactions.csv`              | Les mêmes, en CSV, pour l'emporter                             |
| `POST /api/admin/transactions/<id>/annuler`    | **501** — pas encore écrite, et le dit                         |

Les trois domaines de l'espace, chacun dans son fichier de routes plutôt que
tous dans `routes/admin.py` :

| Route                                        |                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `GET /api/admin/comptes[?statut=…]`          | Les comptes salariés, leur état, leur solde et leurs mesures               |
| `GET /api/admin/comptes/<id>`                | Un compte, avec l'historique complet de ses mesures                        |
| `GET /api/admin/comptes/<id>/mouvements`     | Ses crédits et ses paiements — même calcul que `/api/transactions/me`       |
| `POST /api/admin/comptes/<id>/activer`       | `{ motif }` — lève une suspension                                          |
| `POST /api/admin/comptes/<id>/suspendre`     | `{ motif }` — le titulaire ne se connecte plus ; réversible                |
| `POST /api/admin/comptes/<id>/cloturer`      | `{ motif }` — **définitif** ; rend le solde résiduel dans sa réponse       |
| `GET /api/admin/tableau-de-bord`             | Volume, partenaires actifs, répartition par département — en un seul appel |
| `GET /api/admin/abondements[?salarie=&limite=]` | Les crédits versés, du plus récent au plus ancien                       |
| `POST /api/admin/abondements`                | `{ salarieIds, montantCents, reference }` — crédite un lot de comptes      |

Trois règles y sont tenues par le serveur, pas par l'écran :

- **une mesure se motive.** 422 sans motif, pour un compte comme pour un
  dossier. L'état change **et** la ligne s'écrit dans `mesures_compte`, jamais
  l'un sans l'autre, et rien ne s'efface : un compte suspendu puis réactivé
  puis clôturé garde ses trois lignes ;
- **une clôture ne se lève pas.** La route d'activation répond 409. Clôturer ne
  supprime rien non plus — les transactions d'un salarié sont immuables, et son
  solde reste calculable après coup ;
- **la carte est exacte au département, jamais à l'adresse.** L'écran dessine
  une carte de France en aplats, agrégés depuis le code postal. C'est ce que la
  donnée permet : le réseau porte une adresse, pas des coordonnées, donc une
  épingle demanderait de géocoder — d'inventer une précision qui n'existe pas.
  Le fond de carte est fabriqué une fois par `python3 tools/build-carte.py`
  dans `frontend/public/carte/`, et servi comme un fichier statique : aucune
  bibliothèque de cartographie, aucun appel réseau à un tiers, et rien dans le
  paquet de la page d'accueil ;
- **créditer exige une clé d'idempotence.** C'est la seule route qui crée de
  l'argent sur un compte : `reference` est obligatoire (422 sans elle), et
  renvoyer la même clé rend la **même** réponse avec `rejoue: true` au lieu de
  créditer une seconde fois. Le lot est atomique — un seul compte fermé ou
  inconnu et rien n'est écrit.

`backend/test_admin_api.py` vérifie les deux choses séparément : que chaque
route refuse ce qu'elle doit refuser — sa liste `ROUTES` couvre les huit routes
ci-dessus —, et qu'une décision change le statut **et** écrit sa ligne dans
`decisions`. `backend/test_admin_espace.py` couvre ce que les trois domaines
font : le motif obligatoire, la clôture définitive, l'historique qui ne
s'efface pas, et la dotation envoyée deux fois qui ne crédite qu'une fois.

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

### Ce que le seed contient

Dix-huit partenaires, dans les trois statuts que le dispositif connaît : **13
conventionnés**, 3 en attente d'examen, 2 refusés. Un refus porte son motif
écrit, que **seul l'établissement concerné** lit — la fiche publique n'en dit
rien : le statut est un fait, le motif est un dossier.

Puis 51 salariés et 200 opérations planifiées, dont 161 écrites et 39 refusées,
avec les cas limites exigés : trois soldes à zéro, sept sous cinq euros.

Les dix-huit fiches ont une présentation, des horaires et un site. **Six** sont
écrites en français et font foi — exactement celles que l'administrateur
distingue par un coup de cœur ; les douze autres sont remplies avec la légende
de Romulus et Remus, en latin. C'est
le lorem ipsum de ce démonstrateur : du faux texte qui s'assume, plutôt que des
mots français qu'on pourrait prendre pour vrais. Le remplissage ne recouvre
jamais une présentation rédigée à la main.

Une opération refusée ne s'écrit pas : le schéma n'a pas de statut « refusée »,
et c'est juste — un paiement refusé n'a pas eu lieu, il n'est pas une écriture
comptable. Le refus reste démontrable en direct, quand un partenaire tente
d'encaisser plus que le solde disponible.

## Structure

```
backend/     Flask : app.py, auth.py, accounts.py, models.py, routes/, seed.py
             theme.json  L'identité visuelle : couleurs, polices, logotype
             instruire.py  Accepter, refuser ou suspendre un partenaire
             `models.py` porte le schéma normalisé (Employeur, Salaries,
             Partenaire, Transaction, Abondement, CoupDeCoeur, Decision,
             Admin) ; `accounts.py` traduit ces tables vers le contrat que le
             front consomme, pour qu'aucune route n'ait à le refaire
frontend/    Next.js — voir frontend/components/README.md pour la répartition
docs/
  brand-book/  Le brand book : sources HTML, captures, et le PDF de 15 pages
  03_Projet_CGU_Ticket_Tout.docx  Le projet de CGU. Document de référence,
               transcrit dans frontend/components/legal/cgu.ts, que la page
               /conditions affiche
tools/       Les scripts qui produisent le brand book (voir plus bas)
.github/     La CI : build du front et publication de l'artefact
Makefile     install / seed / dev / clean
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
