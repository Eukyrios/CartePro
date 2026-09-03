from flask import Blueprint, jsonify, request
import jwt

transactions_bp = Blueprint('transactions', __name__)
SECRET_KEY = "cle_secrete_partagee_avec_le_mate" # Doit correspondre à la clé utilisée pour la génération

@transactions_bp.route('/valider', methods=['POST'])
def valider_transaction():
    data = request.json
    
    # Données envoyées par l'espace partenaire lors du scan du QR code
    token_qr = data.get('qr_token')
    montant = data.get('montant')
    partenaire_id = data.get('partenaire_id') # Idéalement extrait du token de session du partenaire par ton mate

    if not token_qr or not montant:
        return jsonify({"status": "error", "message": "Le token du QR code et le montant sont requis."}), 400

    try:
        decoded_payload = jwt.decode(token_qr, SECRET_KEY, algorithms=["HS256"])
        user_id = decoded_payload.get("user_id")

        # 2. TODO (Pour ton mate) : Vérification du solde
        # -> Faire une requête SQL (SELECT) pour s'assurer que le solde de 'user_id' est >= 'montant'.

        # 3. TODO (Pour ton mate) : Écriture irréversible en base de données[cite: 2]
        # -> Faire un UPDATE pour déduire le solde du salarié
        # -> Faire un UPDATE pour créditer le partenaire
        # -> Faire un INSERT dans la table Historique/Transactions 
        # (Tout cela doit être exécuté dans un bloc "Transaction SQL" pour garantir l'intégrité).

        return jsonify({
            "status": "success",
            "message": f"Transaction de {montant}€ validée avec succès.",
            "details": {
                "user_id": user_id,
                "partenaire_id": partenaire_id,
                "montant_paye": montant
            }
        }), 201

    except jwt.ExpiredSignatureError:
        # Gère le cas où le salarié est resté plus de 30 minutes avant de passer en caisse[cite: 2]
        return jsonify({
            "status": "error", 
            "message": "Le QR code a expiré. Le salarié doit en générer un nouveau."
        }), 400
        
    except jwt.InvalidTokenError:
        # Gère les tentatives de fraude ou les QR codes mal formés
        return jsonify({
            "status": "error", 
            "message": "QR code invalide ou corrompu."
        }), 400
    class TodoSimple(Resource):
        def get(self, todo_id):
            return {todo_id: todos[todo_id]}

        def put(self, todo_id):
            todos[todo_id] = request.form['data']
            return {todo_id: todos[todo_id]}

    api.add_resource(TodoSimple, '/<string:todo_id>')

    if __name__ == '__main__':
        app.run(debug=True)
