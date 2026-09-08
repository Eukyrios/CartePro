"""Les mouvements d'un compte : ce qu'il a payé, et ce qu'il a reçu.

Écrit ici plutôt que dans une route parce que deux audiences posent exactement
la même question. Le titulaire la pose sur son propre compte — `GET
/api/transactions/me` — et l'administration la pose sur le compte de n'importe
quel salarié, quand elle vient lire son historique de dépenses. Deux routes,
un seul calcul : recopié, l'un des deux aurait fini par oublier les
abondements, et les deux écrans auraient affiché deux histoires du même argent.

**Les abondements sont du lot** pour un salarié. Sans eux l'historique n'aurait
que des débits, la question « d'où vient cet argent » resterait sans réponse, et
le solde après chaque opération ne serait plus recalculable à l'écran : c'est
lui que la colonne « solde après » imprime, et il se déduit de la suite complète
des mouvements, pas des seuls paiements.

Un partenaire n'a rien reçu d'un employeur : ses mouvements sont ses
encaissements, et rien d'autre.
"""

from accounts import nom_affiche
from models import Abondement, Partenaire, Transaction, TransactionStatut


def libelle_salarie(salarie):
    """Le salarié tel qu'un écran peut le nommer : son nom, jamais son email.

    L'adresse est l'identifiant de connexion de cette personne, et le nom
    suffit à reconnaître une opération dans une liste.
    """
    if not salarie:
        return "Salarié"
    return nom_affiche(salarie) or f"Salarié #{salarie.id}"


def mouvements_du_compte(compte):
    """Les mouvements du compte, du plus récent au plus ancien.

    Seuls les paiements **validés** comptent, ici comme partout : un paiement
    refusé n'a pas eu lieu, et le faire figurer dans un historique reviendrait à
    inventer une opération.

    Le sens est celui du compte qui lit : un partenaire ne voit que des
    `credit` — ce qu'il a encaissé — et un salarié voit ses paiements en `debit`
    et ses crédits d'employeur en `credit`. Le `label` suit la même règle :
    chez qui pour l'un, de qui pour l'autre.
    """
    est_partenaire = isinstance(compte, Partenaire)

    query = Transaction.query.filter_by(statut=TransactionStatut.validee)
    query = (
        query.filter_by(partenaire_id=compte.id)
        if est_partenaire
        else query.filter_by(salarie_id=compte.id)
    )

    lignes = [
        {
            "id": str(t.id),
            "at": t.horodatage.isoformat(),
            "kind": "credit" if est_partenaire else "debit",
            "amountCents": round(t.montant * 100),
            "label": (
                libelle_salarie(t.salarie)
                if est_partenaire
                else t.partenaire.raison_sociale
            ),
            "partnerId": t.partenaire.slug,
            # La catégorie accompagne chaque paiement : l'historique se filtre
            # par catégorie, et la faire chercher dans le catalogue demanderait
            # une seconde requête pour une information que celle-ci connaît.
            "partnerCategorie": (
                t.partenaire.categorie.nom if t.partenaire.categorie else ""
            ),
        }
        for t in query.all()
    ]

    if not est_partenaire:
        lignes += [
            {
                "id": f"abondement-{a.id}",
                "at": a.horodatage.isoformat(),
                "kind": "credit",
                "amountCents": round(a.montant * 100),
                "label": f"Crédit employeur — {a.employeur.raison_sociale}",
                "partnerId": None,
                "partnerCategorie": "",
            }
            for a in Abondement.query.filter_by(salarie_id=compte.id).all()
        ]

    lignes.sort(key=lambda ligne: ligne["at"], reverse=True)
    return lignes
