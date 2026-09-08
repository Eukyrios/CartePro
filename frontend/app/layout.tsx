import { ThemeModeScript } from "flowbite-react";
import type { Metadata } from "next";
import { ThemeInit } from "../.flowbite-react/init";
import "./globals.css";
import Footer from "@/components/layout/Footer";
import TopBar from "@/components/layout/TopBar";
import AccountProvider from "@/components/account/AccountProvider";
import ThemeProvider from "@/components/theme/ThemeProvider";
import { MENTION_DEMONSTRATEUR } from "@/components/legal/mention";

export const metadata: Metadata = {
  title: "CartePro",
  /*
   * La mention de démonstrateur est dans la description, et non seulement dans
   * le pied de page : c'est cette phrase qu'un moteur de recherche et une
   * messagerie affichent sous le lien, donc le seul endroit qui informe
   * quelqu'un qui n'a pas encore ouvert la page.
   */
  description: `CartePro — le crédit salarié à utiliser chez vos partenaires. ${MENTION_DEMONSTRATEUR}`,
  /*
   * Les balises de partage. Elles n'existaient pas : un lien collé dans une
   * messagerie n'affichait que l'URL, et rien n'y disait qu'il s'agit d'un
   * démonstrateur. C'est l'aperçu qui circule le plus loin sans la page.
   */
  openGraph: {
    title: "CartePro",
    description: `Le crédit salarié à utiliser chez vos partenaires. ${MENTION_DEMONSTRATEUR}`,
    siteName: "CartePro",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "CartePro",
    description: `Le crédit salarié à utiliser chez vos partenaires. ${MENTION_DEMONSTRATEUR}`,
  },
  /*
   * No `icons` here on purpose: app/icon.svg and app/favicon.ico are picked up
   * by the file convention, which also fingerprints them for cache-busting. An
   * explicit entry overrides that convention wholesale — which is how the old
   * /ticket.svg kept winning over both.
   */
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Les deux familles sont déclarées dans globals.css et servies
            depuis public/fonts : Archivo et Spectral, toutes deux sous licence
            ouverte. */}
        {/* Le thème par défaut est le clair, et non celui du système.

            `defaultMode` vaut « auto » chez Flowbite : sans réglage enregistré,
            l'interface suivait `prefers-color-scheme`, si bien qu'un visiteur
            dont le système est en sombre découvrait le démonstrateur en sombre.
            Or c'est le thème clair qui fait foi — c'est celui du brand book,
            celui des captures, et celui sur lequel les contrastes sont mesurés.

            Ce n'est qu'un **défaut** : le choix du visiteur, lui, est gardé en
            `localStorage` et gagne sur cette valeur. Basculer en sombre reste
            un clic sur la bascule de la barre haute, et le réglage survit au
            rechargement. */}
        <ThemeModeScript defaultMode="light" />
      </head>
      {/* The column layout keeps the bottom bar at the foot of short pages,
          and the background is painted here rather than per page: left to the
          browser's default canvas it can disagree with the theme the tokens
          are using, which leaves white dark-mode headings sitting on white.
          Typography comes from --font-heading / --font-body in globals.css:
          Archivo for headings and chrome, Spectral for body copy. */}
      <body className="bg-cp-page text-cp-fg flex min-h-screen flex-col antialiased">
        <ThemeInit />
        {/* L'identité visuelle vient du serveur — voir backend/theme.json —
            et enveloppe tout, parce que le logotype de la barre haute et du
            pied de page en dépend autant que les couleurs. */}
        <ThemeProvider>
          <AccountProvider>
            <TopBar />
            {children}
            <Footer />
          </AccountProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
