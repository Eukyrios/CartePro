"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "./AccountProvider";

/**
 * Rafraîchit le solde en arrière-plan, sans interruption visible.
 *
 * Le partenaire encaisse depuis son propre espace : le salarié ne sait pas
 * quand le paiement arrive. Un intervalle court est la seule façon de faire
 * apparaître la déduction en direct — sans WebSocket, sans SSE, sans aucune
 * dépendance supplémentaire.
 *
 * Quatre secondes : assez court pour qu'un paiement s'affiche avant que
 * l'employé ait eu le temps de se demander pourquoi ça ne bouge pas ; assez
 * long pour ne pas saturer le serveur en mode démo.
 *
 * La boucle s'arrête dès que le composant est démonté ou que le compte est
 * déconnecté. Elle ne tourne pas quand `active` est faux — inutile de
 * rafraîchir si l'onglet est en arrière-plan ou si personne n'est connecté.
 */
export function useBalancePoll(active = true, intervalMs = 4000) {
  const { refreshAccount, profile } = useAccount();
  const refreshRef = useRef(refreshAccount);

  // Garde la ref à jour sans redémarrer l'intervalle à chaque rendu.
  useEffect(() => {
    refreshRef.current = refreshAccount;
  }, [refreshAccount]);

  useEffect(() => {
    if (!active || !profile) return;

    const id = window.setInterval(async () => {
      try {
        await refreshRef.current();
      } catch {
        // Erreur réseau passagère — on réessaie au prochain battement.
      }
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [active, profile, intervalMs]);
}
