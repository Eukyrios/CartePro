"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account/AccountProvider";
import SectionNav from "@/components/layout/SectionNav";
import PartnerCatalogue from "@/components/espace/PartnerCatalogue";
import EmptyState from "@/components/ui/EmptyState";
import Note from "@/components/ui/Note";
import { api, type ApiPartner } from "@/lib/api";
import EncaissementSection from "./EncaissementSection";
import ReceiptsSection from "./ReceiptsSection";
import type { RailSection } from "@/components/layout/SectionNav";

/**
 * Les écrans de l'espace partenaire, dans l'ordre, pour le rail latéral.
 * Numérotés depuis 01 comme toute liste numérotée du design.
 */
const SECTIONS: readonly RailSection[] = [
  { id: "encaissement", index: "01", label: "Encaisser" },
  { id: "reseau", index: "02", label: "Réseau" },
  { id: "recettes", index: "03", label: "Recettes" },
];

/**
 * L'espace partenaire : un écran plein par sujet, qui s'accroche au défilement
 * comme la page d'accueil, avec le même rail pour sauter de l'un à l'autre.
 *
 * Deux de ses trois écrans sont ceux du salarié — le réseau, la liste des
 * opérations — parce que ce sont les mêmes objets vus de l'autre côté du
 * comptoir. Seul l'encaissement est propre au partenaire.
 *
 * Pas d'écran « Ma carte » : un partenaire n'en a pas à dépenser, et un plein
 * écran pour montrer une carte barrée coûtait un défilement pour n'apprendre
 * rien. La carte reste sur la fiche d'un partenaire, où elle explique pourquoi
 * le bouton de paiement n'y est pas.
 *
 * Le catalogue est le même composant que dans l'espace salarié, sans
 * adaptation : un partenaire regarde le réseau dont il fait partie.
 */
export default function PartnerSpace() {
  const { profile, ready } = useAccount();
  const [me, setMe] = useState<ApiPartner | null>(null);
  /* Incrémenté à chaque encaissement réussi : c'est le lien entre l'écran qui
     encaisse et celui qui compte. */
  const [encaissements, setEncaissements] = useState(0);

  /* La fiche du partenaire connecté, prise dans le catalogue : c'est là que
     vivent son slug — l'identifiant que l'encaissement doit envoyer — et le
     tarif inscrit sur sa fiche. Le compte, lui, ne porte que son profil. */
  useEffect(() => {
    if (profile?.audience !== "partner") return;
    let cancelled = false;
    api<ApiPartner[]>("/api/partenaires/catalogue")
      .then((partners) => {
        if (cancelled) return;
        const raison = profile.partner.raisonSociale;
        setMe(
          partners.find(
            (partner) =>
              partner.nom.localeCompare(raison, "fr", {
                sensitivity: "base",
              }) === 0,
          ) ?? null,
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!ready) {
    return <EmptyState variant="page">Chargement de votre espace…</EmptyState>;
  }

  if (!profile) {
    return (
      <Note as="div">
        <strong className="font-black">Connexion requise.</strong>{" "}
        Connectez-vous avec un compte partenaire pour accéder à votre espace.{" "}
        <Link href="/" className="font-black underline underline-offset-4">
          Retour à l&apos;accueil
        </Link>
      </Note>
    );
  }

  return (
    <>
      {/* Sans fiche au catalogue, la section le dit elle-même plutôt que
          d'afficher un formulaire qui échouerait au premier code. */}
      <EncaissementSection
        partnerId={me?.id ?? null}
        defaultAmountCents={me?.amountCents ?? 0}
        onEncaisse={() => setEncaissements((count) => count + 1)}
      />

      <PartnerCatalogue />
      <ReceiptsSection refreshKey={encaissements} />

      <SectionNav sections={SECTIONS} />
    </>
  );
}
