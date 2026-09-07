"""
Génère un diagramme SVG des modèles SQLAlchemy du projet.

Usage :
    python visualize_models.py

Prérequis :
    - pip install sqlalchemy-data-model-visualizer
    - Graphviz installé sur le système
"""

from sqlalchemy_data_model_visualizer import (
    generate_data_model_diagram,
    add_web_font_and_interactivity,
)

# Import des modèles depuis ton fichier models.py
from models import (
    Abondement,
    Admin,
    Categorie,
    CoupDeCoeur,
    Decision,
    Employeur,
    Partenaire,
    Salaries,
    Transaction,
)


if __name__ == "__main__":
    # Liste des modèles à visualiser
    models = [
        Employeur,
        Categorie,
        Salaries,
        Partenaire,
        Admin,
        Transaction,
        Abondement,
        CoupDeCoeur,
        Decision,
    ]

    output_file_name = "data_model_diagram"

    # Génère le SVG de base
    generate_data_model_diagram(
        models,
        output_file_name,
        add_labels=True,  # mets False pour un schéma plus épuré sans libellés sur les flèches
    )

    # (Optionnel) ajoute une version interactive avec polices web
    add_web_font_and_interactivity(
        f"{output_file_name}.svg",
        f"{output_file_name}_interactive.svg",
    )

    print(f"Diagramme généré : {output_file_name}.svg")
    print(f"Version interactive : {output_file_name}_interactive.svg")