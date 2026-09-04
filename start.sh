#!/bin/bash

# Intercepte le Ctrl+C pour couper proprement les processus enfants
trap "echo -e '\n Arrêt des serveurs...'; kill 0" SIGINT

echo "Démarrage du Backend ..."
cd src/backend
# L'interpréteur du venv, appelé par son chemin. Et surtout : on s'arrête ici
# si aucun venv n'existe. La version précédente avalait l'échec avec un
# 2>/dev/null, lançait le python système sans Flask, et le backend mourait sur
# un ModuleNotFoundError perdu dans les logs du front — l'interface se
# contentant d'afficher « La requête a échoué » sur chaque appel d'API.
if [ -x .venv-1/bin/python ]; then
  BACKEND_PY=.venv-1/bin/python
elif [ -x venv/bin/python ]; then
  BACKEND_PY=venv/bin/python
else
  echo "Aucun environnement Python : lancez 'make install' d'abord." >&2
  exit 1
fi
"$BACKEND_PY" app.py &
cd ../..

echo "Démarrage du Frontend..."
# ATTENTION : Ajuste "src/frontend" si ton dossier front a un autre nom
cd frontend 
npm run dev &
cd ../..

echo "========================================="
echo "Projet Ticket Tout en ligne !"
echo "Backend : http://127.0.0.1:5000"
echo "Frontend : http://localhost:3000"
echo "Appuie sur Ctrl+C pour tout éteindre."
echo "========================================="

# Empêche le script de se terminer tout de suite
wait