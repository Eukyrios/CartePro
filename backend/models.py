from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, event, Enum as SQLEnum
import enum

db = SQLAlchemy()

# -----------------------------------------------------------------------------
# Enums
# -----------------------------------------------------------------------------

class CoupDeCoeurStatut(enum.Enum):
    actif = "actif"
    suspendu = "suspendu"

class PartnerStatus(enum.Enum):
    en_attente = "en_attente"
    valide = "validé"
    refuse = "refusé"
    suspendu = "suspendu"
    # La cloture, pendant de `CompteStatut.cloture` du cote des salaries : la
    # fin definitive d'un compte, par opposition au refus, qui est une decision
    # sur un dossier et se reexamine. Un etablissement qui ferme boutique n'est
    # pas un etablissement ecarte, et l'ecrire « refuse » raconterait de lui
    # quelque chose de faux.
    #
    # Rien n'est efface pour autant : ses encaissements passes restent, comme
    # restent les paiements d'un salarie clos. Le nom stocke — « cloture », 7
    # caracteres — tient dans le VARCHAR(10) de la colonne, donc l'ajout ne
    # demande aucune migration.
    cloture = "clôturé"

class DecisionSens(enum.Enum):
    accepte = "accepté"
    refuse = "refusé"
    suspendu = "suspendu"
    # Une demande de reexamen n'est pas une decision de l'administration : c'est
    # l'etablissement qui redepose. Elle a sa place dans la meme table parce que
    # c'est le journal de l'instruction, et qu'un dossier qui rouvre doit
    # laisser une trace comme celui qui se ferme. La noter « suspendu », faute
    # de mieux, rendait l'historique illisible : « refuse → suspendu → refuse ».
    reexamen = "réexamen demandé"
    # Le sens de la cloture d'un etablissement. « cloture » fait 7 caracteres,
    # la colonne en accepte 8 : pas de migration non plus.
    cloture = "clôturé"

