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

| Identifiant | Solde | Ce qu'il montre |
|---|---|---|
| `camille.durand` | 32,50 € | Le parcours normal : la carte, le QR, l'historique avec son crédit employeur et deux paiements |
| `salarie0` | 0,00 € | Le solde épuisé — tout partenaire refuse, et l'écran dit pourquoi |
| `salarie5` | 4,96 € | Le solde tout juste : seul le partenaire le moins cher passe — Glaces Corrèze à 4,50 € — les quinze autres refusent |
| `salarie19` | — | L'historique dense : sept opérations, de quoi exercer les filtres et la pagination |
| `salarie38` | 149,26 € | Le solde confortable, pour enchaîner les paiements sans buter sur le refus |
| `admin` | — | Le rôle administrateur : export CSV de toutes les transactions (`/api/admin/transactions.csv`) |

**Partenaires** — `contact@<slug>.fr`

| Identifiant | Statut | Ce qu'il montre |
|---|---|---|
| `contact@poney-dream-78.fr` | conventionné | L'espace complet : encaisser, réseau, recettes. Coup de cœur de l'administrateur, fiche rédigée, horaires |
| `contact@kostumparty.fr` | **en attente** | Encaissement et recettes **barrés** — l'accès dépend du conventionnement, pas de la connexion |
| `contact@spa-vosges.fr` | **refusé** | Son espace ouvre sur la décision, son motif et le bouton de réexamen. Refusé deux fois : l'historique de l'instruction est visible avec `python instruire.py` |
| `contact@camping-etang-bleu.fr` | **refusé** | Un refus simple, jamais réexaminé |
| `contact@cinema-rex-lille.fr` | conventionné | Une fiche de **démonstration** : présentation en latin, pastille « Fiche de démonstration » |

Sans être connecté : la vitrine, le coup de cœur de l'administrateur, et la
fiche publique d'un partenaire — où la carte est barrée et invite à se
connecter. Les cinquante salariés du panel vont de `salarie0` à `salarie49`.

### Changer l'identité visuelle

Couleurs, polices et logotype vivent dans **`backend/theme.json`**. On ouvre le
fichier, on change une valeur, on recharge la page : rien à recompiler, rien à
redémarrer. Le front lit `GET /api/theme` et pose une feuille de style qui
surcharge celle qu'il embarque.

```json
"colors": { "light": { "accent": "#4a1b6b" }, "dark": { "accent": "#c186e8" } },
"fonts":  { "sans": "\"Archivo\", Arial, sans-serif" },
"brand":  { "name": "CartePro", "logo": "/logo/mark-purple.svg" }
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

L'espace d'administration n'existe pas encore. En attendant, les décisions se
prennent en ligne de commande, et elles s'écrivent :

```bash
cd backend
python instruire.py                                  # l'état des seize dossiers
python instruire.py refuser  spa-vosges  "motif écrit"
python instruire.py accepter kostumparty "motif écrit"
```

Chaque geste laisse une décision motivée dans la table `decisions` — rien n'est
effacé, les précédentes restent. C'est ce que la traçabilité exige, et c'est ce
que le partenaire lit dans son espace.

### Ce que le seed contient

Seize partenaires, dans les trois statuts que le dispositif connaît : **11
conventionnés**, 3 en attente d'examen, 2 refusés. Un refus porte son motif
écrit, que **seul l'établissement concerné** lit — la fiche publique n'en dit
rien : le statut est un fait, le motif est un dossier.

Puis 51 salariés et 200 opérations planifiées, dont 161 écrites et 39 refusées,
avec les cas limites exigés : trois soldes à zéro, sept sous cinq euros.

Les seize fiches ont une présentation, des horaires et un site. **Quatre** sont
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
