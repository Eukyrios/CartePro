# Mécanisme d'intégrité du Journal d'Audit

## 1. Principe de Fonctionnement
Afin de garantir l'inaltérabilité des logs d'audit et de répondre aux exigences de sécurité, nous avons implémenté un système de **chaînage cryptographique**. 
Ce mécanisme s'inspire directement du fonctionnement de la blockchain.

Chaque action enregistrée dans la base de données produit une nouvelle entrée d'audit (un bloc) qui dépend de manière mathématique et déterministe de l'entrée précédente.

Le calcul de l'empreinte de chaque entrée repose sur la fonction de hachage sécurisée **HMAC-SHA256**, qui est alimentée par une clé secrète (`AUDIT_SECRET_KEY`) hébergée dans la configuration `.env` de l'environnement de production. 

Concrètement, l'empreinte (le champ `hash`) d'une ligne d'audit est calculée à partir des éléments suivants :
- Les données métier de l'action : `actor`, `action_type`, `timestamp`, `details`
- **L'empreinte de la ligne d'audit précédente** (`previous_hash`)

Ainsi, le moindre changement (falsification d'une donnée passée, suppression d'une ligne, ou tentative de modification de l'horodatage) brise irrévocablement la chaîne. Le `hash` de la ligne trafiquée devient invalide. Si un attaquant régénère ce hash, le `previous_hash` de la ligne suivante ne correspondra plus, et il devra modifier toutes les lignes ultérieures. Sans la clé HMAC (située hors de la base de données), l'attaquant ne peut tout simplement pas recalculer ces empreintes.

De plus, lors d'un export JSON de la période demandée, le système génère un **condensé global de la chaîne** (`chain_digest`). Ce dernier est obtenu en calculant un HMAC-SHA256 sur la concaténation de tous les hashs exportés. Il permet de certifier que l'ensemble des données exportées sont conformes et n'ont pas été tronquées lors de l'exportation.

## 2. Procédure de Vérification

L'export du journal d'audit (`/api/v1/admin/audit?export=true`) livre un fichier JSON structuré contenant les lignes du journal ainsi que le condensé global.

Le contrôle de l'intégrité s'effectue en totale isolation du système d'information (sans accès à la base de données), directement par le contrôleur ou l'auditeur sur sa propre machine, à l'aide du script fourni.

### Commande de vérification

Un script Python, situé dans `tools/verify_audit.py`, est mis à la disposition du contrôleur. Il ne dépend d'aucune bibliothèque externe (utilisation de la standard library Python).

```bash
# Rendre le script exécutable (si nécessaire)
chmod +x tools/verify_audit.py

# Exécuter le vérificateur avec le fichier JSON exporté et la clé secrète
python3 tools/verify_audit.py chemin/vers/audit_export.json VOTRE_CLE_SECRETE_HMAC
```

### Que fait le script de vérification ?
1. Il charge le JSON.
2. Pour chaque ligne exportée, il recalcule le `hash` avec la formule HMAC-SHA256 exacte et la clé fournie, puis le compare à la valeur de `hash` enregistrée.
3. Il s'assure que le `previous_hash` d'une ligne pointe bien sur le `hash` de la ligne précédente.
4. Enfin, il recalcule le `chain_digest` de tous les hashs combinés et le compare à celui stocké à la racine du JSON.

### Verdict
Si l'intégralité du processus est valide, le script affichera :
> `🎉 VERDICT: L'export du journal d'audit est 100% INTÈGRE.`
Dans le cas contraire, il s'arrêtera immédiatement en pointant l'index et l'identifiant (ID) précis de l'entrée corrompue.
