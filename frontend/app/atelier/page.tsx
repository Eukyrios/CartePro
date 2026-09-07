import { notFound } from "next/navigation";
import Atelier from "@/components/atelier/Atelier";
import PageMain from "@/components/ui/PageMain";
import TopBar from "@/components/layout/TopBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atelier — CartePro",
  robots: { index: false, follow: false },
};

/**
 * La vitrine interne de la bibliothèque d'interface.
 *
 * Fermée par défaut : sans `NEXT_PUBLIC_ATELIER=1`, la route répond 404. Elle
 * reste malgré tout dans le graphe des routes, donc `next build` type-vérifie
 * et rend chaque composant à chaque compilation — un atelier exclu du build est
 * un atelier qui pourrit sans qu'on le voie. Le coût assumé : son code part
 * dans le bundle serveur même quand la porte est fermée.
 *
 * Pour l'ouvrir en local : `NEXT_PUBLIC_ATELIER=1 npm run dev`.
 */
export default function AtelierPage() {
  if (process.env.NEXT_PUBLIC_ATELIER !== "1") notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <PageMain>
        <Atelier />
      </PageMain>
    </div>
  );
}
