.PHONY: dev install seed clean postgres-up postgres-down provision-postgres migrate-audit-data audit-demo

# L'interpréteur du backend : celui du venv s'il existe, appelé par son chemin.
# Pas de `source` ici — make exécute ses recettes avec /bin/sh, qui ne connaît
# pas cette commande, et la chaîne échouait en erreur 127 avant d'atteindre
# python. Activer un venv ne sert de toute façon à rien quand on appelle son
# python directement.
BACKEND_PY := $(firstword $(wildcard \
	$(CURDIR)/backend/venv/bin/python \
	$(CURDIR)/backend/.venv-1/bin/python) python3)

# Lance le front et le back en même temps
dev:
	@bash start.sh

# Prépare le dépôt après un clone : l'environnement Python du backend et les
# dépendances du front. À lancer une fois, avant `make dev`.
install:
	@echo "🐍 Environnement Python du backend..."
	@cd backend && python3 -m venv venv
	@backend/venv/bin/pip install --quiet --upgrade pip
	@backend/venv/bin/pip install --quiet -r backend/requirements.txt
	@echo "📦 Dépendances du frontend..."
	@cd frontend && npm ci
	@echo "✅ Prêt : make dev"

# Lance le script de seed déterministe pour le cabinet.
# Attention : seed.py commence par un db.drop_all(), tout compte créé depuis
# l'interface est effacé. À passer avant de se créer un compte, pas après.
seed:
	@echo "🌱 Génération du jeu de données..."
	@cd backend && $(BACKEND_PY) seed.py

# (Optionnel) Nettoie les fichiers temporaires
clean:
	@echo "🧹 Nettoyage des caches..."
	@find . -type d -name "__pycache__" -exec rm -rf {} +
	@rm -f transactions.csv api_transactions.csv

# --- Journal d'audit (courriel Vignal du 8 septembre, docs/audit-log/) ------
#
# Le REVOKE UPDATE, DELETE exigé sur audit_log n'a de sens que sur un moteur
# qui connait la notion d'utilisateur — SQLite n'en a pas. D'ou Postgres,
# lance en conteneur pour ce chantier seulement ; le reste de l'application
# continue de tourner sur SQLite par defaut (`make dev`, `make seed`).

# Demarre Postgres. Prealable a tout ce qui suit ; necessite backend/.env
# rempli (copier backend/.env.example).
postgres-up:
	@docker compose up -d postgres

postgres-down:
	@docker compose down

# Cree les tables (proprietaire : le superutilisateur) et l'utilisateur
# applicatif cartepro_app, avec le GRANT/REVOKE sur audit_log. Idempotent.
provision-postgres:
	@cd backend && $(BACKEND_PY) provision_postgres.py

# Copie les donnees existantes de instance/app.db (SQLite) vers Postgres, avec
# les memes id, et ecrit l'enregistrement de genese du journal d'audit.
migrate-audit-data:
	@cd backend && $(BACKEND_PY) migrate_sqlite_to_postgres.py

# La demonstration en 4 temps du jeudi 9h, sur une copie jetable de la base.
audit-demo:
	@bash backend/demo_audit_tamper.sh
