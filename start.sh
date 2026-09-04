#!/bin/bash

# Ce que `make dev` exécute : le back et le front ensemble, arrêtés ensemble.
#
# Chaque serveur démarre dans un sous-shell, depuis un chemin calculé à partir
# de l'emplacement de ce script. La version précédente enchaînait des `cd`
# relatifs suivis de `cd ../..` : le jour où le backend est passé de
# `src/backend` à `backend/`, ce retour remontait d'un cran de trop, le `cd
# frontend` échouait sans bruit, et `npm run dev` s'exécutait dans le dossier
# parent du dépôt — d'où un « Missing script: dev » incompréhensible.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Intercepte le Ctrl+C pour couper proprement les processus enfants
trap "echo -e '\n Arrêt des serveurs...'; kill 0" SIGINT

# L'interpréteur du venv, appelé par son chemin. Et surtout : on s'arrête ici
# si aucun venv n'existe. Une version plus ancienne avalait l'échec avec un
# 2>/dev/null, lançait le python système sans Flask, et le backend mourait sur
# un ModuleNotFoundError perdu dans les logs du front — l'interface se
# contentant d'afficher « La requête a échoué » sur chaque appel d'API.
if [ -x "$ROOT/backend/.venv-1/bin/python" ]; then
  BACKEND_PY="$ROOT/backend/.venv-1/bin/python"
elif [ -x "$ROOT/backend/venv/bin/python" ]; then
  BACKEND_PY="$ROOT/backend/venv/bin/python"
else
  echo "Aucun environnement Python : lancez 'make install' d'abord." >&2
  exit 1
fi

echo "Démarrage du Backend ..."
(cd "$ROOT/backend" && "$BACKEND_PY" app.py) &

echo "Démarrage du Frontend..."
(cd "$ROOT/frontend" && npm run dev) &

echo "========================================="
echo "Projet Ticket Tout en ligne !"
echo "Backend : http://127.0.0.1:5000"
echo "Frontend : http://localhost:3000"
echo "Appuie sur Ctrl+C pour tout éteindre."
echo "========================================="

# Empêche le script de se terminer tout de suite
wait
