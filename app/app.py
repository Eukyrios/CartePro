from flask import Flask, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from models import db, User, login_manager
from auth import login, logout, register
from routes import index, dashboard, admin_panel, partenaire_panel

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "change-me-en-prod"
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialiser extensions
    db.init_app(app)
    login_manager.init_app(app)

    # Enregistrer les routes
    app.add_url_rule("/", view_func=index)
    app.add_url_rule("/login", view_func=login, methods=["GET", "POST"])
    app.add_url_rule("/logout", view_func=logout)
    app.add_url_rule("/register", view_func=register, methods=["GET", "POST"])
    app.add_url_rule("/dashboard", view_func=dashboard)
    app.add_url_rule("/admin", view_func=admin_panel)
    app.add_url_rule("/partenaire", view_func=partenaire_panel)

    # Créer les tables si elles n'existent pas
    with app.app_context():
        db.create_all()

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)