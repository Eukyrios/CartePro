import type { Metadata } from "next";
import PartnerReceipts from "@/components/admin/PartnerReceipts";

export const metadata: Metadata = {
  title: "Recettes d’un partenaire | CartePro",
  description:
    "Les encaissements d’un établissement du réseau, dans l’espace d’administration CartePro",
  /* Réservé, donc hors index. Ce n'est pas une protection — c'est
     `@admin_required` côté serveur qui en est une — mais un écran de gestion
     n'a pas à être proposé en résultat de recherche. */
  robots: { index: false, follow: false },
};

/**
 * Les recettes d'un établissement, à `/recettes/<slug>`.
 *
 * Où mène une tuile de l'écran « Les recettes » de l'espace d'administration.
 * Hors de tout préfixe `/admin`, comme `/dossier/<slug>` et pour la même
 * raison : il n'y a pas d'espace d'administration à part, la page d'accueil est
 * l'espace du compte connecté.
 *
 * Pas de `generateStaticParams` : le contenu vient d'un appel authentifié côté
 * client, et `PartnerReceipts` refuse l'écran à qui n'est pas administrateur.
 *
 * `params` est une promesse depuis Next 15, d'où l'`await`.
 */
export default async function PartnerReceiptsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PartnerReceipts slug={slug} />;
}
