import { notFound } from "next/navigation";
import { allPartners, partnerById } from "@/components/data/partners";
import PartnerPayment from "@/components/espace/PartnerPayment";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

/** Every partner is a known page at build time, so all of them prerender. */
export function generateStaticParams() {
  return allPartners().map((partner) => ({ id: partner.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const partner = partnerById(id);
  if (!partner) return { title: "Partenaire introuvable | Ticket Tout" };
  return {
    title: `Payer chez ${partner.name} | Ticket Tout`,
    description: `Générer un QR de paiement de démonstration pour ${partner.name}, ${partner.postcode} ${partner.city}.`,
  };
}

export default async function PartnerPaymentPage({ params }: Props) {
  const { id } = await params;
  const partner = partnerById(id);
  // An unknown id is a 404, not an empty payment screen.
  if (!partner) notFound();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
      <PartnerPayment partner={partner} />
    </main>
  );
}
