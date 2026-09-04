from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
from sqlalchemy import CheckConstraint
from sqlalchemy import event

db = SQLAlchemy()

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

    # --- NOUVEAUTÉ : Le solde ---
    solde = db.Column(db.Float, default=50.0, nullable=False) # 50€ offerts à l'inscription par exemple

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

# --- NOUVEAUTÉ : La table des transactions ---
class Transaction(db.Model):
    __tablename__ = "transactions"
    id = db.Column(db.Integer, primary_key=True)
    salarie_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    partenaire_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    montant = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    statut = db.Column(db.String(20), default="validee") # "validee" ou "annulee"
    
    # 🔒 Clé d'idempotence pour bloquer les doubles scans
    idempotency_key = db.Column(db.String(512), unique=True, nullable=True) 

    __table_args__ = (
        CheckConstraint("montant > 0", name="ck_transaction_montant_positive"),
    )

    # Relations pour accéder facilement aux objets User liés
    salarie = db.relationship("User", foreign_keys=[salarie_id])
    partenaire = db.relationship("User", foreign_keys=[partenaire_id])

@event.listens_for(Transaction, 'before_update')
def block_transaction_update(mapper, connection, target):
    raise Exception("Règle comptable : Une transaction validée est immuable. Les UPDATE sont interdits.")

@event.listens_for(Transaction, 'before_delete')
def block_transaction_delete(mapper, connection, target):
    raise Exception("Règle comptable : Une transaction validée est immuable. Les DELETE sont interdits.")