class CompteStatut(enum.Enum):
    """L'état d'un compte salarié, décidé par l'administration.

    Le pendant de `PartnerStatus` du côté des salariés, qui n'en avaient pas :
    `accounts.actif()` répondait « oui » pour tout salarié, sans exception, donc
    aucun compte ne pouvait être fermé autrement qu'en le supprimant — et le
    supprimer emporterait ses transactions, que le schéma tient pour immuables.

    « Clôturé » n'est pas « suspendu ». La suspension est une mesure en cours,
    qui se lève ; la clôture est définitive et ne se rouvre pas par la même
    porte — l'écran d'administration le dit avant de la prendre. Ni l'une ni
    l'autre n'efface quoi que ce soit : les abondements reçus et les paiements
    faits restent, et le solde reste calculable.
    """
    actif = "actif"
    suspendu = "suspendu"
    cloture = "clôturé"

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
    # La couleur de la vignette du compte : l'aplat sur lequel se pose
    # l'initiale, dans les listes de l'administration comme dans la barre
    # haute. Une couleur et non une image : le dispositif ne collectionne pas
    # les visages de ses beneficiaires, et une initiale sur un aplat distingue
    # deux comptes homonymes sans rien apprendre sur personne.
    #
    # Tiree au hasard a la creation du compte — voir `accounts.couleur_tiree` —
    # puis modifiable par le titulaire depuis ses reglages. Nullable pour que
    # les comptes crees avant cette colonne restent lisibles : `avatar_ou_defaut`
    # rend alors la couleur tiree du nom, donc stable et jamais vide.
    couleur_avatar = db.Column(db.String(7), nullable=True)
    # L'état du compte. Par défaut actif : une inscription n'a pas à être
    # activée à la main, c'est la suspension et la clôture qui sont des gestes.
    statut = db.Column(SQLEnum(CompteStatut), nullable=False, default=CompteStatut.actif)

    # Relation
    employeur = db.relationship("Employeur", back_populates="salaries")
    transactions = db.relationship("Transaction", back_populates="salarie", foreign_keys="Transaction.salarie_id", cascade="all, delete-orphan")
    abondements_recus = db.relationship("Abondement", back_populates="salarie", cascade="all, delete-orphan")
    mesures = db.relationship("MesureCompte", back_populates="salarie", cascade="all, delete-orphan")

    # Propriété dérivée : solde courant
    @property
    def solde(self):
        from sqlalchemy import func
        total_credits = db.session.query(func.sum(Abondement.montant)).filter_by(salarie_id=self.id).scalar() or 0
        total_debits = db.session.query(func.sum(Transaction.montant)).filter_by(salarie_id=self.id, statut=TransactionStatut.validee, sens_ecriture="debit").scalar() or 0
        total_contres = db.session.query(func.sum(Transaction.montant)).filter_by(salarie_id=self.id, statut=TransactionStatut.validee, sens_ecriture="contre-ecriture").scalar() or 0
        return total_credits - total_debits + total_contres

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
    # Le slug : l'identifiant qui tient dans une URL. Le catalogue l'expose et
    # /espace/partenaire/<slug> le resout, donc il doit etre stable et unique.
    # Une cle primaire ne convient pas : elle change a chaque nouveau seed, et
    # les pages du front sont pre-rendues sur ces slugs.
    slug = db.Column(db.String(120), unique=True, nullable=False, index=True)
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
    likes = db.relationship("PartenaireLike", backref="partenaire", cascade="all, delete-orphan")
    image_partenaire = db.Column(db.String(512), nullable=True)  # URL ou chemin

    # Le tarif inscrit sur la fiche : ce que le partenaire demande. C'est le
    # commercant qui fixe son prix, jamais le salarie — d'où sa place ici et
    # non sur la transaction.
    tarif = db.Column(db.Float, nullable=False, default=0.0)

    # Cette fiche est-elle renseignee pour de vrai ?
    #
    # Le demonstrateur melange deux choses : quelques partenaires dont les
    # donnees ont ete redigees, et un reseau de remplissage dont les textes
    # sont du latin genere. Une colonne le dit, plutot que de laisser le
    # lecteur deviner — et plutot que de le deduire du coup de coeur, qui est un
    # gout de l'administrateur et non un constat sur la qualite des donnees.
    donnees_reelles = db.Column(db.Boolean, nullable=False, default=False)

    # La presentation que le partenaire ecrit lui-meme, depuis ses parametres,
    # et que sa fiche publique affiche. Facultative de bout en bout : une fiche
    # sans presentation n'affiche pas la section.
    site_web = db.Column(db.String(255), nullable=False, default="")
    presentation_titre = db.Column(db.String(120), nullable=False, default="")
    presentation_texte = db.Column(db.Text, nullable=False, default="")
    # Un texte libre par jour, sept cles. Vide veut dire ferme. JSON parce que
    # sept colonnes pour sept jours n'apprendraient rien de plus a la base.
    horaires = db.Column(db.JSON, nullable=False, default=dict)

    # Relations
    categorie = db.relationship("Categorie")
    transactions = db.relationship("Transaction", back_populates="partenaire", cascade="all, delete-orphan")
    decisions = db.relationship("Decision", back_populates="partenaire", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# -----------------------------------------------------------------------------
# Administrateur
# -----------------------------------------------------------------------------
class Admin(db.Model):
    """L'agent de l'administration : celui qui conventionne et qui abonde.

    `Abondement.agent_admin_id` et `Decision.agent_id` referencaient deja un
    administrateur, mais par un entier nu sans table derriere. Les deux routes
    protegees (`/api/admin/transactions.csv`, la suppression d'un partenaire)
    verifient un role « admin » dans le jeton : sans compte, elles etaient
    inatteignables.
    """
    __tablename__ = "admins"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    nom = db.Column(db.String(150), nullable=False, default="Agent de l'administration")
    password_hash = db.Column(db.String(256), nullable=False)

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
    motif = db.Column(db.String(512), nullable=True)

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
    # La clé d'idempotence, comme `Transaction.idempotency_key` et pour la même
    # raison : créditer est une écriture d'argent, et un double envoi — un
    # double-clic, un réseau qui repart — ne doit pas créditer deux fois. Le
    # navigateur en pose une par saisie ; l'unicité fait le reste. Nullable,
    # parce que le seed et les scripts n'en ont pas besoin.
    reference = db.Column(db.String(120), unique=True, nullable=True)

    # Relations
    employeur = db.relationship("Employeur", back_populates="abondements")
    salarie = db.relationship("Salaries", back_populates="abondements_recus")

    __table_args__ = (
        CheckConstraint("montant > 0", name="ck_abondement_montant_positive"),
    )

# -----------------------------------------------------------------------------
# Mesure sur un compte salarié (activation, suspension, clôture)
# -----------------------------------------------------------------------------
class MesureCompte(db.Model):
    """Une mesure prise sur un compte salarié, et le motif écrit qui la porte.

    Le pendant exact de `Decision` du côté des salariés. Même règle, et pour la
    même raison : un compte ne change pas d'état sans qu'on sache qui l'a
    décidé, quand, et pourquoi. Rien n'est effacé — un compte suspendu puis
    réactivé puis clôturé laisse trois lignes, dans cet ordre.

    Table à part plutôt que colonnes sur `salaries` : un état courant n'est pas
    un historique, et `Decision` ne peut pas servir ici — son `partenaire_id`
    est non nul.

    `sens` porte l'état d'arrivée, et non un vocabulaire parallèle : les trois
    gestes mènent chacun à un état et un seul, donc une seconde énumération
    n'apprendrait rien et pourrait diverger. C'est la différence avec
    `Decision`, dont le sens « réexamen demandé » ne correspond à aucun statut.
    """
    __tablename__ = "mesures_compte"
    id = db.Column(db.Integer, primary_key=True)
    salarie_id = db.Column(db.Integer, db.ForeignKey("salaries.id"), nullable=False)
    agent_id = db.Column(db.Integer, nullable=False)  # ID de l'administrateur
    sens = db.Column(SQLEnum(CompteStatut), nullable=False)
    motif_ecrit = db.Column(db.Text, nullable=False)
    horodatage = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relation
    salarie = db.relationship("Salaries", back_populates="mesures")

# -----------------------------------------------------------------------------
# Coup de cœur des utilisateurs
# -----------------------------------------------------------------------------
class PartenaireLike(db.Model):
    __tablename__ = "partenaire_likes"
    id = db.Column(db.Integer, primary_key=True)
    salarie_id = db.Column(db.Integer, db.ForeignKey("salaries.id"), nullable=False)
    partenaire_id = db.Column(db.Integer, db.ForeignKey("partenaires.id"), nullable=False)
    horodatage = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Un salarié ne peut liker un même partenaire qu'une seule fois
    __table_args__ = (
        db.UniqueConstraint('salarie_id', 'partenaire_id', name='uq_salarie_partenaire_like'),
    )

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

# -----------------------------------------------------------------------------
# Journal d'audit (exige par la Cour des comptes, courriel Vignal du 8 septembre)
# -----------------------------------------------------------------------------
class AuditLog(db.Model):
    """Une ecriture immuable pour chaque operation sensible.

    Ajout seul. La garantie ne tient pas a ce fichier — un developpeur presse
    contourne du code, pas un droit refuse en base — mais au `REVOKE UPDATE,
    DELETE` pose sur l'utilisateur applicatif par
    `provision_postgres.py`. Les deux ecouteurs ci-dessous sont une seconde
    ligne de defense, pas la premiere : ils bloquent l'ORM, pas un client SQL
    direct avec les memes droits que l'application.

    Le chainage (`prev_hash`, `hash`) rend une suppression intercalaire
    detectable : voir `audit_chain.py` pour l'ordre exact des champs et
    `verify_audit.py` pour la verification, qui ne se connecte jamais a cette
    table.
    """
    __tablename__ = "audit_log"
    id = db.Column(db.Integer, primary_key=True)
    occurred_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    actor_id = db.Column(db.String(64), nullable=True)
    actor_role = db.Column(db.String(20), nullable=False)
    action = db.Column(db.String(64), nullable=False, index=True)
    target_type = db.Column(db.String(64), nullable=True)
    # 255 et non 64 : on y ecrit des slugs de partenaire, dont la colonne fait
    # 120. SQLite ne dit rien d'une chaine trop longue, Postgres refuse — et
    # c'est Postgres que ce journal vise. La longueur n'entre pas dans le
    # chainage (`audit_chain.py` hache des valeurs), donc l'elargir n'invalide
    # aucune ligne deja ecrite ; l'elargir *apres* le provisionnement, en
    # revanche, demanderait un ALTER TABLE sur une table dont on vient de jurer
    # qu'elle ne se modifie pas.
    target_id = db.Column(db.String(255), nullable=True)
    payload = db.Column(db.JSON, nullable=False, default=dict)
    ip = db.Column(db.String(64), nullable=True)
    # L'empreinte du precedent (0000...0 pour la premiere ligne), et la sienne
    # propre, que la ligne suivante portera comme prev_hash.
    prev_hash = db.Column(db.String(64), nullable=True)
    hash = db.Column(db.String(64), nullable=False, unique=True)

@event.listens_for(AuditLog, 'before_update')
def block_audit_log_update(mapper, connection, target):
    raise Exception("Journal d'audit : ajout seul. Les UPDATE sont interdits.")

@event.listens_for(AuditLog, 'before_delete')
def block_audit_log_delete(mapper, connection, target):
    raise Exception("Journal d'audit : ajout seul. Les DELETE sont interdits.")
    