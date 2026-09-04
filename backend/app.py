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
from routes.sirh import sirh_bp
from flask import jsonify
from flasgger import Swagger


def health_check():
    return jsonify({
        "status": "up",
        "version": "1.0.0",
        "environment": "local"
    }), 200

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config['SWAGGER'] = {
        'title': 'CartePro API',
        'uiversion': 3,
        'openapi': '3.0.0'
    }
    Swagger(app)
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
    app.add_url_rule("/health", view_func=health_check, methods=["GET"])

    # Enregistrement de tes routes API RESTful (Ta partie)
    app.register_blueprint(salaries_bp, url_prefix='/api/salaries')
    app.register_blueprint(partenaires_bp, url_prefix='/api/partenaires')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(transactions_bp, url_prefix='/api/transactions')
    app.register_blueprint(sirh_bp, url_prefix='/api/v1')

    # Création automatique des tables SQLite si elles n'existent pas
    with app.app_context():
        db.create_all()
        _upgrade_existing_database()

    return app


def _upgrade_existing_database():
    """Ajoute en place les colonnes manquantes à une base SQLite existante.

    `db.create_all()` crée les tables absentes, jamais les colonnes absentes :
    une base née avant l'ajout d'un champ garde son ancien schéma et la
    première requête sur le nouveau champ échoue en « no such column ». D'où
    ce rattrapage, idempotent, à chaque démarrage.
    """
    inspector = inspect(db.engine)
    additions = {
        "users": {
            "audience": "VARCHAR(20) NOT NULL DEFAULT 'employee'",
            "partner_data": "JSON NOT NULL DEFAULT '{}'",
            "card_style": "JSON NOT NULL DEFAULT '{}'",
            "solde": "FLOAT NOT NULL DEFAULT 50.0",
        },
        "transactions": {
            # Sans UNIQUE ici : SQLite refuse une contrainte d'unicité dans un
            # ALTER TABLE ADD COLUMN. L'index unique créé juste après porte la
            # garantie, qui est ce qui rend l'encaissement idempotent.
            "idempotency_key": "VARCHAR(512)",
        },
    }
    for table, columns in additions.items():
        existing = {column["name"] for column in inspector.get_columns(table)}
        for name, definition in columns.items():
            if name not in existing:
                db.session.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")
                )
    db.session.execute(
        text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_transactions_idempotency_key "
            "ON transactions (idempotency_key)"
        )
    )
    db.session.commit()

if __name__ == "__main__":
    app = create_app()
    # Lancement du serveur de développement
    app.run(debug=True, port=5000)