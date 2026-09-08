"""L'API d'administration : instruire les dossiers, lire le reseau, exporter.

Portee de la branche `front-homepage-admin` et reecrite pour le schema
normalise. Sur cette branche, un partenaire etait une ligne de la table `users`
avec `role="partenaire"` et un booleen `is_active`, et approuver un dossier
consistait a passer ce booleen a vrai. Ici, un partenaire a sa table, son
`statut` est une enumeration a quatre valeurs, et chaque changement de statut
s'accompagne d'une **decision ecrite et motivee** dans la table `decisions`.
L'idee de la branche est reprise ; son code ne l'est pas, il ne s'appliquerait
a rien.

Le geste d'instruction lui-meme est dans `instruction.py`, partage avec la
ligne de commande `instruire.py` : une approbation faite depuis l'ecran laisse
exactement la meme trace qu'une approbation faite au clavier.

Toutes les routes portent `@admin_required` (voir `decorators.py`). C'est le
second apport de la branche, et il corrige un trou reel : `POST
/transactions/<id>/annuler` n'avait ici **aucun** garde — ni jeton, ni role.
"""

from flask import Blueprint, jsonify, request, Response

from accounts import nom_affiche
from decorators import admin_required
from flask_jwt_extended import get_jwt_identity
from instruction import GESTES, MotifManquant, instruire
from models import Partenaire, PartnerStatus, Transaction, TransactionStatut, db
from services.audit_service import record_event
from services.csv_service import generate_transactions_csv

admin_bp = Blueprint('admin', __name__)


def _agent_courant():
    """L'identifiant de l'admin connecte, tel que le jeton le porte.

    L'identite est de la forme `"admin:1"` — voir `accounts.identite`. On n'y
    accede qu'apres `@admin_required`, donc le prefixe est toujours `admin`.
    """
    identite = get_jwt_identity() or ""
    _, _, brut = str(identite).partition(":")
    return int(brut) if brut.isdigit() else None


def _derniere_decision(partenaire):
    """La decision la plus recente du dossier, ou None."""
    decisions = sorted(partenaire.decisions, key=lambda d: d.horodatage)
    return decisions[-1] if decisions else None


def _dossier(partenaire):
    """Un dossier vu par l'administration.

    Volontairement plus bavard que `routes/partenaires._entree` : le motif de
    la derniere decision en fait partie. C'est licite ici et nulle part
    ailleurs — la route publique du catalogue ne doit jamais le servir, parce
    qu'un refus est un dossier adresse au seul etablissement concerne.
    """
    derniere = _derniere_decision(partenaire)
    return {
        # Le slug, comme partout dans les URL du front.
        "id": partenaire.slug,
        "nom": partenaire.raison_sociale,
        "secteur": partenaire.categorie.nom if partenaire.categorie else "Non defini",
        "email": partenaire.email_contact or "",
        "representant": partenaire.nom_representant or "",
        "siren": partenaire.siren or "",
        "objetSocial": partenaire.objet_social or "",
        "adresse": partenaire.adresse or "",
        "ville": partenaire.ville or "",
        "codePostal": partenaire.code_postal or "",
        "amountCents": round((partenaire.tarif or 0) * 100),
        "photo": partenaire.image_partenaire or "",
        "statut": partenaire.statut.value,
        "officiel": partenaire.statut == PartnerStatus.valide,
        "donneesReelles": partenaire.donnees_reelles,
        # La fiche que le partenaire redige lui-meme. Elle est publique de
        # toute facon — le catalogue la sert — mais l'agent qui instruit a
        # besoin de la lire ici : c'est une piece du dossier, et aller la
        # chercher sur la fiche publique lui demanderait de quitter l'ecran.
        "siteWeb": partenaire.site_web or "",
        "presentationTitre": partenaire.presentation_titre or "",
        "presentationTexte": partenaire.presentation_texte or "",
        "horaires": partenaire.horaires or {},
        # L'historique complet : c'est ce qui distingue un dossier jamais
        # instruit d'un dossier revenu en instruction apres un refus.
        "decisions": [
            {
                "sens": d.sens.value,
                "motif": d.motif_ecrit,
                "at": d.horodatage.isoformat() if d.horodatage else None,
            }
            for d in sorted(partenaire.decisions, key=lambda d: d.horodatage)
        ],
        "derniereDecision": (
            {
                "sens": derniere.sens.value,
                "motif": derniere.motif_ecrit,
                "at": derniere.horodatage.isoformat() if derniere.horodatage else None,
            }
            if derniere
            else None
        ),
    }


