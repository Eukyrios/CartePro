.PHONY: dev seed clean

# Lance le front et le back en même temps
dev:
	@bash start.sh

# Lance le script de seed déterministe pour le cabinet
seed:
	@echo "🌱 Génération du jeu de données..."
	@cd src/backend && \
	(source .venv-1/bin/activate 2>/dev/null || source venv/bin/activate 2>/dev/null) && \
	python3 seed.py

# (Optionnel) Nettoie les fichiers temporaires
clean:
	@echo "🧹 Nettoyage des caches..."
	@find . -type d -name "__pycache__" -exec rm -rf {} +
	@rm -f transactions.csv api_transactions.csv