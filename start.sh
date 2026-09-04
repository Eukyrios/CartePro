#!/bin/bash

# Intercepte le Ctrl+C pour couper proprement les processus enfants
trap "echo -e '\n Arrêt des serveurs...'; kill 0" SIGINT

echo "Démarrage du Backend ..."
cd src/backend
# Tente d'activer l'environnement virtuel
source .venv-1/bin/activate 2>/dev/null || source venv/bin/activate 2>/dev/null
python3 app.py &
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