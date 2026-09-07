"use client";

import { useAccount } from "./AccountProvider";

/**
 * The signed-in employé's balance, in cents.
 *
 * Zero when nobody is signed in, which is what every caller wanted and wrote
 * out itself. Naming it also marks where the balance comes from : le compte,
 * donc le serveur. Il n'y a plus de second solde tenu dans le navigateur —
 * l'historique vient de la même source (voir espace/movements), et la vérité
 * n'est plus coupée en deux.
 */
export function useBalance(): number {
  const { profile } = useAccount();
  return profile?.balanceCents ?? 0;
}
