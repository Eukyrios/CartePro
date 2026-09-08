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
from services.audit_service import record_event

#: Le geste, et l'état qu'il laisse au compte.
#:
#: Un geste par état d'arrivée, et pas un de plus : « réactiver » et « activer »
#: seraient le même geste écrit deux fois.
GESTES_COMPTE = {
    "activer": CompteStatut.actif,
    "suspendre": CompteStatut.suspendu,
    "cloturer": CompteStatut.cloture,
}

#: L'action inscrite au journal d'audit pour chaque geste.
#:
#: Écrite à côté de `GESTES_COMPTE` pour la même raison que celle-ci l'est à
#: côté des statuts : un geste ajouté sans son action jumelle se verrait à la
#: lecture. Le vocabulaire prolonge celui de l'instruction d'un dossier —
#: `partenaire_valide`, `partenaire_suspendu` — et se distingue de
#: `compte_cree` / `compte_modifie`, que `auth.py` emploie déjà pour ce que le
#: titulaire fait de son propre compte. Ici, c'est un agent qui décide.
ACTIONS_AUDIT = {
    "activer": "compte_active",
    "suspendre": "compte_suspendu",
    "cloturer": "compte_cloture",
}

#: Les gestes dont on ne revient pas, et que l'écran fait confirmer deux fois.
IRREVERSIBLES = {"cloturer"}


def mesurer(salarie, geste, motif, agent_id=AGENT_DEMONSTRATION, ip=None):
    """Applique `geste` au compte de `salarie` et écrit la mesure motivée.

    Renvoie le couple (état avant, état après), en chaînes, pour que l'appelant
    puisse dire ce qui a changé.

    **Le journal d'audit s'écrit ici et non dans la route**, comme pour
    `instruction.instruire` : les trois écritures — le statut du compte, la
    mesure motivée, la ligne du journal — partagent alors la transaction de
    l'appelant, donc soit les trois s'écrivent, soit aucune. Posée dans la
    route, la ligne d'audit manquerait à tout autre appelant : ce module est le
    pendant de `instruction.py`, dont l'écran **et** la ligne de commande
    passent par le même point, et rien ne dit que les mesures de compte
    n'auront pas leur `instruire.py` un jour.

    `ip` est passée par l'appelant plutôt que lue ici : ce module ne connaît pas
    Flask, et il doit rester appelable hors d'une requête — d'où le défaut à
    `None`, qui dit alors la vérité (l'appel ne vient pas du réseau).
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

    trace = {"avant": avant, "apres": statut.value, "motif": propre}
    if geste == "cloturer":
        # Le reliquat au moment de fermer, et seulement là : c'est le seul
        # chiffre que rien ne permettra de recalculer si le compte disparaît
        # ensuite — `api_delete_account` supprime les abondements en cascade,
        # donc la somme qui restait sur un compte clôturé puis supprimé
        # n'existerait plus nulle part. Lu ici et non reçu de la route : un
        # futur appelant l'oublierait, et les deux ne peuvent pas diverger
        # puisque c'est la même transaction et qu'une mesure ne déplace pas
        # d'argent.
        trace["solde_residuel_cents"] = round(salarie.solde * 100)

    # Le nom du titulaire, son adresse et son employeur n'y sont pas :
    # `target_id` suffit à désigner la personne, et un journal impurgeable n'a
    # pas à garder son identité en clair pour toujours.
    record_event(
        action=ACTIONS_AUDIT[geste],
        actor_role="admin",
        actor_id=f"admin:{agent_id}" if agent_id is not None else None,
        target_type="compte_salarie",
        target_id=salarie.id,
        payload=trace,
        ip=ip,
    )
    return avant, statut.value
