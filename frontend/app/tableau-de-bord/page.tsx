import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tableau de bord | Ticket Tout",
  description: "Tableau de bord du compte partenaire ou employé",
};

/**
 * TODO: placeholder. The dashboard itself is not built yet — only the route and
 * the page shell exist, so the user menu has somewhere to point.
 */
export default function TableauDeBordPage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-heading mb-1 text-2xl font-semibold">
        Tableau de bord
      </h1>
      <p className="text-body text-sm">À venir.</p>
    </main>
  );
}
