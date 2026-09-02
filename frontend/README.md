# Ticket Tout — frontend

Plateforme de billetterie pour les partenaires et les employés. Application
[Next.js](https://nextjs.org) (App Router) avec [Flowbite
React](https://flowbite-react.com) et Tailwind CSS v4.

## Démarrer

```bash
npm install
npm run dev
```

L'application est servie sur http://localhost:3000.

Autres scripts : `npm run build`, `npm run lint`, `npm run format`.

## Structure

```
app/                        # routes (App Router), nommées en français
  layout.tsx                # barre du haut + barre du bas, sur toutes les pages
  page.tsx                  # « / » — accueil, présente le projet   [à faire]
  parametres/               # « /parametres » — profil et suppression du compte
  tableau-de-bord/          # « /tableau-de-bord »                  [à faire]
  globals.css               # tokens de couleurs (clair / sombre)

components/
  layout/                   # chrome commun à toutes les pages
    TopBar.tsx              # barre du haut
    Footer.tsx              # barre du bas — contacts, mentions légales [à faire]
    UserMenu.tsx            # menu de l'avatar
  account/
    AccountProvider.tsx     # compte connecté, partagé par toute l'application
  auth/                     # connexion et inscription (fenêtre modale)
  profile/                  # contenu de la page « /parametres »
  ui/                        # champs de formulaire réutilisables
```

## À savoir

L'authentification n'est pas encore branchée sur un backend : le compte
connecté vit dans `AccountProvider`, qui le conserve dans `localStorage` en
attendant une vraie session. Aucun mot de passe n'est stocké.
