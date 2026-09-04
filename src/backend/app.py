from flask import Flask
from flask_cors import CORS
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy import inspect, text
import os

# 1. Importations de la base de données et de l'authentification (Partie de ton mate)
from models import db
from auth import (
    api_change_password,
    api_delete_account,
    api_login,
    api_logout,
    api_me,
    api_register,
    api_update_profile,
)

# 2. Importations de tes Blueprints API (Ta partie)
from routes.salaries import salaries_bp
from routes.partenaires import partenaires_bp
from routes.admin import admin_bp
from routes.transactions import transactions_bp

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Configuration globale (Fusion de vos deux environnements)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-me-en-dev")
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "change-me-en-dev")
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = False
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False
    JWTManager(app)
    
    # Force Flask à indenter le JSON pour tes tests dans le terminal
    app.json.compact = False
    
    # Autorise les requêtes frontend à interroger ton API
    CORS(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"], "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}},
        supports_credentials=True,
    )

    # Initialisation des extensions de ton mate
    db.init_app(app)

    # Enregistrement des routes d'authentification (Partie de ton mate)
    app.add_url_rule("/api/auth/login", view_func=api_login, methods=["POST"])
    app.add_url_rule("/api/auth/register", view_func=api_register, methods=["POST"])
    app.add_url_rule("/api/auth/logout", view_func=api_logout, methods=["POST"])
    app.add_url_rule("/api/auth/me", view_func=api_me, methods=["GET"])
    app.add_url_rule("/api/auth/profile", view_func=api_update_profile, methods=["PUT"])
    app.add_url_rule("/api/auth/password", view_func=api_change_password, methods=["PUT"])
    app.add_url_rule("/api/auth/account", view_func=api_delete_account, methods=["DELETE"])

    # Enregistrement de tes routes API RESTful (Ta partie)
    app.register_blueprint(salaries_bp, url_prefix='/api/salaries')
    app.register_blueprint(partenaires_bp, url_prefix='/api/partenaires')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(transactions_bp, url_prefix='/api/transactions')

    # Création automatique des tables SQLite si elles n'existent pas
    with app.app_context():
        db.create_all()
        _upgrade_existing_database()

    return app


def _upgrade_existing_database():
    """Add auth columns to the existing SQLite prototype database in place."""
    inspector = inspect(db.engine)
    columns = {column["name"] for column in inspector.get_columns("users")}
    additions = {
        "audience": "VARCHAR(20) NOT NULL DEFAULT 'employee'",
        "partner_data": "JSON NOT NULL DEFAULT '{}'",
        "card_style": "JSON NOT NULL DEFAULT '{}'",
        "solde": "FLOAT NOT NULL DEFAULT 50.0",
    }
    for name, definition in additions.items():
        if name not in columns:
            db.session.execute(text(f"ALTER TABLE users ADD COLUMN {name} {definition}"))
    db.session.commit()

if __name__ == "__main__":
    app = create_app()
    # Lancement du serveur de développement
    app.run(debug=True, port=5000)