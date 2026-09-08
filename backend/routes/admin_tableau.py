"""Le tableau de bord national : ce que le dispositif a produit, en chiffres.

Une seule route, en lecture seule, qui rend tout ce que l'écran affiche. Un
tableau de bord qui ferait six appels afficherait six états de chargement et
pourrait montrer six instants différents du même dispositif — ici les chiffres
sont pris dans la même passe, donc ils s'additionnent.

Trois familles, celles que l'écran porte :

1. **le volume** — combien de paiements, pour quel montant, et comment cela se
   répartit dans le temps ;
2. **les partenaires actifs** — un partenaire conventionné qui n'a jamais rien
   encaissé n'est pas un partenaire actif, et le dispositif n'a aucune raison de
   compter les deux ensemble ;
3. **la répartition géographique** — par département, agrégée depuis le code
   postal des partenaires. Pas de carte : le réseau n'a pas de coordonnées, il a
   une adresse, une ville et un code postal, et l'application le dit depuis le
   début (`components/data/partners.ts`). Un tableau ordonné répond mieux à
   « où encaisse-t-on le plus » qu'une carte sans échelle.

**La période n'est pas « les trente derniers jours ».** Elle est bornée par les
données elles-mêmes — première et dernière écriture — et rendue avec les
chiffres. Un jeu de démonstration daté de juin, lu en septembre, donnerait zéro
partout avec une fenêtre glissante, et un tableau de bord vide ne dit pas qu'il
est vide : il dit que le dispositif ne sert à rien.
"""

from collections import defaultdict

from flask import Blueprint, jsonify

from decorators import admin_required
from models import (
    CompteStatut,
    Partenaire,
    PartnerStatus,
    Salaries,
    Transaction,
    TransactionStatut,
    db,
)

admin_tableau_bp = Blueprint('admin_tableau', __name__)


def departement(code_postal):
    """Le département que porte un code postal français.

    Deux chiffres, sauf outre-mer où il en faut trois : 97400 est La Réunion et
    non « le département 97 », qui n'existe pas. La Corse (2A/2B) partage le
    code postal 20 — les deux départements ne s'y distinguent pas, et on ne
    prétend donc pas les séparer.
    """
    code = (code_postal or "").strip()
    if len(code) < 2 or not code[:2].isdigit():
        return ""
    return code[:3] if code.startswith(("97", "98")) else code[:2]


#: Le nom des départements où le réseau est implanté.
#:
#: Ce qui est utile à l'écran, pas la nomenclature entière : un code seul ne se
#: lit pas, et charger les cent et quelques noms pour en afficher dix serait du
#: référentiel qu'il faudrait ensuite tenir à jour. Un code absent d'ici
#: s'affiche tel quel, ce qui reste juste.
NOMS_DEPARTEMENTS = {
    "06": "Alpes-Maritimes", "13": "Bouches-du-Rhône", "15": "Cantal",
    "19": "Corrèze", "31": "Haute-Garonne", "38": "Isère", "44": "Loire-Atlantique",
    "46": "Lot", "56": "Morbihan", "59": "Nord", "63": "Puy-de-Dôme",
    "69": "Rhône", "75": "Paris", "76": "Seine-Maritime", "78": "Yvelines",
    "80": "Somme", "83": "Var", "88": "Vosges", "94": "Val-de-Marne",
}


def _mois(horodatage):
    """La clé du mois, « AAAA-MM ».

    Groupée en Python et non en SQL : `strftime` sous SQLite et `DATE_FORMAT`
    sous MySQL ne s'écrivent pas pareil, et ce tableau doit rendre les mêmes
    chiffres sur les deux.
    """
    return f"{horodatage.year:04d}-{horodatage.month:02d}"


