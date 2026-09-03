import { Badge } from "flowbite-react";
import PaymentQr from "./PaymentQr";

/**
 * "Confiance" — the full-bleed blue block that closes the page. It is always
 * blue, but it moves a full step *up* the ramp in the dark theme, where it is
 * the one raised, saturated surface on the page.
 *
 * Going down the ramp instead was tried and does not work: primary-900 is only
 * a few points of lightness off primary-700, so the section still looked
 * untouched by the toggle, and primary-950 lands close enough to the page's own
 * near-black that the block stops reading as a panel at all. primary-600 is
 * unmistakably different from the light theme's value and stands clear of the
 * near-black page and footer either side of it, while white text on it still
 * measures about 8:1.
 *
 * White text, the outlined badge and the QR panel are deliberately fixed: the
 * block is the design's inverted panel, so its contents do not re-theme with
 * it.
 *
 * Its height leaves room for the footer so that the two together make one
 * screen, which is why the min-height is not a plain 100vh at lg.
 */
export default function ConfidenceSection() {
  return (
    <section
      id="confiance"
      className="bg-primary-700 dark:bg-primary-600 flex min-h-screen snap-start flex-col justify-center px-6 py-16 text-white lg:min-h-[calc(100vh-230px)] lg:px-[7vw] lg:pt-14 lg:pb-14"
    >
      {/* QR on the left, wording on the right. The spacing is deliberately
          tight: the section is capped at calc(100vh - 230px) so that it and the
          footer make one screen, and the QR is most of that budget. */}
      <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-16">
        <div className="flex flex-col gap-5">
          <PaymentQr />
          <p className="max-w-[300px] text-[11px] leading-[1.5] text-white/70">
            Survolez le QR : il se dématérialise pour révéler le paiement simulé
            qu&apos;il porte.
          </p>
        </div>

        <div>
          {/* The stock Badge carries a whole colour scheme — cyan, including
              `dark:` and `hover:` variants. Unprefixed classes of ours cannot
              beat a `dark:` variant in tailwind-merge, so the badge came out
              cyan-on-cyan in the dark theme and turned cyan on hover in the
              light one.
              `clearTheme` rather than `theme`: a custom theme is tailwind-merged
              into the base, so passing an empty string there removes nothing.
              clearTheme blanks the entry outright, leaving the outline below as
              the badge's only styling. */}
          <Badge
            clearTheme={{ root: { color: true } }}
            className="inline-block rounded-none border border-white bg-transparent px-2.5 py-2 text-[8px] font-black tracking-[0.14em] text-white"
          >
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
