# Où va quoi

Un dossier par **rôle**, pas par écran. La règle : dès qu'une chose sert à deux
endroits, elle remonte — c'est ce qui manquait quand `home/` contenait la carte
bancaire, les marques et le rail de sections, tous utilisés bien au-delà de la
page d'accueil.

| Dossier           | Ce qu'il contient                                                                                                                                                     | Qui peut en dépendre    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `ui/`             | La bibliothèque d'interface : titres, coquilles, boutons, notes, champs, modale, tuiles, QR. Aucune connaissance du métier.                                           | tout le monde           |
| `brand/`          | L'identité : le nom, le logotype, la flèche. Aucun pictogramme — voir public/logo/README.                                                                             | tout le monde           |
| `card/`           | La carte de paiement et son panneau. Trois écrans l'affichent (accueil, espace, paramètres).                                                                          | tout le monde           |
| `forms/`          | Ce qu'un compte déclare, et ce qui le rend valide : les jeux de champs partagés entre l'inscription et les paramètres, plus `useDraft`.                               | auth, profile           |
| `data/`           | Les règles et les accès aux données du réseau : recherche, catégories, fiche d'un partenaire, formatage des montants. **Aucune donnée en dur** — tout vient de l'API. | tout le monde           |
| `account/`        | Le compte connecté : contexte, comptes de démonstration, solde, conventionnement du partenaire, et l'aiguillage vers l'espace qui lui correspond.                     | tout le monde           |
| `layout/`         | Le châssis autour d'une page : barre haute, pied de page, menu utilisateur, rail de sections.                                                                         | les pages               |
| `theme/`          | L'identité visuelle servie par le back : la feuille de style et le contexte de marque.                                                                                | tout le monde           |
| `legal/`          | Le texte des CGU, transcrit de `docs/03_Projet_CGU_Ticket_Tout.docx`. Aucun JSX. Le seul contenu en dur du front, et pour cause : c'est un document, pas une donnée.  | `app/conditions`        |
| `administration/` | L'éditorial de l'administrateur : le coup de cœur, montré au visiteur comme au salarié.                                                                               | `landing/`, `espace/`   |
| `landing/`        | Le site vitrine : les sections de l'accueil et le deck des trois gestes.                                                                                              | `app/page.tsx`          |
| `espace/`         | L'espace salarié : solde, réseau, historique, paiement.                                                                                                               | `app/espace/**`         |
| `transactions/`   | L'historique des encaissements : filtres, total, tableau, pagination. Deux écrans s'en servent — les recettes d'un partenaire, celles de l'administration.            | `partenaire/`, `admin/` |
| `partenaire/`     | L'espace partenaire : encaissement, recettes, et sa couche d'accès aux routes. Il réutilise les écrans de `espace/` — carte, réseau — plutôt que de les redessiner.   | `app/espace/**`         |
| `profile/`        | `/parametres` : les panneaux et leurs formulaires.                                                                                                                    | `app/parametres`        |
| `auth/`           | Le dialogue de connexion et d'inscription.                                                                                                                            | `layout/TopBar`         |
| `atelier/`        | La vitrine de `ui/`, servie par `/atelier`.                                                                                                                           | `app/atelier`           |

Hors de `components/` : `hooks/` pour les comportements réutilisables sans
interface (filtres, flèches, défilement), `lib/` pour le client d'API et le
pliage de texte. Un hook qui n'a qu'un client vit à côté de lui
(`espace/useQrToken`, `account/useBalance`, `administration/useAdminPick`).

## Deux règles qui tiennent l'ensemble

1. **`ui/` ne connaît pas le métier.** Un composant de `ui/` ne lit ni le compte,
   ni le registre, ni l'API. `PartnerTile` et `PartnerPhoto` reçoivent un
   partenaire en prop et n'en cherchent aucun.
2. **Tout ce qui est exporté par `components/ui/index.ts` doit avoir un spécimen
   dans `/atelier`.** La page compare les deux listes et affiche en rouge ce qui
   manque. Ajouter un composant à la bibliothèque, c'est donc le documenter.