def _par_statut(statut):
    return (
        Partenaire.query.filter_by(statut=statut)
        .order_by(Partenaire.raison_sociale.asc())
        .all()
    )


# --- Les dossiers ------------------------------------------------------------

@admin_bp.route('/partenaires/demandes', methods=['GET'])
@admin_required
def lister_demandes():
    """Les dossiers en attente d'instruction.

    « En attente » couvre deux cas que l'ecran ne distingue pas mais que
    l'historique, lui, porte : une inscription jamais instruite, et un dossier
    revenu en instruction apres un refus (`sens="réexamen demandé"`). Les deux
    attendent la meme chose de l'administration, d'ou la meme liste.
    """
    dossiers = _par_statut(PartnerStatus.en_attente)
    return jsonify({"demandes": [_dossier(p) for p in dossiers]}), 200


@admin_bp.route('/partenaires', methods=['GET'])
@admin_required
def lister_conventionnes():
    """Les etablissements conventionnes — les Partenaires Officiels."""
    dossiers = _par_statut(PartnerStatus.valide)
    return jsonify({"partenaires": [_dossier(p) for p in dossiers]}), 200


@admin_bp.route('/partenaires/<slug>', methods=['GET'])
@admin_required
def lire_dossier(slug):
    """Un dossier, quel que soit son statut.

    C'est la route de l'ecran de dossier, celui d'ou l'on decide. Elle sert
    n'importe quel statut et non les seuls dossiers en attente : on relit un
    dossier deja instruit — pour retrouver le motif d'un refus, ou suspendre un
    etablissement conventionne — aussi souvent qu'on en instruit un neuf.

    Cette regle-ci ne masque pas `/partenaires/demandes` : Werkzeug range les
    regles statiques avant celles qui portent un convertisseur, donc
    « demandes » continue d'atteindre `lister_demandes`. Le test
    `test_demandes_n_est_pas_avale_par_la_route_de_dossier` le verifie, parce
    que c'est le genre de chose qui casse sans bruit.
    """
    partenaire = Partenaire.query.filter_by(slug=slug).first()
    if not partenaire:
        return jsonify({"error": "Dossier introuvable."}), 404
    return jsonify({"dossier": _dossier(partenaire)}), 200


def _instruire_par_slug(slug, geste, motif):
    """Applique un geste d'instruction, et rend la reponse HTTP qui va avec."""
    partenaire = Partenaire.query.filter_by(slug=slug).first()
    if not partenaire:
        return jsonify({"error": "Dossier introuvable."}), 404

    # Le statut d'arrivee du geste, lu de `instruction.GESTES` : un geste
    # ajoute la-bas n'a pas a etre recopie ici.
    _, apres = GESTES[geste]
    if partenaire.statut == apres:
        return jsonify({
            "error": f"Ce dossier est déjà « {apres.value} »."
        }), 409

    # Un etablissement clos ne se rouvre pas d'un clic. La cloture est
    # presentee comme definitive a l'ecran ; l'accepter puis la defaire par la
    # route d'approbation rendrait cette phrase fausse. Il reste l'inscription
    # d'un nouvel etablissement, qui est ce qui se passe reellement quand un
    # commerce rouvre sous une autre enseigne.
    if partenaire.statut == PartnerStatus.cloture:
        return jsonify({
            "error": (
                "Cet établissement est clôturé. Une clôture est définitive : "
                "elle ne se lève pas, un nouveau dossier se dépose."
            )
        }), 409

    try:
        avant, nouveau = instruire(
            partenaire, geste, motif,
            agent_id=_agent_courant(), ip=request.remote_addr,
        )
    except MotifManquant as manque:
        # 422 et non 400 : la requete est bien formee, c'est son contenu qui ne
        # permet pas de decider. Une decision sans motif n'est pas une decision.
        return jsonify({"error": str(manque)}), 422

    db.session.commit()
    return jsonify({
        "message": f"{partenaire.raison_sociale} : {avant} → {nouveau}.",
        "dossier": _dossier(partenaire),
    }), 200


@admin_bp.route('/partenaires/<slug>/approuver', methods=['POST'])
@admin_required
def approuver(slug):
    """Conventionner un etablissement.

    Le motif est requis comme pour un refus. Une acceptation se motive aussi :
    c'est elle qui dit sur quelles pieces le conventionnement a ete accorde, et
    c'est ce que relira l'agent suivant. Faute de motif fourni, l'ecran en
    propose un par defaut — mais c'est l'ecran qui le propose, pas la route qui
    l'invente.
    """
    data = request.get_json(silent=True) or {}
    return _instruire_par_slug(slug, "accepter", data.get("motif"))


