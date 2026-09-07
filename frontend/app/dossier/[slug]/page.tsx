import type { Metadata } from "next";
import DossierDetail from "@/components/admin/DossierDetail";

export const metadata: Metadata = {
  title: "Dossier | CartePro",
  description:
    "Instruction d’un dossier de partenaire, dans l’espace d’administration CartePro",
  /* Réservé, donc hors index. Ce n'est pas une protection — c'est
     `@admin_required` côté serveur qui en est une — mais un écran de gestion
     n'a pas à être proposé en résultat de recherche. */
  robots: { index: false, follow: false },
};

/**
 * L'écran d'un dossier, à `/dossier/<slug>`.
 *
 * Hors de tout préfixe `/admin`, et c'est volontaire : il n'y a pas d'espace
 * d'administration à part. La page d'accueil *est* l'espace du compte connecté
 * — celui du salarié, celui du partenaire, ou l'instruction des dossiers pour
 * un agent (voir `components/account/AccountSpace`). Un dossier est donc une
 * page du site, pas une page d'une section qui n'existe pas.
 *
 * Pas de `generateStaticParams` : la liste des dossiers change à chaque
 * décision, et pré-rendre les seize slugs du seed produirait des pages
 * périmées dès la première instruction. La route est donc dynamique, ce qui ne
 * coûte rien ici — le contenu vient de toute façon d'un appel authentifié
 * côté client, et `DossierDetail` refuse l'écran à qui n'est pas
 * administrateur.
 *
 * `params` est une promesse depuis Next 15, d'où l'`await`.
 */
export default async function DossierPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DossierDetail slug={slug} />;
}
