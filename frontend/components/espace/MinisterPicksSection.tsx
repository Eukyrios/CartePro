"use client";

import { useState } from "react";
import { ministerPicks } from "@/components/data/ministerPicks";
import { Eyebrow } from "@/components/home/Marks";
import PartnerPhoto from "@/components/partners/PartnerPhoto";
import { CHIP_OFFICIAL, MICRO } from "@/components/ui/surfaces";
import PaymentDialog from "./PaymentDialog";
import type { Partner } from "@/components/data/partners";

/**
 * « Coup de cœur du Ministre »: the selection, and the Minister's own words on
 * each. The content is the admin's — see data/ministerPicks — so nothing here
 * changes when the selection does, and an empty selection renders the section
 * away rather than leaving a heading over nothing.
 */
export default function MinisterPicksSection() {
  const [paying, setPaying] = useState<Partner | null>(null);
  const picks = ministerPicks();
  if (picks.length === 0) return null;

  return (
    <section
      id="coup-de-coeur"
      className="border-cp-border grid min-h-screen snap-start content-center border-b py-16"
    >
      <Eyebrow>SÉLECTION</Eyebrow>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-[clamp(34px,4.4vw,58px)] leading-[0.86] font-black tracking-[-0.07em]">
          Coup de cœur
          <br />
          <em className="text-cp-accent font-serif font-normal">
            du Ministre.
          </em>
        </h2>
        <span className={CHIP_OFFICIAL}>Choisi par le Ministère</span>
      </div>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map(({ pick, partner }) => (
          <li key={partner.id}>
            {/* Payable from here as much as from the catalogue: a pick is a
                partner, and the Minister's point is that you go. */}
            <button
              type="button"
              onClick={() => setPaying(partner)}
              className="border-cp-border group hover:border-cp-fg focus-visible:outline-cp-accent h-full w-full cursor-pointer border text-left focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <PartnerPhoto partner={partner} />
              <div className="p-4">
                <p className="text-cp-fg text-[13px] leading-[1.5] italic">
                  «&nbsp;{pick.note}&nbsp;»
                </p>
                <address className={`text-cp-muted mt-3 not-italic ${MICRO}`}>
                  {partner.postcode} {partner.city}
                </address>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {paying && (
        <PaymentDialog partner={paying} onClose={() => setPaying(null)} />
      )}
    </section>
  );
}
