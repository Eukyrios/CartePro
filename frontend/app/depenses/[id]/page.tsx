import type { Metadata } from "next";
import EmployeeSpending from "@/components/admin/EmployeeSpending";

export const metadata: Metadata = {
  title: "Dépenses d’un salarié | CartePro",
  description:
    "Les opérations d’un compte salarié, dans l’espace d’administration CartePro",
  /* Réservé, donc hors index — même règle que `/recettes/<slug>` et
     `/dossier/<slug>`. Ce n'est pas une protection : c'est `@admin_required`
     côté serveur qui en est une. Mais l'historique d'une personne nommée n'a
     rien à faire dans un résultat de recherche. */
  robots: { index: false, follow: false },
};

/**
 * L'historique d'un compte salarié, à `/depenses/<id>`.
 *
 * Où mène une ligne de la colonne « Salariés » de l'écran « Les recettes ».
 * Le symétrique de `/recettes/<slug>`, et hors de tout préfixe `/admin` pour la
 * même raison : il n'y a pas d'espace d'administration à part, la page
 * d'accueil est l'espace du compte connecté.
 *
 * Un identifiant numérique et non un slug : un salarié n'en a pas, et lui en
 * fabriquer un mettrait le nom d'une personne dans une URL — que le navigateur
 * garde, que l'historique montre et qu'un partage recopie. La clé primaire ne
 * dit rien de qui elle désigne.
 *
 * `params` est une promesse depuis Next 15, d'où l'`await`.
 */
export default async function EmployeeSpendingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmployeeSpending id={Number(id)} />;
}
