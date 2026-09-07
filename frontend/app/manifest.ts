import { MENTION_DEMONSTRATEUR } from "@/components/legal/mention";
import type { MetadataRoute } from "next";

/**
 * Le manifeste de l'application, servi à /manifest.webmanifest.
 *
 * Il n'existait pas. C'est le fichier qu'un navigateur lit pour proposer
 * « ajouter à l'écran d'accueil » : le nom, l'icône et la couleur qu'il en
 * retient survivent à la page, et c'est donc un endroit où la mention doit
 * figurer — une tuile posée sur un écran d'accueil ne montre aucun pied de
 * page.
 *
 * `theme_color` reprend le violet de la marque, celui de `backend/theme.json`.
 * Il est écrit en dur ici et non lu du serveur : le navigateur demande ce
 * fichier avant d'exécuter le moindre script, donc rien ne pourrait le
 * renseigner à temps.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `CartePro — ${MENTION_DEMONSTRATEUR}`,
    short_name: "CartePro",
    description: `Le crédit salarié à utiliser chez vos partenaires. ${MENTION_DEMONSTRATEUR}`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4a1b6b",
    lang: "fr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
  };
}
