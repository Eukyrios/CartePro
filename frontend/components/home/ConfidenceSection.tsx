import { Badge } from "flowbite-react";

/**
 * "Confiance" — the full-bleed blue block that closes the page. It stays blue
 * in both themes: it is the design's one inverted panel, and the surrounding
 * surfaces are what change with the theme.
 */
export default function ConfidenceSection() {
  return (
    <section
      id="confiance"
      className="bg-primary-700 px-6 py-16 text-white lg:px-[7vw] lg:pt-20 lg:pb-[100px]"
    >
      <div className="flex justify-between text-[9px] font-black tracking-[0.15em]">
        <span>03 — CONFIANCE</span>
        <span>TOUT EST LISIBLE.</span>
      </div>

      <div className="mt-16 grid gap-12 lg:mt-[100px] lg:grid-cols-[1.4fr_0.6fr] lg:gap-20">
        <div>
          <Badge className="inline-block rounded-none border border-white bg-transparent px-2.5 py-2 text-[8px] font-black tracking-[0.14em] text-white">
            SIMULATION
          </Badge>
          <strong className="mt-9 block text-[clamp(55px,8vw,125px)] leading-[0.8] tracking-[-0.08em]">
            Chaque montant
            <br />
            est identifié.
          </strong>
        </div>

        <div className="self-end border-white/45 pt-8 lg:border-l lg:pt-0 lg:pl-10">
          <p className="max-w-[330px] text-sm leading-[1.6]">
            CartePro est une interface de démonstration. Aucun paiement réel
            n&apos;est effectué.
          </p>

          <div className="mt-12 grid grid-cols-[60px_1fr] border-t border-white pt-3.5 lg:mt-[70px]">
            <b className="text-[10px]">QR</b>
            <span className="text-[28px] font-black">5 min</span>
            <small className="col-start-2 mt-1.5 text-[8px] tracking-[0.08em]">
              usage unique · signature serveur
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}
