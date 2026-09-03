"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  ledgerServerSnapshot,
  ledgerSnapshot,
  loadLedger,
  subscribeLedger,
} from "@/components/data/ledger";
import type { Ledger } from "@/components/data/ledger";

/**
 * The ledger, live. Every section reads it through this hook, so a payment
 * updates the balance, the history and the card in the same render — that is
 * what "refreshed in real time after every transaction" costs when the store
 * notifies rather than being polled.
 *
 * The stored ledger is read after mount, like the profile: localStorage does
 * not exist while server-rendering, so the server snapshot is the seed.
 */
export function useLedger(): Ledger {
  useEffect(() => {
    loadLedger();
  }, []);

  return useSyncExternalStore(
    subscribeLedger,
    ledgerSnapshot,
    ledgerServerSnapshot,
  );
}