@admin_bp.route('/partenaires/<slug>/refuser', methods=['POST'])
@admin_required
def refuser(slug):
    """Ecarter un etablissement, avec le motif que son titulaire lira.

    Le motif part dans `decisions.motif_ecrit`, et c'est `/api/auth/me` qui le
    sert — au seul titulaire du compte. Il n'est jamais publie par le catalogue.
    """
    data = request.get_json(silent=True) or {}
    return _instruire_par_slug(slug, "refuser", data.get("motif"))


@admin_bp.route('/partenaires/<slug>/cloturer', methods=['POST'])
@admin_required
def cloturer(slug):
    """Clore le compte d'un etablissement. Definitif, et distinct du refus.

    Le refus est une decision sur un dossier : il se motive, se lit par le
    titulaire, et se reexamine. La cloture est la fin du compte — l'etablissement
    a ferme, changé de main, quitté le dispositif — et elle ne se reexamine pas.
    Les confondre ferait porter à un commerce qui ferme la mention d'un dossier
    écarté.

    Rien n'est efface : les encaissements passes restent, et l'historique des
    decisions garde la ligne, avec son motif.
    """
    data = request.get_json(silent=True) or {}
    return _instruire_par_slug(slug, "cloturer", data.get("motif"))


@admin_bp.route('/partenaires/<slug>/suspendre', methods=['POST'])
@admin_required
def suspendre(slug):
    """Suspendre un etablissement : une mesure en cours, pas une decision lue.

    Un compte suspendu ne peut plus se connecter — voir `accounts.actif` —, a
    la difference d'un compte refuse, qui entre et lit sa decision.
    """
    data = request.get_json(silent=True) or {}
    return _instruire_par_slug(slug, "suspendre", data.get("motif"))


# --- Historique des paiements -----------------------------------------------

def _libelle_salarie(salarie):
    """Le salarie tel qu'un ecran peut le nommer : son nom, jamais son email.

    Meme regle que `routes/transactions._libelle_salarie`, et pour la meme
    raison : l'adresse est l'identifiant de connexion de cette personne, et le
    nom suffit a reconnaitre une operation dans une liste.
    """
    if not salarie:
        return "Salarie"
    return nom_affiche(salarie) or f"Salarie #{salarie.id}"


@admin_bp.route('/transactions', methods=['GET'])
@admin_required
def lister_transactions():
    """Tous les paiements valides du dispositif, du plus recent au plus ancien.

    Le pendant JSON de `/transactions.csv`, pour l'ecran « Les recettes » de
    l'espace d'administration. L'export existait deja et sert a emporter le
    fichier ; celui-ci sert a le lire dans l'interface, et les deux repondent de
    la meme table sans se copier une regle : seuls les paiements **valides**
    comptent, ici comme dans `/api/transactions/me`.

    La forme d'une ligne est celle que rend `/api/transactions/me` a un
    partenaire, plus `partnerLabel` : c'est le meme composant qui les affiche
    des deux cotes, et un administrateur a besoin de savoir *chez qui* le
    paiement a eu lieu, ce qu'un partenaire regardant ses propres recettes sait
    deja.

    `?partenaire=<slug>` restreint a un etablissement. C'est ce que demande
    l'ecran des recettes d'un partenaire vu par l'administration : la meme
    question que celle du partenaire sur ses propres recettes, posee par
    quelqu'un qui a le droit de la poser sur n'importe lequel. Un slug inconnu
    ne repond pas 404 mais une liste vide : la route ne dit pas si un
    etablissement existe, c'est le travail du catalogue.
    """
    query = Transaction.query.filter_by(statut=TransactionStatut.validee)

    slug = (request.args.get('partenaire') or '').strip()
    if slug:
        partenaire = Partenaire.query.filter_by(slug=slug).first()
        if not partenaire:
            return jsonify({"transactions": []}), 200
        query = query.filter_by(partenaire_id=partenaire.id)

    lignes = [
        {
            "id": str(t.id),
            "at": t.horodatage.isoformat(),
            "kind": "debit" if t.sens_ecriture == "contre-ecriture" else "credit",
            "amountCents": round(t.montant * 100),
            "label": _libelle_salarie(t.salarie),
            "partnerLabel": (
                t.partenaire.raison_sociale if t.partenaire else "Partenaire"
            ),
            "partnerId": t.partenaire.slug if t.partenaire else None,
            "partnerCategorie": (
                t.partenaire.categorie.nom
                if t.partenaire and t.partenaire.categorie
                else ""
            ),
        }
        for t in query.order_by(Transaction.horodatage.desc()).all()
    ]
    return jsonify({"transactions": lignes}), 200


