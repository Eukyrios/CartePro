"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Un jeton de paiement émis par le serveur, et son compte à rebours.
 *
 * Le jeton vit dans l'état local de l'écran qui l'affiche : la page démontée
 * l'emporte avec elle, ce qui est la bonne durée de vie pour un code à usage
 * unique. Pas d'enquête sur le solde avant l'émission — émettre n'est pas
 * débiter, et c'est le serveur qui juge au moment de valider.
 *
 * L'horloge ne tourne que tant qu'un jeton est vivant : `state` passe à
 * "expired" au premier battement qui dépasse l'échéance, ce qui arrête
 * l'intervalle du même coup.
 *
 * Rien ici ne débite. La validation (/api/transactions/valider) est un autre
 * appel, que l'écran fera quand l'encaissement sera au programme.
 */
export type QrToken = { id: string; raw: string; expiresAt: number };

export function useQrToken() {
  const [token, setToken] = useState<QrToken | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const state = !token ? "none" : now >= token.expiresAt ? "expired" : "active";

  useEffect(() => {
    if (state !== "active") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  async function issue() {
    try {
      const result = await api<{
        raw_token_for_testing: string;
        expiration: string;
      }>("/api/salaries/paiement/qr", { method: "POST" });
      setToken({
        /* Les seize derniers caractères suffisent à dessiner un code qui
           diffère du précédent ; le jeton complet part dans `raw`, qui est ce
           qu'une validation devra envoyer. */
        id: result.raw_token_for_testing.slice(-16),
        raw: result.raw_token_for_testing,
        expiresAt: Date.parse(result.expiration),
      });
      setRefusal(null);
      setNow(Date.now());
    } catch (error) {
      setRefusal(
        error instanceof Error ? error.message : "Impossible de générer le QR.",
      );
    }
  }

  return {
    token,
    state,
    refusal,
    /** Millisecondes restantes, pour l'affichage du compte à rebours. */
    remaining: token ? token.expiresAt - now : 0,
    issue,
  };
}
