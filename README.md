# Ticket Tout

Démonstrateur du crédit salarié du « Ministère du Job et Bonheur » : un employeur
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

### Comptes de démonstration

Mot de passe commun : `TicketTout2026`.

| Type | Identifiant |
|---|---|
| salarié | `camille.durand@ministere.gouv.fr` — 32,50 € |
| partenaire | `contact@poney-dream-78.fr` |
| admin | `admin@ministere.gouv.fr` |

Le panel du cabinet est semé avec : 16 partenaires renseignés (dont 6
conventionnés), 50 salariés, 200 transactions, et les cas limites exigés — trois
soldes à zéro, deux sous cinq euros, des refus.

## Structure

```
backend/     Flask : app.py, auth.py, models.py, routes/, seed.py
frontend/    Next.js — voir frontend/components/README.md pour la répartition
docs/
  brand-book/  Le brand book : sources HTML, captures, et le PDF de 15 pages
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
