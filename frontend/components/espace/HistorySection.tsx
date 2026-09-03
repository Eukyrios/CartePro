"use client";

import { formatEuros, history } from "@/components/data/ledger";
import { Eyebrow } from "@/components/home/Marks";
import { MICRO, SIMULATION_NOTICE } from "@/components/ui/surfaces";
import { useLedger } from "./useLedger";

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * Every movement, newest first, with the balance as it stood after each one —
 * a history of amounts alone leaves the reader adding up in their head.
 *
 * Debits are printed with a minus because a movement has a direction; the card
 * is the screen that only ever shows the balance itself.
 */
export default function HistorySection() {
  const ledger = useLedger();
  const entries = history(ledger);

  // Oldest first for the running total, then flipped back for display.
  const running = new Map<string, number>();
  let total = 0;
  for (const entry of [...entries].reverse()) {
    total += entry.kind === "credit" ? entry.amountCents : -entry.amountCents;
    running.set(entry.id, total);
  }

  return (
    <section
      id="historique"
      className="border-cp-border grid min-h-screen snap-start content-center border-b py-16"
    >
      <Eyebrow>MES OPÉRATIONS</Eyebrow>
      <h2 className="mt-4 mb-4 text-[clamp(34px,4.4vw,58px)] leading-[0.86] font-black tracking-[-0.07em]">
        Historique
        <em className="text-cp-accent font-serif font-normal">.</em>
      </h2>
      <p className={`${SIMULATION_NOTICE} mb-8`}>
        Simulation — montants fictifs
      </p>

      {entries.length === 0 ? (
        <p className="text-cp-muted border-cp-border border-y py-10 text-sm">
          Aucune opération pour l&apos;instant.
        </p>
      ) : (
        <table className="border-t-cp-fg w-full border-t-2 text-left">
          <caption className="sr-only">
            Opérations du compte, de la plus récente à la plus ancienne
          </caption>
          <thead>
            <tr className={`border-cp-border border-b ${MICRO}`}>
              <th scope="col" className="py-3 font-black">
                Date
              </th>
              <th scope="col" className="py-3 font-black">
                Opération
              </th>
              <th scope="col" className="py-3 text-right font-black">
                Montant
              </th>
              <th
                scope="col"
                className="hidden py-3 text-right font-black sm:table-cell"
              >
                Solde après
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-cp-border border-b">
                <td className="text-cp-muted py-4 text-[13px] whitespace-nowrap">
                  {DATE.format(new Date(entry.at))}
                </td>
                <td className="py-4 pr-4">
                  <span className="text-cp-fg text-[15px] font-black tracking-[-0.02em]">
                    {entry.label}
                  </span>
                  <span className={`text-cp-muted mt-1 block ${MICRO}`}>
                    {entry.kind === "credit" ? "Crédit" : "Paiement"}
                  </span>
                </td>
                <td
                  className={`py-4 text-right text-[15px] font-black tabular-nums ${
                    entry.kind === "credit" ? "text-cp-positive" : "text-cp-fg"
                  }`}
                >
                  {entry.kind === "credit" ? "+" : "−"}
                  {formatEuros(entry.amountCents)}
                </td>
                <td className="text-cp-muted hidden py-4 text-right text-[13px] tabular-nums sm:table-cell">
                  {formatEuros(running.get(entry.id) ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
