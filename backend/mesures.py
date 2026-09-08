"""Mesurer un compte salarié : activer, suspendre, clôturer — le geste, en un seul endroit.

Le pendant de `instruction.py`, qui fait la même chose pour le dossier d'un
partenaire, et écrit sur le même modèle pour la même raison : changer l'état
d'un compte, c'est trois choses à la fois — poser le nouvel état, écrire une
mesure motivée dans `mesures_compte`, et ne rien effacer de ce qui précède.

Le motif est obligatoire. Un compte fermé sans motif écrit est une porte murée :
la personne qui ne peut plus se connecter a le droit de savoir pourquoi, et
l'agent suivant a besoin de lire ce qu'a décidé le précédent.

Ce que ce module ne fait pas, à dessein :

- il n'efface rien. Clôturer ne supprime pas le compte, et ne peut pas : ses
  transactions sont immuables (`models.py` bloque UPDATE et DELETE dessus), et
  la relation `Salaries.transactions` porte un `delete-orphan` qui les
  emporterait. Le solde d'un compte clôturé reste calculable, ce qui est la
  seule façon honnête de dire ce qu'il restait dessus le jour de la fermeture ;
- il ne valide pas l'état de départ. C'est à l'appelant de décider qu'un compte
  déjà suspendu n'a pas à être suspendu de nouveau, parce que la réponse tient
  de sa couche — 409 en HTTP ;
- il n'émet pas le commit, pour qu'on puisse grouper plusieurs mesures.
"""

from datetime import datetime, timezone

from instruction import AGENT_DEMONSTRATION, MotifManquant
from models import CompteStatut, MesureCompte, db

#: Le geste, et l'état qu'il laisse au compte.
#:
#: Un geste par état d'arrivée, et pas un de plus : « réactiver » et « activer »
#: seraient le même geste écrit deux fois.
GESTES_COMPTE = {
    "activer": CompteStatut.actif,
    "suspendre": CompteStatut.suspendu,
    "cloturer": CompteStatut.cloture,
}

#: Les gestes dont on ne revient pas, et que l'écran fait confirmer deux fois.
IRREVERSIBLES = {"cloturer"}


def mesurer(salarie, geste, motif, agent_id=AGENT_DEMONSTRATION):
    """Applique `geste` au compte de `salarie` et écrit la mesure motivée.

    Renvoie le couple (état avant, état après), en chaînes, pour que l'appelant
    puisse dire ce qui a changé.
    """
    if geste not in GESTES_COMPTE:
        raise ValueError(
            f"Geste inconnu : {geste!r}. Attendu : {', '.join(GESTES_COMPTE)}."
        )

    propre = (motif or "").strip()
    if not propre:
        raise MotifManquant("Une mesure se motive : donnez un motif écrit.")

    statut = GESTES_COMPTE[geste]
    avant = salarie.statut.value
    salarie.statut = statut
    db.session.add(
        MesureCompte(
            salarie_id=salarie.id,
            agent_id=agent_id,
            sens=statut,
            motif_ecrit=propre,
            horodatage=datetime.now(timezone.utc),
        )
    )
    return avant, statut.value
