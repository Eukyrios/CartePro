"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { partage } from "@/lib/partage";

/**
 * Les catégories du réseau, telles que la base les porte.
 *
 * Le front en avait une liste écrite en dur, libellés compris. Deux listes
 * pour un même référentiel : une catégorie ajoutée en base n'apparaissait pas
 * dans le formulaire d'inscription, et un partenaire pouvait être rangé dans
 * une catégorie que l'interface ne savait pas nommer.
 *
 * `id` est ce qu'un profil stocke, `label` ce qu'un écran affiche. Une liste
 * vide est une réponse valable, et chaque écran qui les affiche est bâti pour
 * la rendre proprement — c'est aussi ce qu'on voit le temps de la requête.
 */
export type PartnerCategory = {
  id: string;
  label: string;
};

export function useCategories(): {
  categories: readonly PartnerCategory[];
  loaded: boolean;
} {
  const [categories, setCategories] = useState<readonly PartnerCategory[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    /* Partagé : le référentiel est demandé par tout écran qui affiche un
       secteur, et plusieurs cohabitent sur une même page. Les appels
       simultanés se rabattent sur une seule requête — voir `lib/partage.ts`. */
    partage("categories", () =>
      api<PartnerCategory[]>("/api/partenaires/categories"),
    )
      .then((liste) => !cancelled && setCategories(liste))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loaded };
}

/**
 * Le libellé à imprimer pour une valeur stockée.
 *
 * Repli sur la valeur elle-même : une fiche qui cite une catégorie disparue du
 * référentiel se lit encore, au lieu de s'afficher vide. C'est aussi ce qui
 * permet d'afficher une catégorie avant que la liste soit chargée.
 */
export function categoryLabel(
  id: string,
  categories: readonly PartnerCategory[] = [],
): string {
  return categories.find((entry) => entry.id === id)?.label ?? id;
}
