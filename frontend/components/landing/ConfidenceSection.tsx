import PaymentQr from "./PaymentQr";
import Chip from "@/components/ui/Chip";
import Display from "@/components/ui/Display";
import Screen from "@/components/ui/Screen";

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
    <Screen
      id="confiance"
      layout="flex"
      height="screen-minus-footer"
      gutter="page"
      rule={false}
      className="bg-primary-700 dark:bg-primary-600 text-white"
    >
      {/* QR on the left, wording on the right. The spacing is deliberately
          tight: the section is capped at calc(100dvh - 115px) so that it and the
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
          {/* Le chip de la bibliothèque, et non plus le Badge de Flowbite : il
              fallait neutraliser tout un jeu de couleurs cyan, `dark:` et
              `hover:` compris, pour obtenir un contour blanc. */}
          <Chip className="inline-block border-white text-white">
            Simulation
          </Chip>
          <Display level={2} scale="page" className="mt-6">
            Chaque montant
            <br />
            est identifié.
          </Display>
        </div>
      </div>
    </Screen>
  );
}
