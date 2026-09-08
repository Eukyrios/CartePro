from flask import Flask
from flask_cors import CORS
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os


# 1. Importations de la base de données et de l'authentification (Partie de ton mate)
from db_uri import uri_application
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
# Trois domaines de l'espace d'administration, dans leurs propres fichiers et
# montés sous le meme prefixe : comptes salaries, tableau de bord national,
# abondements employeurs. Blueprints distincts pour que `routes/admin.py` ne
# devienne pas le fichier ou tout finit par tomber.
from routes.admin_abondements import admin_abondements_bp
from routes.admin_comptes import admin_comptes_bp
from routes.admin_tableau import admin_tableau_bp
from routes.transactions import transactions_bp
from routes.sirh import sirh_bp
from routes.theme import theme_bp
from routes.audit import audit_bp
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
    # La base, choisie par l'environnement plutôt qu'écrite en dur, et lue par
    # `db_uri.py` — qui charge `.env` au passage. C'est de là que vient le
    # Postgres du journal d'audit : sans ce chargement, un `.env` annonçait
    # Postgres pendant que l'application tournait sur SQLite.
    #
    # Ce n'est pas de la configurabilité pour le plaisir : les tests avaient
    # besoin d'une base à eux, ils la posaient *après* `create_app()`, et
    # Flask-SQLAlchemy avait déjà construit son moteur sur `app.db`. Leur
    # `drop_all()` effaçait donc la démonstration semée, à chaque exécution.
    # Ici l'URI est lue avant que le moteur existe, et un test qui pose
    # TICKET_TOUT_DATABASE_URI ne peut plus se tromper de base — `load_dotenv`
    # n'écrase pas une variable déjà posée, donc la suite reste sur SQLite.
    app.config["SQLALCHEMY_DATABASE_URI"] = uri_application()
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = True
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False
    JWTManager(app)
    
    # 🔒 Sécurisation avec HTTPS obligatoire
    from flask_talisman import Talisman
    is_testing = app.config.get("TESTING") or os.environ.get("TESTING") == "true" or os.environ.get("FLASK_ENV") == "testing"
    is_pytest = "PYTEST_CURRENT_TEST" in os.environ
    disable_force_https = os.environ.get("DISABLE_FORCE_HTTPS") == "true"
    # Talisman force HTTPS en production, sauf si on l'explicite (ex: local make prod sans Nginx)
    Talisman(app, content_security_policy=None, force_https=not (app.debug or is_testing or is_pytest or disable_force_https))
    
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
    app.register_blueprint(admin_comptes_bp, url_prefix='/api/admin')
    app.register_blueprint(admin_tableau_bp, url_prefix='/api/admin')
    app.register_blueprint(admin_abondements_bp, url_prefix='/api/admin')
    app.register_blueprint(transactions_bp, url_prefix='/api/transactions')
    app.register_blueprint(sirh_bp, url_prefix='/api/v1')
    # L'identité visuelle : couleurs, polices, logotype. Voir theme.json.
    app.register_blueprint(theme_bp, url_prefix='/api/theme')
    # Journal d'audit — GET /api/v1/admin/audit, exigé par le courriel Vignal
    # du 8 septembre. Préfixe distinct de `/api/admin` (admin_bp) : c'est
    # celui que la Cour des comptes attend au premier caractère près.
    app.register_blueprint(audit_bp, url_prefix='/api/v1/admin')

    # Création automatique des tables si elles n'existent pas.
    #
    # Sous Postgres, ce n'est plus l'application qui les crée : elle se connecte
    # avec `cartepro_app`, qui n'a que `USAGE` sur le schéma. Toutes les tables
    # existant déjà, SQLAlchemy inspecte et n'émet aucun CREATE — donc rien
    # n'échoue. Mais si une table manquait, l'échec en « permission denied »
    # serait le bon signal : c'est `make provision-postgres` qui crée les
    # tables, en superutilisateur, pour qu'il en reste le propriétaire et que le
    # REVOKE sur `audit_log` ait un sens.
    #
    # Sous SQLite, rien ne change : la base se crée au premier démarrage.
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