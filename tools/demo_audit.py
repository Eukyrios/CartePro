#!/usr/bin/env python3
import urllib.request
import urllib.error
import json
import subprocess
import time
import os

BASE_URL = "http://localhost:5000/api"

print("🚀 Début de la démonstration du système d'audit...")

# 1. Login
login_data = json.dumps({"email": "admin@administration.example", "password": "CartePro2026"}).encode('utf-8')
req = urllib.request.Request(f"{BASE_URL}/auth/login", data=login_data, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req)
    token = json.loads(response.read())['access_token']
    print("✅ Connexion réussie en tant qu'administrateur.")
except urllib.error.URLError as e:
    print(f"❌ Impossible de se connecter. Le backend tourne-t-il sur le port 5000 ? (Erreur: {e})")
    print("👉 Astuce: Lancez 'make dev' dans un autre terminal avant d'exécuter ce script.")
    exit(1)

auth_header = {'Authorization': f'Bearer {token}'}

# 2. Fetch pending partner
req = urllib.request.Request(f"{BASE_URL}/admin/partenaires/demandes", headers=auth_header)
response = urllib.request.urlopen(req)
demandes = json.loads(response.read()).get('demandes', [])

if not demandes:
    print("⚠️ Aucun partenaire en attente. Veuillez d'abord relancer 'make seed' pour réinitialiser la base.")
    exit(1)

slug = demandes[0]['id']
nom = demandes[0]['nom']
print(f"👉 Instructon du dossier de '{nom}' (slug: {slug})...")

# 3. Reject partner to create an audit log
reject_data = json.dumps({"motif": "Test d'audit automatisé"}).encode('utf-8')
req = urllib.request.Request(f"{BASE_URL}/admin/partenaires/{slug}/refuser", data=reject_data, headers={'Content-Type': 'application/json', **auth_header}, method='POST')
try:
    urllib.request.urlopen(req)
    print(f"✅ Dossier '{nom}' refusé. Une entrée d'audit a été créée !")
except urllib.error.HTTPError as e:
    if e.code == 409:
        print("⚠️ Le dossier est déjà instruit, mais ce n'est pas grave pour la suite.")
    else:
        print(f"❌ Erreur lors du refus: {e}")
        exit(1)

# 4. Export audit logs
print("📦 Téléchargement de l'export d'audit...")
req = urllib.request.Request(f"{BASE_URL}/v1/admin/audit?export=true", headers=auth_header)
response = urllib.request.urlopen(req)
export_json = response.read().decode('utf-8')

with open("audit_export_test.json", "w") as f:
    f.write(export_json)

print("✅ Fichier 'audit_export_test.json' sauvegardé avec succès.")

# 5. Run verification script
print("\n🔍 Lancement du script de vérification :")
secret = "change-me-en-dev" # La valeur par défaut dans app.py
subprocess.run(["python3", "tools/verify_audit.py", "audit_export_test.json", secret])

print("\n🧹 Nettoyage du fichier de test...")
os.remove("audit_export_test.json")
print("🏁 Test terminé !")