# --- Export ------------------------------------------------------------------

@admin_bp.route('/transactions.csv', methods=['GET'])
@admin_required
def export_transactions_csv():
    """Toutes les transactions, en CSV.

    Le controle du role etait ecrit a la main dans cette route ; il vient
    maintenant du decorateur, comme partout ailleurs dans ce fichier.
    """
    csv_data = generate_transactions_csv()

    record_event(
        action="admin_export_transactions_csv",
        actor_role="admin",
        actor_id=f"admin:{_agent_courant()}",
        target_type="export",
        target_id=None,
        payload={"format": "csv"},
        ip=request.remote_addr,
        commit=True,
    )

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=transactions.csv"}
    )


# --- Contre-passation ------------------------------------------------------

@admin_bp.route('/transactions/<int:transaction_id>/annuler', methods=['POST'])
@admin_required
def annuler_transaction_forcee(transaction_id):
    """Annule un paiement valide en inserant une contre-ecriture.

    Une transaction validee est immuable — `models.py` pose des ecouteurs qui
    bloquent tout UPDATE et tout DELETE dessus — donc annuler ne peut pas
    modifier la ligne. Cela en insere une seconde, inverse, qui reference
    l'originale (`transaction_originale_id`) et porte son motif. Les deux
    restent lisibles dans les deux historiques, et le solde du salarie, qui est
    derive, remonte de lui-meme.

    Le motif est obligatoire, comme pour toute mesure : « annule » sans raison
    n'explique rien a qui relira l'historique. Et une transaction deja corrigee
    ne se corrige pas deux fois.
    """
    tx = Transaction.query.get(transaction_id)
    if not tx:
        return jsonify({"error": "Transaction introuvable."}), 404
        
    if tx.statut != TransactionStatut.validee:
        return jsonify({"error": "Seules les transactions validées peuvent être annulées."}), 400
        
    if tx.sens_ecriture == "contre-ecriture":
        return jsonify({"error": "Cette transaction est déjà une annulation (contre-écriture)."}), 400
        
    correction_existante = Transaction.query.filter_by(transaction_originale_id=tx.id).first()
    if correction_existante:
        return jsonify({"error": "Cette transaction a déjà été annulée."}), 400
        
    data = request.get_json(silent=True) or {}
    motif = (data.get("motif") or "").strip()
    if not motif:
        return jsonify({"error": "Le motif de l'annulation est obligatoire."}), 400

    import uuid
    nouvelle_tx = Transaction(
        salarie_id=tx.salarie_id,
        partenaire_id=tx.partenaire_id,
        montant=tx.montant,
        statut=TransactionStatut.validee,
        reference_qr=f"cancel-{uuid.uuid4().hex[:8]}-{tx.reference_qr}",
        idempotency_key=f"cancel-{tx.idempotency_key}" if tx.idempotency_key else None,
        sens_ecriture="contre-ecriture",
        transaction_originale_id=tx.id,
        motif=motif
    )
    
    db.session.add(nouvelle_tx)
    db.session.flush()  # assigne l'id de la contre-ecriture avant l'ecriture d'audit

    # La cible est la transaction *d'origine*, pas la contre-ecriture : la
    # question qu'un controleur pose est « qu'est-il arrive au paiement n 412 »,
    # et la contre-ecriture est la reponse, pas la question. Le lien inverse est
    # dans le payload.
    #
    # Ni `reference_qr` ni `idempotency_key` n'y figurent : c'est le jeton signe
    # que le salarie a presente, il porte son identifiant, et un export d'audit
    # part chez un tiers. `salarie_id` et `partenaire_id` suffisent a designer
    # les parties, et ils pointent vers des tables effacables — la seule facon
    # de tenir un journal impurgeable a cote d'un droit a l'effacement.
    record_event(
        action="transaction_annulee",
        actor_role="admin",
        actor_id=get_jwt_identity(),
        target_type="transaction",
        target_id=tx.id,
        payload={
            "contre_ecriture_id": nouvelle_tx.id,
            "montant_cents": round(tx.montant * 100),
            "motif": motif,
            "salarie_id": tx.salarie_id,
            "partenaire_id": tx.partenaire_id,
        },
        ip=request.remote_addr,
    )
    db.session.commit()

    return jsonify({"message": "La transaction a été annulée avec succès et les fonds ont été restitués au salarié."}), 200
