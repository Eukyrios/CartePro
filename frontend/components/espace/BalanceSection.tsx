"use client";

import CreditCard3D from "@/components/home/CreditCard3D";
import { balanceCents, formatEuros } from "@/components/data/ledger";
import { Eyebrow } from "@/components/home/Marks";
import { SIMULATION_NOTICE } from "@/components/ui/surfaces";
import { useLedger } from "./useLedger";

/**
 * The first screen of the space: the greeting, the card, and what there is
 * left to spend — in that order.
 *
 * The amount is phrased as a capacity rather than a remainder: "il vous reste"
 * frames a credit as something running out. The figure is on the card itself,
 * so the message beside it says what can be done with it rather than printing
 * it a second time at display size.
 *
 * The simulation notice is here in the open, because a monetary value is.
 */
export default function BalanceSection({ firstName }: { firstName: string }) {
  const ledger = useLedger();
  const balance = balanceCents(ledger);

  return (
    <section
      id="solde"
      className="border-cp-border grid min-h-screen snap-start content-center gap-10 border-b py-16"
    >
      <div>
        <Eyebrow>MON ESPACE</Eyebrow>
        <h1 className="mt-4 text-[clamp(38px,5.4vw,64px)] leading-[0.84] font-black tracking-[-0.07em]">
          Bonjour{" "}
          <em className="text-cp-accent font-serif font-normal">
            {firstName}.
          </em>
        </h1>
      </div>

      <div className="w-full max-w-[520px]">
        <CreditCard3D balanceCents={balance} />
      </div>

      <div>
        <p className={SIMULATION_NOTICE}>Simulation — aucun paiement réel</p>
        <p
          aria-live="polite"
          className="text-cp-fg mt-3 max-w-[560px] text-[clamp(19px,2.2vw,26px)] leading-[1.35] font-black tracking-[-0.03em]"
        >
          {balance > 0 ? (
            <>
              Vous pouvez encore dépenser {formatEuros(balance)} chez les
              partenaires du réseau.{" "}
              <em className="text-cp-accent font-serif font-normal">
                Votre crédit ne s&apos;expire pas.
              </em>
            </>
          ) : (
            <>
              Vous avez utilisé tout votre crédit. Le prochain versement de
              votre employeur apparaîtra ici.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
