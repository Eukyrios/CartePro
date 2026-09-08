#!/usr/bin/env python3
import sys
import json
import hmac
import hashlib
import os

def calculate_hash(key, actor, action_type, timestamp_str, details, previous_hash):
    details_str = json.dumps(details, sort_keys=True)
    message = f"{actor}|{action_type}|{timestamp_str}|{details_str}|{previous_hash}".encode('utf-8')
    return hmac.new(key, message, hashlib.sha256).hexdigest()

def verify(export_path, secret_key):
    try:
        with open(export_path, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Erreur lors de la lecture du fichier : {e}")
        return False

    logs = data.get('logs', [])
    chain_digest_expected = data.get('chain_digest')

    if not logs:
        print("⚠️ Le journal est vide.")
        return True

    key = secret_key.encode('utf-8')
    hashes = []

    print("Vérification de chaque entrée du journal...")
    for i, log in enumerate(logs):
        actor = log['actor']
        action_type = log['action_type']
        timestamp_str = log['timestamp']
        details = log['details']
        prev_hash = log['previous_hash']
        log_hash = log['hash']

        calculated = calculate_hash(key, actor, action_type, timestamp_str, details, prev_hash)
        if calculated != log_hash:
            print(f"❌ Corruption détectée à l'entrée {log['id']} (Index {i}) :")
            print(f"   Hash calculé : {calculated}")
            print(f"   Hash stocké  : {log_hash}")
            return False

        if i > 0:
            if prev_hash != logs[i-1]['hash']:
                print(f"❌ Rupture de la chaîne entre l'entrée {logs[i-1]['id']} et {log['id']} !")
                print(f"   previous_hash attendu : {logs[i-1]['hash']}")
                print(f"   previous_hash stocké  : {prev_hash}")
                return False

        hashes.append(log_hash)

    print("✅ Intégrité individuelle des entrées et chaînage validés.")

    hashes_concat = "".join(hashes).encode('utf-8')
    calculated_digest = hmac.new(key, hashes_concat, hashlib.sha256).hexdigest()
    
    if calculated_digest != chain_digest_expected:
        print(f"❌ Le condensé global de la chaîne est invalide !")
        print(f"   Condensé calculé : {calculated_digest}")
        print(f"   Condensé stocké  : {chain_digest_expected}")
        return False

    print("✅ Le condensé global correspond.")
    print("\n🎉 VERDICT: L'export du journal d'audit est 100% INTÈGRE.")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python verify_audit.py <chemin_vers_json> <cle_secrete_hmac>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    secret = sys.argv[2]
    
    success = verify(file_path, secret)
    sys.exit(0 if success else 1)
