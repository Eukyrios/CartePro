from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

# ---------- App & config ----------
app = Flask(__name__)
app.config["SECRET_KEY"] = "test-secret-key"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///test_app.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"  # pas utilisé ici, mais requis par Flask-Login

# ---------- Modèle User ----------
class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="user")  # user / admin / partenaire
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    company_name = db.Column(db.String(120), nullable=True)
    siret = db.Column(db.String(20), nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ---------- Fonction d'authentification ----------
def check_credentials(user, password):
    """
    Retourne True si les identifiants sont valides, False sinon.
    Ne fait pas de login, ne redirige pas.
    """
    if user and user.check_password(password):
        return True
    return False

# ---------- Tests ----------
def run_tests():
    with app.app_context():
        # Créer les tables
        db.create_all()
        print("[OK] Tables créees dans test_app.db")

        # Nettoyer d'éĺĺventuels anciens users de test
        User.query.delete()
        db.session.commit()
        print("[OK] Table users vidangee pour les tests")

        # Créer un user normal
        user1 = User(email="user@example.com", role="user")
        user1.set_password("password123")
        db.session.add(user1)

        # Créer un admin
        admin = User(email="admin@example.com", role="admin")
        admin.set_password("adminpass")
        db.session.add(admin)

        # Créer un partenaire
        partenaire = User(email="partenaire@example.com", role="partenaire")
        partenaire.set_password("partpass")
        partenaire.company_name = "Ma Société"
        partenaire.siret = "12345678901234"
        db.session.add(partenaire)

        db.session.commit()
        print("[OK] 3 utilisateurs créees (user, admin, partenaire)")

        # Vérifier que la DB contient bien 3 users
        count = User.query.count()
        assert count == 3, f"Attendu 3 users, obtenu {count}"
        print(f"[OK] User count in DB: {count}")

        # Tester check_credentials
        u = User.query.filter_by(email="user@example.com").first()
        assert check_credentials(u, "password123") is True
        assert check_credentials(u, "wrong") is False
        print("[OK] check_credentials OK pour user normal")

        a = User.query.filter_by(email="admin@example.com").first()
        assert check_credentials(a, "adminpass") is True
        assert check_credentials(a, "wrong") is False
        print("[OK] check_credentials OK pour admin")

        p = User.query.filter_by(email="partenaire@example.com").first()
        assert check_credentials(p, "partpass") is True
        assert check_credentials(p, "wrong") is False
        assert p.company_name == "Ma Société"
        assert p.siret == "12345678901234"
        print("[OK] check_credentials OK pour partenaire + champs specifiques")

        # Tester login_user / current_user (sans requete HTTP)
        with app.test_request_context():
            login_user(u)
            assert current_user.is_authenticated is True
            assert current_user.email == "user@example.com"
            print("[OK] login_user + current_user OK (contexte de test)")

            logout_user()
            assert current_user.is_authenticated is False
            print("[OK] logout_user OK")

        print("\n[TOUT OK] App, DB, modèles et auth fonctionnent correctement.\n")

if __name__ == "__main__":
    run_tests()