"use client";

import CreditCard3D from "@/components/card/CreditCard3D";
import { formatEuros } from "@/components/data/ledger";
import Display from "@/components/ui/Display";
import Screen from "@/components/ui/Screen";
import SimulationNotice from "@/components/ui/SimulationNotice";
import { useBalance } from "@/components/account/useBalance";
import type { ReactNode } from "react";

import { useBalancePoll } from "@/components/account/useBalancePoll";
import PaymentCodePanel from "./PaymentCodePanel";

/**
 * Le premier écran d'un espace : le bonjour, la carte, et ce qu'on peut en
 * faire — dans cet ordre.
 *
 * Écran du salarié : lui seul a une carte à dépenser. L'espace partenaire n'en
 * a pas — la carte y est barrée sur la fiche d'un partenaire, là où elle
 * explique l'absence du bouton de paiement, et pas dans un écran à elle.
 *
 * Le montant est formulé comme une capacité, pas comme un reste : « il vous
 * reste » présente un crédit comme quelque chose qui s'épuise. Le chiffre est
 * sur la carte elle-même, donc le message à côté dit ce qu'on peut en faire
 * plutôt que de l'imprimer une deuxième fois à taille d'affichage.
 *
 * La mention de simulation est là, à découvert, parce qu'un montant l'est.
 */
export default function BalanceSection({
  name,
  notice,
  children,
}: {
  /** Le prénom d'un salarié, la raison sociale d'un partenaire. */
  name: string;
  notice: ReactNode;
  /** La phrase sous la carte. Elle dit ce que ce solde permet. */
  children?: ReactNode;
}) {
  const balance = useBalance();

  // Mise à jour du solde en temps réel — le partenaire encaisse de son côté.
  useBalancePoll(true);

  /*
   * `align="start"` : le panneau de droite change de hauteur quand le QR est
   * généré, et un écran centré aurait fait remonter le bonjour de 55px à ce
   * moment-là. Le titre tient sa place, quoi qu'il arrive plus bas.
   */
  return (
    <Screen id="solde" height="below-bar" snap={false} gap={10} align="start">
      <div>
        {/* Deux lignes, comme tous les autres titres de display : « Bonjour »
            en sans, le prénom en serif dessous. */}
        <Display level={1} accent={`${name}.`}>
          Bonjour
        </Display>
      </div>

      <div className="grid w-full items-start gap-8 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-12 xl:gap-16">
        {/* ── Gauche : carte + solde ── */}
        <div className="flex flex-col gap-5">
          <div className="w-full max-w-[520px]">
            <CreditCard3D balanceCents={balance} />
          </div>

          <div className="border-cp-border border-t pt-4">
            <SimulationNotice>{notice}</SimulationNotice>
            {children && (
              <p
                aria-live="polite"
                className="text-cp-fg mt-3 max-w-[560px] text-[clamp(19px,2.2vw,26px)] leading-[1.35] font-black tracking-[-0.03em]"
              >
                {children}
              </p>
            )}
          </div>
        </div>

        {/* ── Droite : panneau de code de paiement ── */}
        <div className="flex flex-col">
          <PaymentCodePanel />
        </div>
      </div>
    </Screen>
  );
}

/** La phrase du salarié : ce qu'il peut encore dépenser. */
export function SpendingStatement() {
  const balance = useBalance();
  return balance > 0 ? (
    <>
      Vous pouvez encore dépenser {formatEuros(balance)} chez les partenaires du
      réseau.{" "}
      <em className="text-cp-accent font-serif font-normal">
        Votre crédit ne s&apos;expire pas.
      </em>
    </>
  ) : (
    <>
      Vous avez utilisé tout votre crédit. Le prochain versement de votre
      employeur apparaîtra ici.
    </>
  );
}
