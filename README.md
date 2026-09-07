# Ticket Tout

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

Mot de passe commun : `TicketTout2026`.

| Type | Identifiant |
|---|---|
| salarié | `camille.durand@administration.gouv.fr` — 32,50 € |
| partenaire | `contact@poney-dream-78.fr` — conventionné |
| partenaire en attente | `contact@kostumparty.fr` — encaissement et recettes barrés |
| partenaire refusé | `contact@spa-vosges.fr` — se connecte, et son espace ouvre sur la décision et son motif |
| admin | `admin@administration.gouv.fr` |

Le panel du cabinet est semé avec 16 partenaires, dans les trois statuts que le
dispositif connaît : **11 conventionnés**, 3 en attente d'examen, 2 refusés — et
un refus porte son motif écrit — que **seul l'établissement concerné** lit, en
premier écran de son espace. La fiche publique n'en dit rien : le statut est un
fait, le motif est un dossier. Puis 50 salariés, 200 opérations planifiées — 161 écrites, 39
refusées — et les cas limites exigés : trois soldes à zéro, plusieurs sous cinq
euros.

Les seize fiches ont une présentation, des horaires et un site. Trois sont
écrites en français et font foi — dont celles que l'administrateur distingue ; les
treize autres sont remplies avec la légende de Romulus et Remus, en latin. C'est
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

Le PDF livré est `docs/brand-book/ticket-tout-brand-book.pdf`. Il se régénère,
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
