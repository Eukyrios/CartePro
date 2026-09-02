import type { Metadata } from "next";
import AccountSettings from "@/components/profile/AccountSettings";

export const metadata: Metadata = {
  title: "Paramètres du compte | Ticket Tout",
  description:
    "Modifier les informations de son profil partenaire ou employé, et supprimer son compte",
};

export default function ParametresPage() {
  return (
    // The background is painted explicitly: left to the browser's default
    // canvas it can disagree with the theme the tokens are using, which leaves
    // the white dark-mode headings sitting on white. The inner container
    // matches the navbar's, so the page's left edge lines up with the logo
    // instead of being inset from it.
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <AccountSettings />
      </main>
    </div>
  );
}
