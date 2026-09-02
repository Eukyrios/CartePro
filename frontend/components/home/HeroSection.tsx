"use client";

import { Button } from "flowbite-react";
import CreditCard3D from "./CreditCard3D";
import { Arrow } from "./Marks";

type Props = {
  onStart: () => void;
};

/**
 * The landing hero: a narrow vertical rail, the headline column, and the
 * credit-card visual on a tinted panel. Three columns on desktop, stacked on
 * mobile, matching the original's 48px / 1fr / 47% grid.
 */
export default function HeroSection({ onStart }: Props) {
  return (
    <section className="border-cp-border grid border-b lg:min-h-[calc(100vh-76px)] lg:grid-cols-[48px_1fr_47%]">
      {/* Vertical rail. Sideways text has no mobile equivalent, so it is
          dropped there exactly as the original does. */}
      <div className="border-cp-border hidden items-center justify-between border-r px-3.5 py-6 text-[8px] font-black tracking-[0.14em] [writing-mode:vertical-rl] lg:flex">
        <span>CARTEPRO / 2026</span>
        <span>FRANCE</span>
      </div>

      <div className="flex min-h-[620px] flex-col justify-between px-6 py-12 lg:min-h-0 lg:px-[5.5vw] lg:pt-[6.5vw] lg:pb-[4.5vw]">
        <div className="flex justify-between text-[9px] font-black tracking-[0.15em]">
          <span>LE CRÉDIT SALARIÉ</span>
          <span>01 — 03</span>
        </div>

        <h1 className="my-0 max-w-[900px] text-[clamp(68px,10vw,160px)] leading-[0.79] font-black tracking-[-0.09em]">
          Dépenser
          <br />
          <span className="text-cp-accent font-serif font-normal">
            autrement.
          </span>
        </h1>

        <div className="flex flex-col items-start justify-between gap-9 lg:flex-row lg:items-end">
          <p className="m-0 max-w-[320px] text-sm leading-[1.55]">
            Un crédit mis à disposition par votre employeur, à utiliser chez les
            partenaires CartePro.
          </p>

          <div className="flex flex-col items-start gap-5">
            {/* h-auto: Flowbite's size prop pins a fixed height, which would
                override the design's padding. */}
            <Button
              onClick={onStart}
              className="group border-primary-700 h-auto rounded-none border px-[19px] py-[15px] text-[11px] font-black"
            >
              Commencer
              <Arrow />
            </Button>
            <a
              href="#fonctionnement"
              className="group border-cp-fg border-b pb-[5px] text-[10px] font-extrabold whitespace-nowrap no-underline"
            >
              Voir comment ça marche
              <Arrow />
            </a>
          </div>
        </div>
      </div>

      <div className="bg-cp-surface border-cp-border relative min-h-[500px] overflow-hidden border-l lg:min-h-full">
        {/* Faint blueprint grid behind the card. */}
        <div
          aria-hidden="true"
          className="absolute inset-[7%] bg-[linear-gradient(to_right,rgba(27,58,107,0.11)_1px,transparent_1px),linear-gradient(to_bottom,rgba(27,58,107,0.11)_1px,transparent_1px)] bg-[length:58px_58px]"
        />

        {/* Centred rather than offset-and-rotated like the original static
            card: the tilt only reads as 3D from a square-on resting position.
            The width tracks the panel, matching the original card's 76%. */}
        <div className="absolute inset-0 z-2 flex items-center justify-center">
          <div className="w-[76%] max-w-[640px]">
            <CreditCard3D />
          </div>
        </div>

        <div className="text-cp-accent border-primary-700 bg-cp-page absolute top-[9%] right-[6%] z-3 rotate-[4deg] border px-[13px] py-[11px]">
          <span className="mb-[7px] block text-[7px] font-black tracking-[0.16em]">
            UNE CARTE
          </span>
          <b className="text-[13px] leading-[0.85] tracking-[-0.05em]">
            POUR
            <br />
            CHOISIR.
          </b>
        </div>

        <div className="absolute right-[30px] bottom-[25px] text-[11px] font-black">
          01<span className="text-cp-accent px-1">/</span>04
        </div>
      </div>
    </section>
  );
}
