from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, event, Enum as SQLEnum
import enum

db = SQLAlchemy()

# -----------------------------------------------------------------------------
# Enums
# -----------------------------------------------------------------------------
class PartnerStatus(enum.Enum):
    en_attente = "en_attente"
    valide = "validé"
    refuse = "refusé"
    suspendu = "suspendu"

class DecisionSens(enum.Enum):
    accepte = "accepté"
    refuse = "refusé"
    suspendu = "suspendu"

class TransactionStatut(enum.Enum):
    validee = "validée"
    annulee = "annulée"
    correction = "correction"

class MotifCarte(enum.Enum):
    vagues = "vagues"
    points = "points"
    grille = "grille"
    rayures = "rayures"
    croisillons = "croisillons"
    cercles = "cercles"
    damier = "damier"
    aucun = "aucun"

class CoupDeCoeurStatut(enum.Enum):
    actif = "actif"
    suspendu = "suspendu"

# -----------------------------------------------------------------------------
# Employeur
# -----------------------------------------------------------------------------
class Employeur(db.Model):
    __tablename__ = "employeurs"
    id = db.Column(db.Integer, primary_key=True)
    raison_sociale = db.Column(db.String(255), nullable=False)

    # Relations
    salaries = db.relationship("Salaries", back_populates="employeur", cascade="all, delete-orphan")
    abondements = db.relationship("Abondement", back_populates="employeur", cascade="all, delete-orphan")

# -----------------------------------------------------------------------------
# Catégorie (pour les partenaires)
# -----------------------------------------------------------------------------
class Categorie(db.Model):
    __tablename__ = "categories"
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False, unique=True)

