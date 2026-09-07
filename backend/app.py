from flask import Flask
from flask_cors import CORS
from flask_cors import CORS
from flask_jwt_extended import JWTManager
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
from routes.theme import theme_bp
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
    # La base, choisie par l'environnement plutôt qu'écrite en dur.
    #
    # Ce n'est pas de la configurabilité pour le plaisir : les tests avaient
    # besoin d'une base à eux, ils la posaient *après* `create_app()`, et
    # Flask-SQLAlchemy avait déjà construit son moteur sur `app.db`. Leur
    # `drop_all()` effaçait donc la démonstration semée, à chaque exécution.
    # Ici l'URI est lue avant que le moteur existe, et un test qui pose
    # TICKET_TOUT_DATABASE_URI ne peut plus se tromper de base.
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "TICKET_TOUT_DATABASE_URI", "sqlite:///app.db"
    )
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
    # L'identité visuelle : couleurs, polices, logotype. Voir theme.json.
    app.register_blueprint(theme_bp, url_prefix='/api/theme')

    # Création automatique des tables SQLite si elles n'existent pas.
    #
    # Plus de rattrapage de colonnes en place : il visait la table `users`, que
    # la refonte du schéma a supprimée. Un schéma normalisé ne se rattrape pas
    # par des ALTER TABLE successifs — une base née avant la refonte doit être
    # refaite, et c'est `make seed` qui le fait.
    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    app = create_app()
    # Lancement du serveur de développement
    app.run(debug=True, port=5000)