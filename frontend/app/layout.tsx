import { ThemeModeScript } from "flowbite-react";
import type { Metadata } from "next";
import { ThemeInit } from "../.flowbite-react/init";
import "./globals.css";
import Footer from "@/components/layout/Footer";
import TopBar from "@/components/layout/TopBar";
import AccountProvider from "@/components/account/AccountProvider";

export const metadata: Metadata = {
  title: "CartePro",
  description: "CartePro — le crédit salarié à utiliser chez vos partenaires",
  // Vector icon so browsers get the crisp ticket; app/favicon.ico stays as the
  // legacy fallback for clients that only request /favicon.ico.
  icons: {
    icon: [{ url: "/ticket.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <ThemeModeScript />
      </head>
      {/* The column layout keeps the bottom bar at the foot of short pages,
          and the background is painted here rather than per page: left to the
          browser's default canvas it can disagree with the theme the tokens
          are using, which leaves white dark-mode headings sitting on white.
          Typography comes from --font-sans / --font-serif in globals.css, the
          Arial and Georgia pairing the design alternates between. */}
      <body className="bg-cp-page text-cp-fg flex min-h-screen flex-col antialiased">
        <ThemeInit />
        <AccountProvider>
          <TopBar />
          {children}
          <Footer />
        </AccountProvider>
      </body>
    </html>
  );
}