# -----------------------------------------------------------------------------
# Salarié
# -----------------------------------------------------------------------------
class Salaries(db.Model):
    __tablename__ = "salaries"
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    prenom = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    employeur_id = db.Column(db.Integer, db.ForeignKey("employeurs.id"), nullable=False)
    couleur_carte = db.Column(db.String(7), nullable=False)  # HEX, ex: "#FF5733"
    couleur_texte = db.Column(db.String(7), nullable=False)  # HEX
    motif = db.Column(SQLEnum(MotifCarte), nullable=False, default=MotifCarte.aucun)
    effet_metallise = db.Column(db.Integer, nullable=False, default=0)  # 0–100

    # Relation
    employeur = db.relationship("Employeur", back_populates="salaries")
    transactions = db.relationship("Transaction", back_populates="salarie", foreign_keys="Transaction.salarie_id", cascade="all, delete-orphan")
    abondements_recus = db.relationship("Abondement", back_populates="salarie", cascade="all, delete-orphan")

    # Propriété dérivée : solde courant
    @property
    def solde(self):
        from sqlalchemy import func
        total_credits = db.session.query(func.sum(Abondement.montant)).filter_by(salarie_id=self.id).scalar() or 0
        total_debits = db.session.query(func.sum(Transaction.montant)).filter_by(salarie_id=self.id, statut=TransactionStatut.validee).scalar() or 0
        return total_credits - total_debits

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# -----------------------------------------------------------------------------
# Partenaire
# -----------------------------------------------------------------------------
class Partenaire(db.Model):
    __tablename__ = "partenaires"
    id = db.Column(db.Integer, primary_key=True)
    raison_sociale = db.Column(db.String(255), nullable=False)
    siren = db.Column(db.String(9), nullable=False, unique=True)  # contrôlé via Luhn côté applicatif
    objet_social = db.Column(db.String(255), nullable=True)
    categorie_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    adresse = db.Column(db.String(255), nullable=False)
    ville = db.Column(db.String(100), nullable=False)
    code_postal = db.Column(db.String(10), nullable=False)
    email_contact = db.Column(db.String(255), unique=True, nullable=False, index=True)
    nom_representant = db.Column(db.String(150), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    statut = db.Column(SQLEnum(PartnerStatus), nullable=False, default=PartnerStatus.en_attente)
    image_partenaire = db.Column(db.String(512), nullable=True)  # URL ou chemin

    # Relations
    categorie = db.relationship("Categorie")
    transactions = db.relationship("Transaction", back_populates="partenaire", cascade="all, delete-orphan")
    coups_de_coeur = db.relationship("CoupDeCoeur", back_populates="partenaire", cascade="all, delete-orphan")
    decisions = db.relationship("Decision", back_populates="partenaire", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# -----------------------------------------------------------------------------
# Transaction
# -----------------------------------------------------------------------------
class Transaction(db.Model):
    __tablename__ = "transactions"
    id = db.Column(db.Integer, primary_key=True)
    salarie_id = db.Column(db.Integer, db.ForeignKey("salaries.id"), nullable=False)
    partenaire_id = db.Column(db.Integer, db.ForeignKey("partenaires.id"), nullable=False)
    montant = db.Column(db.Float, nullable=False)
    horodatage = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    statut = db.Column(SQLEnum(TransactionStatut), nullable=False, default=TransactionStatut.validee)
    reference_qr = db.Column(db.String(255), nullable=False, unique=True)
    idempotency_key = db.Column(db.String(512), unique=True, nullable=True)
    sens_ecriture = db.Column(db.String(20), nullable=False, default="debit")  # "debit" ou "contre-ecriture"
    transaction_originale_id = db.Column(db.Integer, db.ForeignKey("transactions.id"), nullable=True)  # pour correction

    # Relations
    salarie = db.relationship("Salaries", foreign_keys=[salarie_id], back_populates="transactions")
    partenaire = db.relationship("Partenaire", back_populates="transactions")
    corrections = db.relationship("Transaction", backref=db.backref("originale", remote_side=[id]), foreign_keys=[transaction_originale_id])

    __table_args__ = (
        CheckConstraint("montant > 0", name="ck_transaction_montant_positive"),
    )

@event.listens_for(Transaction, 'before_update')
def block_transaction_update(mapper, connection, target):
    # On autorise uniquement les corrections via une nouvelle transaction, pas de modification directe
    raise Exception("Règle comptable : Une transaction validée est immuable. Les UPDATE sont interdits.")

@event.listens_for(Transaction, 'before_delete')
def block_transaction_delete(mapper, connection, target):
    raise Exception("Règle comptable : Une transaction validée est immuable. Les DELETE sont interdits.")

# -----------------------------------------------------------------------------
# Abondement (crédit employeur → salarié)
# -----------------------------------------------------------------------------
class Abondement(db.Model):
    __tablename__ = "abondements"
    id = db.Column(db.Integer, primary_key=True)
    employeur_id = db.Column(db.Integer, db.ForeignKey("employeurs.id"), nullable=False)
    salarie_id = db.Column(db.Integer, db.ForeignKey("salaries.id"), nullable=False)
    montant = db.Column(db.Float, nullable=False)
    horodatage = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    agent_admin_id = db.Column(db.Integer, nullable=False)  # ID de l’admin ayant saisi

    # Relations
    employeur = db.relationship("Employeur", back_populates="abondements")
    salarie = db.relationship("Salaries", back_populates="abondements_recus")

    __table_args__ = (
        CheckConstraint("montant > 0", name="ck_abondement_montant_positive"),
    )

# -----------------------------------------------------------------------------
# Coup de cœur du Ministre
# -----------------------------------------------------------------------------
class CoupDeCoeur(db.Model):
    __tablename__ = "coups_de_coeur"
    id = db.Column(db.Integer, primary_key=True)
    partenaire_id = db.Column(db.Integer, db.ForeignKey("partenaires.id"), nullable=False)
    mot_du_ministre = db.Column(db.Text, nullable=False)
    horodatage = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    statut = db.Column(SQLEnum(CoupDeCoeurStatut), nullable=False, default=CoupDeCoeurStatut.actif)
    nombre_clicks = db.Column(db.Integer, nullable=False, default=0)

    # Relation
    partenaire = db.relationship("Partenaire", back_populates="coups_de_coeur")

# -----------------------------------------------------------------------------
# Table de décision / traçabilité (exigée par Pontaillac)
# -----------------------------------------------------------------------------
class Decision(db.Model):
    __tablename__ = "decisions"
    id = db.Column(db.Integer, primary_key=True)
    partenaire_id = db.Column(db.Integer, db.ForeignKey("partenaires.id"), nullable=False)
    agent_id = db.Column(db.Integer, nullable=False)  # ID de l’administrateur
    sens = db.Column(SQLEnum(DecisionSens), nullable=False)
    motif_ecrit = db.Column(db.Text, nullable=False)
    horodatage = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relation
    partenaire = db.relationship("Partenaire", back_populates="decisions")
    