@admin_tableau_bp.route('/tableau-de-bord', methods=['GET'])
@admin_required
def tableau_de_bord():
    """Tout ce que l'écran affiche, pris dans la même passe."""
    paiements = (
        Transaction.query.filter_by(statut=TransactionStatut.validee)
        .order_by(Transaction.horodatage.asc())
        .all()
    )
    partenaires = Partenaire.query.all()
    salaries = Salaries.query.all()

    # --- 1. Le volume ------------------------------------------------------
    total_cents = sum(round(t.montant * 100) for t in paiements)
    par_mois = defaultdict(lambda: {"nombre": 0, "montantCents": 0})
    for t in paiements:
        seau = par_mois[_mois(t.horodatage)]
        seau["nombre"] += 1
        seau["montantCents"] += round(t.montant * 100)

    serie = [
        {"mois": mois, **valeurs} for mois, valeurs in sorted(par_mois.items())
    ]

    # --- 2. Les partenaires ------------------------------------------------
    encaisse = defaultdict(lambda: {"nombre": 0, "montantCents": 0})
    for t in paiements:
        if t.partenaire_id:
            seau = encaisse[t.partenaire_id]
            seau["nombre"] += 1
            seau["montantCents"] += round(t.montant * 100)

    conventionnes = [p for p in partenaires if p.statut == PartnerStatus.valide]
    actifs = [p for p in conventionnes if encaisse.get(p.id)]

    par_statut = {statut.value: 0 for statut in PartnerStatus}
    for p in partenaires:
        par_statut[p.statut.value] += 1

    classement = sorted(
        (
            {
                "id": p.slug,
                "nom": p.raison_sociale,
                "ville": p.ville,
                "categorie": p.categorie.nom if p.categorie else "",
                **encaisse[p.id],
            }
            for p in partenaires
            if p.id in encaisse
        ),
        key=lambda ligne: ligne["montantCents"],
        reverse=True,
    )

    # --- 3. La répartition géographique ------------------------------------
    #
    # Deux mesures par département, et non une : le nombre d'établissements dit
    # où le réseau est implanté, le montant encaissé dit où il sert. Ce ne sont
    # pas les mêmes cartes, et les afficher l'une pour l'autre serait faux.
    geo = defaultdict(
        lambda: {"partenaires": 0, "nombre": 0, "montantCents": 0, "villes": set()}
    )
    for p in partenaires:
        code = departement(p.code_postal)
        if not code:
            continue
        seau = geo[code]
        seau["partenaires"] += 1
        if p.ville:
            seau["villes"].add(p.ville)
        chiffres = encaisse.get(p.id)
        if chiffres:
            seau["nombre"] += chiffres["nombre"]
            seau["montantCents"] += chiffres["montantCents"]

    geographie = sorted(
        (
            {
                "code": code,
                "nom": NOMS_DEPARTEMENTS.get(code, f"Département {code}"),
                "partenaires": seau["partenaires"],
                "nombre": seau["nombre"],
                "montantCents": seau["montantCents"],
                "villes": sorted(seau["villes"]),
            }
            for code, seau in geo.items()
        ),
        key=lambda ligne: (-ligne["montantCents"], ligne["code"]),
    )

    # --- 4. Les comptes ----------------------------------------------------
    comptes_par_statut = {statut.value: 0 for statut in CompteStatut}
    for s in salaries:
        comptes_par_statut[s.statut.value] += 1

    return jsonify({
        "periode": {
            "debut": paiements[0].horodatage.isoformat() if paiements else None,
            "fin": paiements[-1].horodatage.isoformat() if paiements else None,
        },
        "volume": {
            "nombre": len(paiements),
            "montantCents": total_cents,
            "moyenneCents": round(total_cents / len(paiements)) if paiements else 0,
            "serie": serie,
        },
        "partenaires": {
            "total": len(partenaires),
            "conventionnes": len(conventionnes),
            "actifs": len(actifs),
            "parStatut": par_statut,
            "classement": classement[:10],
        },
        "comptes": {
            "total": len(salaries),
            "parStatut": comptes_par_statut,
        },
        "geographie": geographie,
    }), 200
