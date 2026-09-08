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

**Limites assumées**, les trois, écrites ici plutôt que laissées à découvrir :

1. la suppression du **dernier** enregistrement de la chaîne n'est pas
   détectable — rien après lui ne peut signaler son absence. C'est une
   propriété de tout chaînage par empreintes (identique pour git ou une
   blockchain), pas un défaut de cette implémentation ;
2. le journal est **inondable par une route publique**. `POST /api/auth/login`
   écrit une ligne `connexion_echouee` à chaque échec, et la table est en ajout
   seul : l'application ne peut donc pas la purger. C'est un choix — perdre la
   trace des tentatives serait perdre exactement ce que le courriel demande —
   et la limitation de débit appartient au reverse-proxy, pas à l'applicatif ;
3. `ip` vaut `request.remote_addr`, donc **l'adresse d'entrée dans le
   dispositif** et non celle de l'agent dès qu'un proxy s'interpose.
   `X-Forwarded-For` n'est volontairement pas lu : l'en-tête est falsifiable
   par le client, et on écrirait une valeur forgée dans une table que personne
   ne peut corriger.

Deux notes de concurrence, du même esprit : sous Postgres, le verrou consultatif
qui sérialise les écritures de la chaîne est unique, donc un lot d'abondement le
tient pendant toute sa durée et les paiements concurrents attendent — acceptable
pour un démonstrateur, et borné. Sous SQLite, il n'y a aucun verrou : deux
écritures simultanées liraient le même dernier enregistrement, et la contrainte
`unique` sur `hash` transforme alors la course en erreur visible plutôt qu'en
chaîne silencieusement fourchue.

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

## 5. Couverture, et ce qui reste hors journal

Pas de ratio en titre : le courriel énumérait neuf opérations, l'application en
a depuis d'autres qu'il ne connaissait pas, et un décompte périme au commit
suivant. Voici la liste, et elle est tenue par des tests
(`test_audit_log.py`, `test_audit_couverture.py`).

**Tracées** — dix actes, écrits chacun dans la même transaction que l'écriture
métier qu'ils accompagnent :

1. connexion échouée ;
2. création de compte ;
3. modification de compte ;
4. instruction d'un dossier de partenaire — validation, refus, suspension,
   clôture — par `instruction.py`, point unique partagé par l'écran **et** la
   CLI `instruire.py` ;
5. transaction validée ;
6. transaction refusée, avec son motif (autorisation, conventionnement, solde) ;
7. action d'administration : export CSV, suppression ou suspension d'un
   partenaire ;
8. **abondement d'un solde** — la seule route du dispositif qui *crée* de
   l'argent. Une ligne par compte crédité, aucune au rejeu d'une saisie déjà
   enregistrée : le journal est la source où l'on compte les euros versés, et
   une ligne de rejeu ferait dire qu'une dotation l'a été deux fois ;
9. **annulation d'un paiement** par contre-écriture, la ligne visant le
   paiement d'origine ;
10. **mesure sur un compte salarié** — activation, suspension, clôture — par
    `mesures.py`, avec le solde résiduel consigné à la clôture : c'est le seul
    chiffre que rien ne permet de recalculer, puisque supprimer un compte
    emporte ses abondements.

Les points 8 à 10 n'étaient pas dans la liste de neuf : ils ont été écrits
après le courriel. Ils sont tracés parce qu'ils sont sensibles, et nommés
plutôt que fondus dans « action d'administration ».

**Hors journal, et pourquoi** :

- *changement de rôle* — rien à instrumenter : le rôle n'est pas une colonne
  mais une table d'appartenance (`admins`, `partenaires`, `salaries`), et
  aucune route ne déplace un compte de l'une à l'autre ;
- *changement de mot de passe* (`PUT /api/auth/password`) — sensible, non
  tracé. C'est le candidat le moins cher pour la prochaine passe ;
- *auto-suppression d'un compte* (`DELETE /api/auth/account`) — le trou le plus
  sérieux, parce que c'est le seul chemin qui supprime des **abondements** en
  cascade, donc qui rend de l'argent créé non reconstituable sans qu'une ligne
  le dise ;
- *demande de réexamen par un partenaire* — écrit une décision sans passer par
  `instruction.py`, donc hors du point d'écriture unique ;
- *écriture de l'identité visuelle* (`PUT /api/theme`) — réservée à
  l'administration, réécrit un fichier sur disque ;
- *coup de cœur d'un salarié* — une écriture, mais ni argent ni état de compte ;
- *les écritures hors requête HTTP* — `seed.py`, `migrer.py`,
  `migration_vignal.py` (qui crée des abondements de régularisation),
  `provision_postgres.py`, `migrate_sqlite_to_postgres.py` : ni acteur ni
  session, et c'est précisément ce que l'enregistrement de genèse du §1 tient
  pour non tracé.

## 6. Démonstration (jeudi 9h)

`backend/demo_audit_tamper.sh` automatise les 4 temps du courriel, sur une
copie jetable de `cartepro` (jamais la base présentée l'après-midi) : clone
via `pg_dump`, vérification, altération avec l'utilisateur privilégié (avec
tentative annexe échouée côté utilisateur applicatif), revérification. Exécuté
une fois pour une modification, une fois pour une suppression — validé en
conditions réelles le 8 septembre : les deux cas produisent avant/après
distincts et l'enregistrement en cause exact.

## 7. Tests

`test_audit_log.py` (13 tests) tourne sur SQLite, comme le reste de la suite —
SQLite n'a pas de REVOKE, donc pas de fixture à réparer de ce côté-là. Il
vérifie le chaînage lui-même (indépendant du moteur), la couverture par route,
et l'endpoint.

`test_audit_couverture.py` (12 tests) couvre les trois opérations écrites après
le journal — annulation, mesures de compte, abondements. Il vérifie surtout ce
que le journal **ne** doit pas contenir : rien au rejeu d'un abondement, rien
sur une opération refusée, et aucun champ nominatif dans une table impurgeable.
Il tient aussi l'égalité entre les gestes et leurs actions d'audit, parce que
l'oubli s'est produit : le geste « clôturer » d'un dossier de partenaire a été
ajouté après l'écriture du journal, et clore un établissement levait une erreur.

Suite complète : **105 tests**. La preuve du REVOKE et de la détection
d'altération est apportée séparément, sur la vraie base Postgres, par
`demo_audit_tamper.sh` — c'est elle qui compte devant le contrôleur, pas la
suite pytest.
