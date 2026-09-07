import { CardTag } from "@/components/card/CardStage";
import CreditCard3D from "@/components/card/CreditCard3D";
import Button from "@/components/ui/Button";
import Display from "@/components/ui/Display";
import Screen from "@/components/ui/Screen";

/**
 * The landing hero: the headline column and the credit-card visual on a tinted
 * panel, side by side on desktop and stacked on mobile.
 *
 * No "use client" needed: nothing here holds state or handlers, and the card's
 * tilt is pure CSS.
 */
export default function HeroSection() {
  return (
    /* Pas d'ancre de défilement : le rail ramène la première entrée en haut du
       document (scrollTo 0) plutôt que sur la section, donc un point d'accroche
       ici ne servirait à personne. Et `density="tight"` parce que les colonnes
       portent elles-mêmes leur padding. */
    <Screen
      id="accueil"
      height="below-bar"
      snap={false}
      align="stretch"
      density="tight"
      /* Deux colonnes, plus trois : la bande de 48 px portait le texte de
         tranche « CartePro / 2026 — France », et une colonne vide à la
         place de celui-ci décalerait l'accroche sans rien y mettre. */
      className="lg:grid-cols-[1fr_47%]"
    >
      {/* No minimum height on mobile: the column is sized by its content, so
          removing the calls to action does not leave a tall empty gap above
          the card panel. */}
      <div className="flex flex-col px-6 py-12 lg:px-[5.5vw] lg:pt-[6.5vw] lg:pb-[4.5vw]">
        {/* my-auto centres the headline block in the space left under the meta
            row, keeping it off the top now that nothing follows it. */}
        <div className="my-auto">
          <Display
            level={1}
            scale="hero"
            accent="autrement."
            className="max-w-[900px]"
          >
            Dépenser
          </Display>

          <p className="mt-8 mb-0 max-w-[420px] text-sm leading-[1.55]">
            Un crédit mis à disposition par votre employeur, à utiliser chez les
            partenaires CartePro.
          </p>

          {/* Une porte vers le réseau, avant qu'on ait à faire défiler pour le
              découvrir : le coup de cœur est le seul partenaire nommé de la
              page d'accueil. Une ancre, donc elle se copie et se partage. */}
          <div className="mt-8">
            <Button href="#coup-de-coeur" arrow>
              Le coup de cœur de l&apos;administrateur
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-cp-surface border-cp-border relative overflow-hidden border-l lg:min-h-full">
        {/* Faint blueprint grid behind the card. Its rules are mixed from the
            palette in globals.css, and take the ink of whichever theme is
            showing — the light theme's blue is invisible on the dark panel. */}
        <div
          aria-hidden="true"
          className="blueprint-grid absolute inset-[7%]"
        />

        {/* Centred rather than offset-and-rotated like the original static
            card: the tilt only reads as 3D from a square-on resting position.
            The width tracks the panel, matching the original card's 76%.

            In flow below lg so the card's own height sets the panel's — pinned
            to a fixed panel height it outgrew the panel around tablet width and
            got clipped. From lg the panel is full-height and the card centres
            inside it. */}
        <div className="relative z-2 flex items-center justify-center px-6 py-12 lg:absolute lg:inset-0 lg:p-0">
          <div className="w-[76%] max-w-[640px]">
            <CreditCard3D />
          </div>
        </div>

        <CardTag />
      </div>
    </Screen>
  );
}
