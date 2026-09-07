import csv
import io
from models import Transaction

def generate_transactions_csv():
    # On force le tri par horodatage pour que l'historique soit immuable
    transactions = Transaction.query.order_by(Transaction.horodatage).all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')

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
