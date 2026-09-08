"""Instruire le dossier d'un partenaire : le geste, en un seul endroit.

Accepter, refuser ou suspendre un etablissement, c'est trois choses a la fois :
changer son statut, ecrire une decision motivee dans la table `decisions`, et
ne rien effacer de ce qui precede. Deux appelants font ce geste — la ligne de
commande (`instruire.py`) et l'API d'administration (`routes/admin.py`) — et
c'est precisement pourquoi il est ici plutot que recopie dans les deux : une
approbation faite depuis l'ecran et une approbation faite au clavier doivent
laisser exactement la meme trace, sans quoi l'historique d'instruction depend
de l'outil qui l'a produit.

Rien n'est jamais efface. Un refus suivi d'un reexamen suivi d'un nouveau refus
laisse trois lignes, dans cet ordre, avec leurs trois motifs : c'est l'historique
de l'instruction, et c'est ce que la tracabilite exige.

Le motif est obligatoire, et le module le refuse s'il est vide. Une decision
sans motif n'est pas une decision, c'est une porte muree — et c'est le motif que
le partenaire lira dans son espace, lui seul.
"""

from datetime import datetime, timezone

from models import Decision, DecisionSens, PartnerStatus, db
from services.audit_service import record_event

#: L'action du journal d'audit associee a chaque geste. Ecrite a cote de
#: `GESTES` pour la meme raison : un geste ajoute ici sans son action jumelle
#: se verrait a la lecture.
ACTIONS_AUDIT = {
    "accepter": "partenaire_valide",
    "refuser": "partenaire_refuse",
    "suspendre": "partenaire_suspendu",
}

#: Le sens de la decision, et le statut qu'elle laisse au dossier.
#:
#: Ecrits cote a cote a dessein : un geste qui changerait le statut sans ecrire
#: la decision correspondante — ou l'inverse — sauterait aux yeux ici.
GESTES = {
    "accepter": (DecisionSens.accepte, PartnerStatus.valide),
    "refuser": (DecisionSens.refuse, PartnerStatus.refuse),
    "suspendre": (DecisionSens.suspendu, PartnerStatus.suspendu),
    # Clore un etablissement, et non l'ecarter : le refus est une decision sur
    # un dossier, qui se reexamine ; la cloture est la fin du compte, et elle
    # ne se leve pas. La route qui l'applique refuse de la defaire, comme du
    # cote des salaries.
    "cloturer": (DecisionSens.cloture, PartnerStatus.cloture),
}

#: L'agent par defaut : le compte admin du seed.
#:
#: La ligne de commande n'a pas de session, donc pas d'agent connecte. L'API,
#: elle, passe l'identifiant reel de l'administrateur qui a clique.
AGENT_DEMONSTRATION = 1


class MotifManquant(ValueError):
    """Leve quand on tente d'instruire un dossier sans motif ecrit."""


def instruire(partenaire, geste, motif, agent_id=AGENT_DEMONSTRATION, ip=None):
    """Applique `geste` au dossier de `partenaire` et ecrit la decision.

    Renvoie le couple (statut avant, statut apres), en chaines, pour que
    l'appelant puisse dire ce qui a change. Ne valide pas l'etat de depart :
    c'est a l'appelant de decider qu'un dossier deja accepte n'a pas a etre
    accepte de nouveau, parce que la reponse tient de sa couche (409 en HTTP,
    un message a l'ecran en ligne de commande).

    N'emet pas le commit : l'appelant le fait, ce qui lui laisse la possibilite
    de grouper plusieurs decisions dans une seule transaction — la decision
    d'instruction et l'ecriture d'audit y compris : soit les trois s'ecrivent,
    soit aucune.

    C'est ici, et non dans `routes/admin.py` ni `instruire.py`, que l'ecriture
    d'audit se fait : ce module est le seul point de passage des deux
    appelants, donc c'est le seul endroit ou l'ecrire une fois suffit a
    couvrir une approbation faite depuis l'ecran et une approbation faite au
    clavier.
    """
    if geste not in GESTES:
        raise ValueError(f"Geste inconnu : {geste!r}. Attendu : {', '.join(GESTES)}.")

    propre = (motif or "").strip()
    if not propre:
        raise MotifManquant("Une decision se motive : donnez un motif ecrit.")

    sens, statut = GESTES[geste]
    avant = partenaire.statut.value
    partenaire.statut = statut
    db.session.add(
        Decision(
            partenaire_id=partenaire.id,
            agent_id=agent_id,
            sens=sens,
            motif_ecrit=propre,
            horodatage=datetime.now(timezone.utc),
        )
    )
    record_event(
        action=ACTIONS_AUDIT[geste],
        actor_role="admin",
        actor_id=f"admin:{agent_id}" if agent_id is not None else None,
        target_type="partenaire",
        target_id=partenaire.slug,
        payload={"avant": avant, "apres": statut.value, "motif": propre},
        ip=ip,
    )
    return avant, statut.value
