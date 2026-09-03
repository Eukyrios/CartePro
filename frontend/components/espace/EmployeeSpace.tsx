"use client";

import Link from "next/link";
import { useAccount } from "@/components/account/AccountProvider";
import SectionNav from "@/components/home/SectionNav";
import PartnerCatalogue from "@/components/partners/PartnerCatalogue";
import { MICRO, NOTE_INFO } from "@/components/ui/surfaces";
import BalanceSection from "./BalanceSection";
import HistorySection from "./HistorySection";
import MinisterPicksSection from "./MinisterPicksSection";
import type { RailSection } from "@/components/home/SectionNav";

/**
 * The screens of the space, in order, for the side rail. Numbered from 01 like
 * every other numbered list in the design; the greeting belongs to the balance
 * screen rather than being a screen of its own.
 */
const SECTIONS: readonly RailSection[] = [
  { id: "solde", index: "01", label: "Ma carte" },
  { id: "coup-de-coeur", index: "02", label: "Coup de cœur" },
  { id: "reseau", index: "03", label: "Réseau" },
  { id: "historique", index: "04", label: "Historique" },
];

/**
 * The salarié space: one full-height screen per subject, snapping as the
 * landing page does, with the same side rail to jump between them.
 *
 * Gated like /parametres — the space is the signed-in employé's own. A
 * partenaire is told so rather than shown an empty version of it.
 */
export default function EmployeeSpace() {
  const { profile, ready } = useAccount();

  if (!ready) {
    return (
      <p className={`text-cp-muted py-24 text-center ${MICRO}`}>
        Chargement de votre espace…
      </p>
    );
  }

  if (!profile) {
    return (
      <div className={NOTE_INFO}>
        <strong className="font-black">Connexion requise.</strong>{" "}
        Connectez-vous avec un compte employé pour accéder à votre espace.{" "}
        <Link href="/" className="font-black underline underline-offset-4">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  if (profile.audience === "partner") {
    return (
      <div className={NOTE_INFO}>
        <strong className="font-black">Espace réservé aux employés.</strong> Ce
        compte est un compte partenaire.{" "}
        <Link
          href="/parametres"
          className="font-black underline underline-offset-4"
        >
          Aller à mes paramètres
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* The greeting belongs to the first screen, with the card. */}
      <BalanceSection firstName={profile.username.split(" ")[0]} />
      <MinisterPicksSection />
      <PartnerCatalogue />
      <HistorySection />

      <SectionNav sections={SECTIONS} />
    </>
  );
}
