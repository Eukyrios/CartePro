import { Badge } from "flowbite-react";
import PaymentQr from "./PaymentQr";

/**
 * "Confiance" — the full-bleed blue block that closes the page. It stays blue
 * in both themes: it is the design's one inverted panel, and the surrounding
 * surfaces are what change with the theme.
 *
 * Its height leaves room for the footer so that the two together make one
 * screen, which is why the min-height is not a plain 100vh at lg.
 */
export default function ConfidenceSection() {
  return (
    <section
      id="confiance"
      className="bg-primary-700 flex min-h-screen snap-start flex-col justify-center px-6 py-16 text-white lg:min-h-[calc(100vh-230px)] lg:px-[7vw] lg:pt-14 lg:pb-14"
    >
      <div className="text-[9px] font-black tracking-[0.15em]">
        <span>02 — CONFIANCE</span>
      </div>

      {/* QR on the left, wording on the right. The spacing is deliberately
          tight: the section is capped at calc(100vh - 230px) so that it and the
          footer make one screen, and the QR is most of that budget. */}
      <div className="mt-10 grid items-center gap-10 lg:mt-8 lg:grid-cols-[auto_1fr] lg:gap-16">
        <div className="flex flex-col gap-5">
          <PaymentQr />
          <p className="max-w-[300px] text-[11px] leading-[1.5] text-white/70">
            Survolez le QR : il se dématérialise pour révéler le paiement simulé
            qu&apos;il porte.
          </p>
        </div>

        <div>
          <Badge className="inline-block rounded-none border border-white bg-transparent px-2.5 py-2 text-[8px] font-black tracking-[0.14em] text-white">
            SIMULATION
          </Badge>
          <strong className="mt-6 block text-[clamp(52px,6.8vw,112px)] leading-[0.85] tracking-[-0.08em]">
            Chaque montant
            <br />
            est identifié.
          </strong>
        </div>
      </div>
    </section>
  );
}
