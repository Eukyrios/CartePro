import csv
import io
from mention import MENTION_DEMONSTRATEUR
from models import Transaction

def generate_transactions_csv():
    # On force le tri par horodatage pour que l'historique soit immuable
    transactions = Transaction.query.order_by(Transaction.horodatage).all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')

    # La mention de demonstrateur, en tete du fichier.
    #
    # Un export quitte l'application : le fichier se reouvre dans un tableur,
    # se transfere, s'imprime, et plus rien autour de lui ne dit d'ou il sort.
    # C'est donc un des endroits ou la mention doit figurer.
    #
    # En ligne prefixee de « # » et non en colonne : la convention est comprise
    # des tableurs comme des bibliotheques CSV (pandas : `comment='#'`), et une
    # colonne repetant la meme phrase a chaque ligne serait illisible. Elle
    # precede l'en-tete, donc un lecteur qui ignore les commentaires retrouve
    # exactement les six colonnes demandees.
    output.write(f'# {MENTION_DEMONSTRATEUR}\n')

    # En-tete strict demande par le cabinet
    writer.writerow(['id', 'date_iso8601', 'employee_id', 'partner_id', 'amount_cents', 'status'])

    for t in transactions:
        # Conversion robuste en centimes pour eviter les erreurs de virgule flottante
        amount_cents = int(round(t.montant * 100))
        writer.writerow([
            t.id,
            t.horodatage.isoformat(),
            t.salarie_id,
            t.partenaire_id,
            amount_cents,
            # Le statut est une enumeration : on exporte sa valeur, pas son repr.
            t.statut.value if t.statut else '',
        ])

    return output.getvalue()
