import PartnerFiche from "@/components/espace/PartnerFiche";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

/**
 * La fiche d'un partenaire, résolue par son slug.
 *
 * Plus de `generateStaticParams` : la liste des seize partenaires vivait dans
 * le front, et c'est elle qui permettait de pré-rendre les seize pages à la
 * compilation. Elle n'existe plus — le réseau est en base — donc la route est
 * rendue à la demande. Deux conséquences, assumées : la page a besoin du
 * serveur d'API au moment où on l'ouvre, et le build du front n'a plus besoin
 * de connaître le réseau. Un partenaire créé depuis l'interface a désormais sa
 * fiche immédiatement, sans recompilation — ce que le pré-rendu interdisait.
 *
 * Le titre de l'onglet ne peut plus nommer le partenaire pour la même raison :
 * le nom viendrait d'une requête que cette fonction ne fait pas. Il nomme donc
 * ce qu'on regarde, et le `h1` de la page porte le nom.
 */
export const metadata: Metadata = {
  title: "Fiche partenaire | CartePro",
  description:
    "La fiche d'un partenaire du réseau CartePro : ce qu'il propose, ses horaires, et le paiement simulé.",
};

export default async function PartnerPaymentPage({ params }: Props) {
  const { id } = await params;

  return (
    /* `PartnerFiche` tient les écrans, le rail et l'accrochage au défilement :
       ils dépendent tous de la même requête — la fiche de ce partenaire. */
    <PartnerFiche slug={id} />
  );
}
