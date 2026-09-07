"use client";

import { useAccount } from "@/components/account/AccountProvider";
import { useCataloguePartner } from "@/components/data/useCataloguePartner";
import { fromApi } from "@/components/data/partners";
import SectionNav from "@/components/layout/SectionNav";
import EmptyState from "@/components/ui/EmptyState";
import Note from "@/components/ui/Note";
import PageMain from "@/components/ui/PageMain";
import PartnerPayment from "./PartnerPayment";
import PartnerPresentation, { hasPresentation } from "./PartnerPresentation";
import PartnerRefusal from "./PartnerRefusal";
import Link from "next/link";
import type { RailSection } from "@/components/layout/SectionNav";

/**
 * La fiche d'un partenaire : ses écrans, et la navigation qui va avec.
 *
 * Tout vient d'une seule requête, faite ici. Le partenaire lui-même — nom,
 * adresse, photographie, tarif — était auparavant pris dans une liste écrite
 * dans le front, ce qui obligeait à la maintenir en double avec la base. Le
 * rail, lui, doit savoir si la présentation existe : c'est la même réponse, et
 * elle n'est demandée qu'une fois.
 *
 * Sans présentation, la fiche reste un écran nu : un rail à une seule entrée
 * n'est pas une navigation, et l'accrochage sur une page d'un seul écran n'a
 * rien à accrocher.
 *
 * L'étiquette de la première entrée suit le titre de l'écran — « Payer » pour
 * un salarié, « Fiche » pour un partenaire ou un visiteur — parce qu'un rail
 * qui annonce « Payer » au-dessus d'un titre disant « La fiche de » se lit
 * comme une erreur.
 */
export default function PartnerFiche({ slug }: { slug: string }) {
  const { profile, ready } = useAccount();
  const { entry, loaded } = useCataloguePartner(slug);

  if (!loaded) {
    return (
      <PageMain>
        <EmptyState variant="page">Chargement de la fiche…</EmptyState>
      </PageMain>
    );
  }

  /* Slug inconnu du réseau. Un 404 rendu par le serveur n'est plus possible —
     la page ne sait pas, à la compilation, quels partenaires existent — donc
     le refus se dit ici, avec une porte de sortie. */
  if (!entry) {
    return (
      <PageMain pad="y">
        <Note as="div">
          <strong className="font-black">Partenaire introuvable.</strong> Aucun
          établissement du réseau ne porte l&apos;identifiant{" "}
          <code className="font-mono">{slug}</code>.{" "}
          <Link
            href="/espace#reseau"
            className="font-black underline underline-offset-4"
          >
            Parcourir le réseau
          </Link>
        </Note>
      </PageMain>
    );
  }

  const partner = fromApi(entry);
  const presentation = hasPresentation(entry) ? entry : null;
  const canPay = ready && Boolean(profile) && profile?.audience !== "partner";
  /* Un établissement écarté ouvre sa fiche par la décision qui l'écarte. Le
     rail le liste en 01 : c'est le premier écran, donc la première entrée. */
  const refuse = Boolean(entry.refus);

  const ecrans: RailSection[] = [];
  if (refuse) ecrans.push({ id: "refus", index: "", label: "Refus" });
  ecrans.push({ id: "paiement", index: "", label: canPay ? "Payer" : "Fiche" });
  if (presentation) {
    ecrans.push({ id: "presentation", index: "", label: "Présentation" });
  }

  /* Numérotés après coup, pour que le rail compte ce qu'il affiche : la
     décision de refus n'existe pas toujours, et un « 01 » manquant se lirait
     comme une erreur. */
  const sections: readonly RailSection[] | null =
    ecrans.length > 1
      ? ecrans.map((ecran, position) => ({
          ...ecran,
          index: String(position + 1).padStart(2, "0"),
        }))
      : null;

  return (
    <PageMain snap={Boolean(sections)}>
      {refuse && <PartnerRefusal entry={entry} />}
      <PartnerPayment partner={partner} />
      {presentation && <PartnerPresentation entry={presentation} />}
      {sections && <SectionNav sections={sections} />}
    </PageMain>
  );
}
