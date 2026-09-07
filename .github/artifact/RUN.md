# CartePro — prototype

Bundle autonome produit par la CI. Rien à installer : les dépendances du
serveur sont déjà dans `node_modules/`.

## Démarrer

```sh
node server.js
```

Puis ouvrir <http://localhost:3000>.

Node.js 20 ou plus est le seul prérequis. Pour servir sur un autre port ou
depuis une autre machine du réseau :

```sh
PORT=8080 HOSTNAME=0.0.0.0 node server.js
```

## Comptes de démonstration

Déjà remplis, un par type d'utilisateur. Le même mot de passe pour les deux :

| Type       | Identifiant                | Mot de passe |
| ---------- | -------------------------- | ------------ |
| Employé    | `employe@cartepro.fr`    | `Demo1234!`  |
| Partenaire | `partenaire@cartepro.fr` | `Demo1234!`  |

Les identifiants sont aussi rappelés dans la fenêtre de connexion, avec un
bouton « Remplir ces identifiants ».

Ouvrir **Connexion** dans la barre du haut, choisir l'onglet **Employés** ou
**Partenaires**, se connecter, puis **Paramètres** dans le menu du compte pour
voir le profil rempli — et, pour l'employé, la personnalisation de la carte.

## Ce que contient le bundle

| Chemin          | Rôle                                            |
| --------------- | ----------------------------------------------- |
| `server.js`     | Le serveur Next.js autonome                     |
| `.next/`        | L'application compilée, dont `.next/static`     |
| `public/`       | Les fichiers servis tels quels                  |
| `node_modules/` | Uniquement les dépendances tracées du serveur   |

## Limites du prototype

L'authentification est simulée : il n'y a pas encore de backend. Les comptes de
démonstration ci-dessus se connectent à des profils préremplis, et toute autre
adresse est acceptée avec un profil vide. La session est gardée dans le
`localStorage` du navigateur, donc elle survit à un rechargement mais reste
locale à l'appareil.
