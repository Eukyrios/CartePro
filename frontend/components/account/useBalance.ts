"use client";

import { useAccount } from "./AccountProvider";

/**
 * The signed-in employé's balance, in cents.
 *
 * Zero when nobody is signed in, which is what every caller wanted and wrote
 * out itself. Naming it also marks where the balance comes from: the account,
 * from the server — not the client-side ledger, which still drives the history
 * and is the other half of a split source of truth (see useLedger).
 */
export function useBalance(): number {
  const { profile } = useAccount();
  return profile?.balanceCents ?? 0;
}
