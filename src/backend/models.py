from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

db = SQLAlchemy()
login_manager.login_view = "login"

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=True, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="user")
    audience = db.Column(db.String(20), nullable=False, default="employee")
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Champs spécifiques partenaire (optionnels)
    company_name = db.Column(db.String(120), nullable=True)
    siret = db.Column(db.String(20), nullable=True)
    partner_data = db.Column(db.JSON, nullable=False, default=dict)
    card_style = db.Column(db.JSON, nullable=False, default=dict)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"

def load_user(user_id):
    return User.query.get(int(user_id))
