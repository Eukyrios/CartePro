"use client";

import { useEffect, useState } from "react";
import { toHoraires } from "@/components/forms/partnerFields";
import { api, type ApiPartner } from "@/lib/api";

/**
 * L'entrée du réseau pour un partenaire donné, par son slug.
 *
 * La fiche `/espace/partenaire/[id]` est prérendue depuis `data/partners` : le
 * nom, l'adresse et la photographie sont connus à la compilation, et c'est ce
 * qui permet de la servir sans requête. Mais la présentation, elle, est écrite
 * par le partenaire dans ses paramètres, donc elle vit en base — d'où cette
 * lecture côté client, qui vient enrichir une page déjà affichée plutôt que la
 * faire attendre.
 *
 * `loaded` distingue « pas encore répondu » de « rien à afficher » : sans lui,
 * la section de présentation clignoterait en absente à chaque chargement.
 */
export function useCataloguePartner(slug: string): {
  entry: ApiPartner | null;
  loaded: boolean;
} {
  const [entry, setEntry] = useState<ApiPartner | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    api<ApiPartner[]>("/api/partenaires/catalogue")
      .then((partners) => {
        if (cancelled) return;
        const trouve = partners.find((partner) => partner.id === slug);
        /* Les sept jours complétés dès la frontière : le serveur ne renvoie
           que ce qui a été saisi, et l'affichage veut la semaine entière pour
           pouvoir écrire « Fermé » là où il n'y a rien. */
        setEntry(
          trouve ? { ...trouve, horaires: toHoraires(trouve.horaires) } : null,
        );
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { entry, loaded };
}
