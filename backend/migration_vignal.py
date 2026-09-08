from app import create_app
from models import db, Salaries, Partenaire, PartnerStatus, Abondement, Admin
from datetime import datetime, timezone

def run_migration():
    app = create_app()
    with app.app_context():
        print("--- DÉBUT DE LA MIGRATION ---")
        
        # 1. Anonymisation et archivage des partenaires hors V1.0
        enseignes_autorisees = [
            "comptoir-du-midi", "epicerie-sainte-claire",
            "librairie-vasseur", "pharmacie-du-parc",
            "transports-regionaux-unifies", "sport-loisirs-aubagne"
        ]
        anciens = Partenaire.query.filter(~Partenaire.slug.in_(enseignes_autorisees)).all()
        
        for p in anciens:
            # Idempotence : on ne touche qu'aux partenaires non archivés
            if p.raison_sociale != "Partenaire désinscrit (Archivé)":
                p.raison_sociale = "Partenaire désinscrit (Archivé)"
                p.statut = PartnerStatus.suspendu
                p.donnees_reelles = False
                p.site_web = ""
                p.presentation_titre = ""
                p.presentation_texte = "Ce partenaire ne fait plus partie du dispositif V1.0."
                p.image_partenaire = ""

        # 2. Régularisation comptable des soldes négatifs
        salaries = Salaries.query.all()
        admin = Admin.query.first()
        admin_id = admin.id if admin else 1
        cout_total = 0.0
        comptes_regules = 0
        
        for s in salaries:
            solde_courant = s.solde
            if solde_courant < 0:
                montant_regu = abs(solde_courant)
                cout_total += montant_regu
                comptes_regules += 1
                
                regu = Abondement(
                    employeur_id=s.employeur_id,
                    salarie_id=s.id,
                    montant=montant_regu,
                    horodatage=datetime.now(timezone.utc),
                    agent_admin_id=admin_id
                )
                db.session.add(regu)
        
        db.session.commit()
        
        print(f"✅ Partenaires : {len(anciens)} enseignes anonymisées et suspendues.")
        print(f"✅ Soldes négatifs : {comptes_regules} comptes régularisés à 0,00 €.")
        print(f"✅ Coût de l'opération pour le Ministère : {cout_total:.2f} €.")
        print("--- MIGRATION TERMINÉE ---")

if __name__ == '__main__':
    run_migration()