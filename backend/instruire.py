"""Instruire le dossier d'un partenaire : l'accepter, le refuser, le suspendre.

Le geste qu'un agent de l'administration ferait depuis son espace — lequel
n'existe pas encore. En attendant, il se fait ici, et il se fait comme il doit :
une decision **ecrite**, avec un motif, qui laisse une trace dans la table
`decisions`. Rien n'est efface, les decisions precedentes restent : c'est
l'historique de l'instruction, et c'est ce que la tracabilite exige.

    python instruire.py                       # l'etat de tous les dossiers
    python instruire.py accepter <slug> "motif"
    python instruire.py refuser  <slug> "motif"
    python instruire.py suspendre <slug> "motif"

Le partenaire lit la decision dans son espace, et lui seul : le motif ne sort
jamais par le catalogue public.
"""
import sys
from datetime import datetime, timezone

from app import create_app
from models import Decision, DecisionSens, Partenaire, PartnerStatus, db

#: Le sens de la decision, et le statut qu'elle laisse au dossier.
GESTES = {
    "accepter": (DecisionSens.accepte, PartnerStatus.valide),
    "refuser": (DecisionSens.refuse, PartnerStatus.refuse),
    "suspendre": (DecisionSens.suspendu, PartnerStatus.suspendu),
}


def etat():
    """Tous les dossiers, avec leur historique de decisions."""
    largeur = max(len(p.slug) for p in Partenaire.query.all())
    for p in Partenaire.query.order_by(Partenaire.slug).all():
        trace = " → ".join(
            f"{d.sens.value} le {d.horodatage.date()}"
            for d in sorted(p.decisions, key=lambda d: d.horodatage)
        )
        print(f"  {p.slug:<{largeur}}  {p.statut.value:<11} {trace or '—'}")


def instruire(geste, slug, motif):
    sens, statut = GESTES[geste]
    partenaire = Partenaire.query.filter_by(slug=slug).first()
    if not partenaire:
        print(f"Aucun partenaire ne porte le slug « {slug} ».", file=sys.stderr)
        return 1
    if not motif.strip():
        print("Une decision se motive : donnez un motif ecrit.", file=sys.stderr)
        return 1

    avant = partenaire.statut.value
    partenaire.statut = statut
    db.session.add(Decision(
        partenaire_id=partenaire.id,
        # 1 : l'agent de demonstration. Le compte admin du seed.
        agent_id=1,
        sens=sens,
        motif_ecrit=motif.strip(),
        horodatage=datetime.now(timezone.utc),
    ))
    db.session.commit()
    print(f"{partenaire.raison_sociale} : {avant} → {statut.value}")
    print(f"  motif : {motif.strip()}")
    return 0


def main(argv):
    app = create_app()
    with app.app_context():
        if len(argv) <= 1:
            etat()
            return 0
        geste = argv[1]
        if geste not in GESTES or len(argv) < 4:
            print(__doc__, file=sys.stderr)
            return 2
        return instruire(geste, argv[2], " ".join(argv[3:]))


if __name__ == "__main__":
    sys.exit(main(sys.argv))
