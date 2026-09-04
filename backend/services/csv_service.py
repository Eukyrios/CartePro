import csv
import io
from models import Transaction

def generate_transactions_csv():
    # On force le tri par date pour que l'historique soit immuable
    transactions = Transaction.query.order_by(Transaction.date).all()
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # En-tête strict demandé par le cabinet
    writer.writerow(['id', 'date_iso8601', 'employee_id', 'partner_id', 'amount_cents', 'status'])
    
    for t in transactions:
        # Conversion robuste en centimes pour éviter les erreurs de virgule flottante
        amount_cents = int(round(t.montant * 100))
        writer.writerow([
            t.id,
            t.date.isoformat(),
            t.salarie_id,
            t.partenaire_id,
            amount_cents,
            t.statut
        ])
        
    return output.getvalue()