"use client";

import { useAccount } from "@/components/account/AccountProvider";
import { useCataloguePartner } from "@/components/data/useCataloguePartner";
import SectionNav from "@/components/layout/SectionNav";
import PageMain from "@/components/ui/PageMain";
import PartnerPayment from "./PartnerPayment";
import PartnerPresentation, { hasPresentation } from "./PartnerPresentation";
import type { Partner } from "@/components/data/partners";
import type { RailSection } from "@/components/layout/SectionNav";

/**
 * La fiche d'un partenaire : ses écrans, et la navigation qui va avec.
 *
 * Ce composant existe pour une raison précise : le rail latéral doit lister
 * les sections *présentes*, et la présentation n'existe que si le partenaire
 * en a écrit une — ce qu'on n'apprend qu'en interrogeant le réseau. Le rail et
 * la section ont donc besoin de la même réponse, et c'est ici qu'elle est lue,
 * une fois. La version précédente laissait la présentation faire sa propre
 * requête ; il y en aurait eu deux dès que le rail a eu besoin de savoir.
 *
 * Sans présentation, la fiche reste ce qu'elle était : un écran, sans rail ni
 * accrochage au défilement. Un rail à une seule entrée n'est pas une
 * navigation, et l'accrochage sur une page d'un seul écran n'a rien à
 * accrocher.
 *
 * L'étiquette de la première entrée suit le titre de l'écran — « Payer » pour
 * un salarié, « Fiche » pour un partenaire ou un visiteur — parce qu'un rail
 * qui annonce « Payer » au-dessus d'un titre disant « La fiche de » se lit
 * comme une erreur.
 */
export default function PartnerFiche({ partner }: { partner: Partner }) {
  const { profile, ready } = useAccount();
  const { entry, loaded } = useCataloguePartner(partner.id);

  const presentation = loaded && entry && hasPresentation(entry) ? entry : null;
  const canPay = ready && Boolean(profile) && profile?.audience !== "partner";

  const sections: readonly RailSection[] | null = presentation
    ? [
        { id: "paiement", index: "01", label: canPay ? "Payer" : "Fiche" },
        { id: "presentation", index: "02", label: "Présentation" },
      ]
    : null;

  return (
    <PageMain snap={Boolean(sections)}>
      <PartnerPayment partner={partner} />
      {presentation && <PartnerPresentation entry={presentation} />}
      {sections && <SectionNav sections={sections} />}
    </PageMain>
  );
}
