# Journal d'audit — note technique (1 page)

En réponse au courriel de Thomas Vignal du 8 septembre 2026 (Cour des comptes,
traçabilité des dispositifs numériques). Échéance : jeudi 09h00.

## 1. La base existait avant le journal — décision et non reconstitution

CartePro tourne depuis une semaine avant l'écriture de ce journal : partenaires
validés, abondements, migration V1.0 du 8 septembre. Rien de cela n'est tracé
ici, et rien n'est reconstitué a posteriori — antidater des écritures serait
exactement la fraude que le dispositif est censé rendre visible. À la place,
`migrate_sqlite_to_postgres.py` écrit un **enregistrement de genèse**
(`action="audit_genesis"`) qui dit explicitement ce qu'il est : le point de
départ du journal, pas un résumé de ce qui précède. C'est le premier
enregistrement de la chaîne (`prev_hash` = 64 zéros).

## 2. SQLite ne pouvait pas porter cette exigence

Le REVOKE demandé n'a de sens que sur un moteur qui a une notion d'utilisateur
et de privilège — SQLite n'en a pas (un fichier, pas un serveur). Le
dispositif migre donc vers **Postgres** (`docker-compose.yml`). Point technique
qui a coûté du temps de debug : un `SELECT ... FOR UPDATE`, utilisé au départ
pour sérialiser les écritures concurrentes de la chaîne, exige lui-même le
privilège UPDATE — exactement celui qu'on révoque. Remplacé par un verrou
consultatif (`pg_advisory_xact_lock`, `services/audit_service.py`), qui ne
verrouille aucune ligne et ne demande aucun droit particulier.

## 3. Le mécanisme

**Schéma** (`models.AuditLog`) : `id`, `occurred_at` (UTC, ms), `actor_id`,
`actor_role`, `action`, `target_type`, `target_id`, `payload` (JSON), `ip`,
plus `prev_hash`/`hash` pour le chaînage.

**Ajout seul, en deux couches.** `provision_postgres.py` crée les tables avec
le superutilisateur (leur propriétaire), puis accorde à l'utilisateur
applicatif `cartepro_app` un accès complet aux tables métier mais
**SELECT + INSERT seuls sur `audit_log`, avec un `REVOKE UPDATE, DELETE`
explicite**. Sous Postgres, le propriétaire d'une table garde toujours tous
les droits dessus — d'où la séparation superutilisateur/`cartepro_app` : sans
elle, le REVOKE ne restreindrait rien. Deux écouteurs SQLAlchemy
(`models.py`) bloquent aussi l'UPDATE/DELETE côté ORM, en seconde ligne — la
garantie réelle est le GRANT en base, pas ce code.

**Chaînage** (`audit_chain.py`, partagé par l'écriture et la vérification) :
chaque ligne porte le SHA-256 de la précédente, calculé sur
`prev_hash | occurred_at | actor_id | actor_role | action | target_type |
target_id | payload (JSON trié) | ip`. `id` n'entre pas dans le calcul —
c'est un détail de stockage attribué après coup ; la continuité des `id` est
vérifiée séparément et distingue une **suppression** (un `id` manque dans la
séquence) d'une **altération** (l'empreinte recalculée d'une ligne ne
correspond plus à celle stockée).

**Limite assumée** : la suppression du **dernier** enregistrement de la chaîne
n'est pas détectable — rien après lui ne peut signaler son absence. C'est une
propriété de tout chaînage par empreintes (identique pour git ou une
blockchain), pas un défaut de cette implémentation.

## 4. Endpoint et export

`GET /api/v1/admin/audit` (filtrable `depuis`/`jusque`/`acteur`/`action`,
paginé) et `GET /api/v1/admin/audit/export` (période demandée), tous deux
réservés au rôle admin (`routes/audit.py`).

L'export porte une **signature HMAC-SHA256** (clé dans `.env`,
`AUDIT_EXPORT_HMAC_KEY`) sur sa sérialisation JSON canonique. Distinction
importante : la signature protège le *fichier exporté* entre sa génération et
sa lecture — elle ne prouve rien sur l'état de la base au moment de l'export,
puisqu'un export honnêtement régénéré depuis une base altérée porte une
signature parfaitement valide. C'est le **chaînage interne**, recalculé par
`verify_audit.py`, qui détecte une altération de la base elle-même — et lui
seul.

**Vérification, sans connexion à la base** :
```
python verify_audit.py export.json --key <clé>
```
Vérifie la signature, recalcule la chaîne, désigne l'enregistrement exact en
cas de rupture. Code de sortie : 0 conforme, 1 altéré, 2 erreur.

## 5. Couverture : 7 des 9 opérations

Tracées et vérifiables : création de compte, modification de compte,
validation/refus/suspension d'un partenaire (`instruction.py`, point unique
partagé par l'écran **et** la CLI `instruire.py`), transaction validée,
transaction refusée (autorisation, conventionnement, solde), connexion
échouée, action d'administration (export CSV, suppression/suspension d'un
partenaire).

**Manquantes, et pourquoi** : *changement de rôle* — aucune route ne le fait
exister dans le code actuel, rien à instrumenter. *Abondement d'un solde* —
seul un script one-shot (`migration_vignal.py`) en crée ; il n'y a pas de
route de création à ce jour (voir `frontend/components/admin/
EmployerTopUpSection.tsx`, non branché au backend). Les deux sont documentées
ici plutôt qu'inventées.

## 6. Démonstration (jeudi 9h)

`backend/demo_audit_tamper.sh` automatise les 4 temps du courriel, sur une
copie jetable de `cartepro` (jamais la base présentée l'après-midi) : clone
via `pg_dump`, vérification, altération avec l'utilisateur privilégié (avec
tentative annexe échouée côté utilisateur applicatif), revérification. Exécuté
une fois pour une modification, une fois pour une suppression — validé en
conditions réelles le 8 septembre : les deux cas produisent avant/après
distincts et l'enregistrement en cause exact.

## 7. Tests

`test_audit_log.py` tourne sur SQLite, comme le reste de la suite — SQLite
n'a pas de REVOKE, donc pas de fixture à réparer de ce côté-là. Il vérifie le
chaînage lui-même (indépendant du moteur), la couverture par route, et
l'endpoint. La preuve du REVOKE et de la détection d'altération est apportée
séparément, sur la vraie base Postgres, par `demo_audit_tamper.sh` — c'est
elle qui compte devant le contrôleur, pas la suite pytest.
