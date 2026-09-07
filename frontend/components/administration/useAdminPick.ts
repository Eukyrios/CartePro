"use client";

import { useEffect, useState } from "react";
import { api, type ApiPartner } from "@/lib/api";

/** Le coup de cœur, tel que le serveur le rend : l'entrée du réseau, et les mots. */
export type AdminPick = ApiPartner & { mot: string };

/**
 * Le coup de cœur de l'administrateur, depuis la base.
 *
 * Il vivait dans `components/data/ministerPicks.ts` : quatre partenaires et
 * quatre phrases écrites en dur. La refonte du schéma leur a donné une table —
 * `coups_de_coeur`, avec le mot de l'administrateur, un horodatage et un statut —
 * si bien que les mêmes phrases existaient à deux endroits. La section
 * d'accueil pouvait citer un partenaire que la base ne distinguait plus.
 *
 * La route rend l'entrée complète et non un identifiant : la section affiche
 * une tuile de partenaire — photographie, adresse, catégorie — et deux requêtes
 * pour une seule section n'apprendraient rien de plus.
 *
 * `loaded` distingue « pas encore répondu » de « aucun coup de cœur » : sans
 * lui, la section clignoterait en absente à chaque chargement.
 */
export function useAdminPick(): {
  pick: AdminPick | null;
  loaded: boolean;
} {
  const [pick, setPick] = useState<AdminPick | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ coup_de_coeur: AdminPick | null }>("/api/partenaires/coup-de-coeur")
      .then((data) => !cancelled && setPick(data.coup_de_coeur ?? null))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return { pick, loaded };
}
