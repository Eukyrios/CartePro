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

from app import create_app
from instruction import GESTES, MotifManquant
from instruction import instruire as appliquer
from models import Partenaire, db


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
    """Le meme geste que l'API d'administration, depuis le clavier.

    La logique est dans `instruction.py`, partagee avec `routes/admin.py` :
    une decision prise ici et une decision prise a l'ecran doivent laisser la
    meme trace, motif compris. Ce qui reste propre a la ligne de commande, ce
    sont les messages et le code de sortie.
    """
    partenaire = Partenaire.query.filter_by(slug=slug).first()
    if not partenaire:
        print(f"Aucun partenaire ne porte le slug « {slug} ».", file=sys.stderr)
        return 1

    try:
        avant, apres = appliquer(partenaire, geste, motif)
    except MotifManquant as manque:
        print(manque, file=sys.stderr)
        return 1

    db.session.commit()
    print(f"{partenaire.raison_sociale} : {avant} → {apres}")
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
