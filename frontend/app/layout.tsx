import { ThemeModeScript } from "flowbite-react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeInit } from "../.flowbite-react/init";
import "./globals.css";
import Footer from "@/components/layout/Footer";
import TopBar from "@/components/layout/TopBar";
import AccountProvider from "@/components/account/AccountProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ticket Tout",
  description: "Plateforme de billetterie pour les partenaires et les employés",
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
          are using, which leaves white dark-mode headings sitting on white. */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-white antialiased dark:bg-gray-900`}
      >
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
