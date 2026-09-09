.PHONY: dev prod prod-demo port-libre install seed clean postgres-up postgres-down provision-postgres migrate-audit-data audit-demo

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

# --- Production ------------------------------------------------------------
#
# Construit le front et le sert tel qu'il sera livré. La différence avec
# `make dev` qui compte : **les identifiants de démonstration n'apparaissent
# plus** sous le formulaire de connexion. Le dialogue proposait trois comptes
# avec leur adresse et le mot de passe commun en clair — utile pour montrer le
# dispositif, inacceptable sur une page publique, puisque l'espace
# d'administration qu'on ouvre avec est le vrai.
#
# Deux protections, et il faut les deux :
#
# 1. Le bloc ne s'affiche pas dès que la construction est une construction de
#    production (`NODE_ENV`). Acquis sans rien poser, donc vrai aussi sur Vercel
#    et partout ailleurs, même si personne n'y pense.
# 2. `NEXT_PUBLIC_COMPTES_DEMO=0`, posé ici, **retire les chaînes du paquet**.
#    Sans lui, une variable `NEXT_PUBLIC_*` absente se compile en lecture à
#    l'exécution et non en constante : le minifieur ne peut pas supprimer la
#    branche morte, et les trois adresses et le mot de passe restaient lisibles
#    dans les sources du navigateur alors que le bloc avait disparu de l'écran.
#    Mesuré des deux façons — voir `frontend/components/account/demoAccounts.ts`.
#
# Conséquence pour un hébergeur : poser `NEXT_PUBLIC_COMPTES_DEMO=0` dans sa
# configuration. Sans elle, l'écran est propre mais le paquet contient encore
# les identifiants.
#
# Le backend n'est pas lancé ici : en production il est servi ailleurs, et
# `NEXT_PUBLIC_API_URL` dit où (voir frontend/next.config.ts).
# Refuse de construire tant qu'un serveur tient le port 3000.
#
# Deux raisons, et la premiere est la moins evidente : une construction de
# production **efface** `frontend/.next`, que `make dev` utilise au meme moment
# — un `next build` lance par-dessus un `.next` de developpement echoue en
# `MODULE_NOT_FOUND` (« Cannot find module './611.js' »), et laisse le serveur
# de developpement avec un dossier sans `BUILD_ID`, donc en erreur 500 jusqu'au
# prochain redemarrage. La seconde : `next start` ne prendrait de toute facon
# pas un port deja pris. Mieux vaut refuser en une seconde que casser les deux.
port-libre:
	@if (ss -ltn 2>/dev/null || lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null) | grep -q ':3000 '; then \
		echo "⛔ Le port 3000 est déjà pris — sans doute « make dev »."; \
		echo "   Arrêtez-le avant : la construction de production efface"; \
		echo "   frontend/.next, que le serveur de développement lit en même"; \
		echo "   temps, et « next start » ne pourrait pas prendre le port."; \
		exit 1; \
	fi

prod: port-libre
	@echo "🏗  Construction de production du front..."
	@rm -rf frontend/.next
	@cd frontend && NEXT_PUBLIC_COMPTES_DEMO=0 npm run build
	@echo "🚀 http://localhost:3000 — identifiants de démonstration retirés du paquet"
	@cd frontend && NEXT_PUBLIC_COMPTES_DEMO=0 npm start

# La même chose, mais avec les identifiants de démonstration affichés : pour
# une démonstration hébergée que l'on veut cliquable. C'est un choix explicite,
# et il se voit dans la commande.
prod-demo: port-libre
	@echo "🏗  Construction de production, comptes de démonstration AFFICHÉS..."
	@rm -rf frontend/.next
	@cd frontend && NEXT_PUBLIC_COMPTES_DEMO=1 npm run build
	@echo "🚀 http://localhost:3000 — ⚠ identifiants visibles publiquement"
	@cd frontend && NEXT_PUBLIC_COMPTES_DEMO=1 npm start

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
