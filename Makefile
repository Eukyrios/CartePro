.PHONY: dev install seed clean

# L'interpréteur du backend : celui du venv s'il existe, appelé par son chemin.
# Pas de `source` ici — make exécute ses recettes avec /bin/sh, qui ne connaît
# pas cette commande, et la chaîne échouait en erreur 127 avant d'atteindre
# python. Activer un venv ne sert de toute façon à rien quand on appelle son
# python directement.
BACKEND_PY := $(firstword $(wildcard \
	$(CURDIR)/src/backend/venv/bin/python \
	$(CURDIR)/src/backend/.venv-1/bin/python) python3)

# Lance le front et le back en même temps
dev:
	@bash start.sh

# Prépare le dépôt après un clone : l'environnement Python du backend et les
# dépendances du front. À lancer une fois, avant `make dev`.
install:
	@echo "🐍 Environnement Python du backend..."
	@cd src/backend && python3 -m venv venv
	@src/backend/venv/bin/pip install --quiet --upgrade pip
	@src/backend/venv/bin/pip install --quiet -r src/backend/requirements.txt
	@echo "📦 Dépendances du frontend..."
	@cd frontend && npm ci
	@echo "✅ Prêt : make dev"

# Lance le script de seed déterministe pour le cabinet.
# Attention : seed.py commence par un db.drop_all(), tout compte créé depuis
# l'interface est effacé. À passer avant de se créer un compte, pas après.
seed:
	@echo "🌱 Génération du jeu de données..."
	@cd src/backend && $(BACKEND_PY) seed.py

# (Optionnel) Nettoie les fichiers temporaires
clean:
	@echo "🧹 Nettoyage des caches..."
	@find . -type d -name "__pycache__" -exec rm -rf {} +
	@rm -f transactions.csv api_transactions.csv
