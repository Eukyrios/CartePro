"use client";

import { api } from "@/lib/api";

/**
 * Un mouvement du compte connecté, tel que le serveur le rend.
 *
 * Même route pour les deux audiences — `GET /api/transactions/me` — parce que
 * c'est la même question posée des deux côtés du comptoir. Un salarié reçoit
 * ses crédits d'employeur (`credit`) et ses paiements (`debit`) ; un partenaire
 * ses encaissements.
 */
export type Movement = {
  id: string;
  /** ISO 8601, tel que le serveur l'écrit. */
  at: string;
  kind: "credit" | "debit";
  amountCents: number;
  /** Chez qui, ou de qui — jamais une adresse email. */
  label: string;
  /** Le slug du partenaire, ou `null` pour un crédit de l'employeur. */
  partnerId: string | null;
  /** La catégorie du partenaire, pour le filtre. Vide pour un crédit. */
  partnerCategorie: string;
};

/**
 * Les mouvements du compte connecté, du plus récent au plus ancien.
 *
 * L'espace partenaire a sa propre fonction pour la même route
 * (`partenaire/api.ts`) : elle n'en garde que les encaissements et les nomme
 * « recettes ». Les deux pourraient fusionner ; elles ne le font pas parce que
 * les deux écrans ne veulent pas la même forme, et qu'un type commun aurait des
 * champs toujours vides d'un côté ou de l'autre.
 */
export async function getMovements(): Promise<readonly Movement[]> {
  const data = await api<{ transactions: Movement[] }>("/api/transactions/me");
  return data.transactions;
}
