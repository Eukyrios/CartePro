"use client";

import CreditCard3D from "@/components/card/CreditCard3D";
import { formatEuros } from "@/components/data/ledger";
import Display from "@/components/ui/Display";
import Screen from "@/components/ui/Screen";
import SimulationNotice from "@/components/ui/SimulationNotice";
import { useBalance } from "@/components/account/useBalance";

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
  const balance = useBalance();

  return (
    <Screen id="solde" gap={10}>
      <div>
        <Display level={1} accent={`${firstName}.`} br={false}>
          Bonjour{" "}
        </Display>
      </div>

      <div className="w-full max-w-[520px]">
        <CreditCard3D balanceCents={balance} />
      </div>

      <div>
        <SimulationNotice>Simulation — aucun paiement réel</SimulationNotice>
        <p
          aria-live="polite"
          /* Le seul clamp() hors de DISPLAY, et assumé : c'est une phrase, pas
             un titre — elle se lit à taille d'affichage sans en être un. */
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
    </Screen>
  );
}
