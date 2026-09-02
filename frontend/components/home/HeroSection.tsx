import CreditCard3D from "./CreditCard3D";

/**
 * The landing hero: a narrow vertical rail, the headline column, and the
 * credit-card visual on a tinted panel. Three columns on desktop, stacked on
 * mobile, matching the original's 48px / 1fr / 47% grid.
 *
 * No "use client" needed: nothing here holds state or handlers, and the card's
 * tilt is pure CSS.
 */
export default function HeroSection() {
  return (
    <section
      id="accueil"
      className="border-cp-border grid min-h-[calc(100vh-76px)] border-b lg:grid-cols-[48px_1fr_47%]"
    >
      {/* Vertical rail. Sideways text has no mobile equivalent, so it is
          dropped there exactly as the original does. */}
      <div className="border-cp-border hidden items-center justify-between border-r px-3.5 py-6 text-[8px] font-black tracking-[0.14em] [writing-mode:vertical-rl] lg:flex">
        <span>CARTEPRO / 2026</span>
        <span>FRANCE</span>
      </div>

      {/* No minimum height on mobile: the column is sized by its content, so
          removing the calls to action does not leave a tall empty gap above
          the card panel. */}
      <div className="flex flex-col px-6 py-12 lg:px-[5.5vw] lg:pt-[6.5vw] lg:pb-[4.5vw]">
        {/* my-auto centres the headline block in the space left under the meta
            row, keeping it off the top now that nothing follows it. */}
        <div className="my-auto">
          <h1 className="my-0 max-w-[900px] text-[clamp(68px,10vw,160px)] leading-[0.79] font-black tracking-[-0.09em]">
            Dépenser
            <br />
            <span className="text-cp-accent font-serif font-normal">
              autrement.
            </span>
          </h1>

          <p className="mt-8 mb-0 max-w-[420px] text-sm leading-[1.55]">
            Un crédit mis à disposition par votre employeur, à utiliser chez les
            partenaires CartePro.
          </p>
        </div>
      </div>

      <div className="bg-cp-surface border-cp-border relative overflow-hidden border-l lg:min-h-full">
        {/* Faint blueprint grid behind the card. */}
        <div
          aria-hidden="true"
          className="absolute inset-[7%] bg-[linear-gradient(to_right,rgba(27,58,107,0.11)_1px,transparent_1px),linear-gradient(to_bottom,rgba(27,58,107,0.11)_1px,transparent_1px)] bg-[length:58px_58px]"
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
