import { partnerById } from "./partners";
import type { Partner } from "./partners";

/**
 * « Coup de cœur du Ministre » — the selection shown on the salarié homepage.
 *
 * This is the admin's content: the list is data, so the admin space will edit
 * it (or a fetch will replace `ministerPicks()`) without an interface line
 * changing. Until that space exists, editing this file is what "driven by
 * admin selection" means, and an empty list renders the section away rather
 * than leaving a heading over nothing.
 */
export type MinisterPick = {
  partnerId: string;
  /** The Minister's own words about the place. */
  note: string;
};

const PICKS: MinisterPick[] = [
  {
    partnerId: "poney-dream-78",
    note: "Parfait pour ressouder une équipe et renouer avec la nature.",
  },
  {
    partnerId: "kostumparty",
    note: "La créativité est la clé du bonheur au travail.",
  },
  {
    partnerId: "glaces-correze",
    note: "Soutenir l'artisanat français, un parfum à la fois.",
  },
  {
    partnerId: "chapelier-fontaine",
    note: "L'élégance française.",
  },
];

/**
 * Le coup de cœur affiché : la tête de la liste, son partenaire résolu.
 *
 * Un seul, et c'est le premier — donc changer de coup de cœur, c'est remonter
 * une entrée. Les suivantes restent la réserve du Ministère, et le jour où
 * l'espace d'administration ordonnera cette liste, l'interface n'en saura rien.
 *
 * `null` si la sélection est vide ou si aucune de ses entrées ne désigne un
 * partenaire connu : une section sans contenu s'efface, elle ne s'excuse pas.
 */
export function ministerPick(): {
  pick: MinisterPick;
  partner: Partner;
} | null {
  for (const pick of PICKS) {
    const partner = partnerById(pick.partnerId);
    if (partner) return { pick, partner };
  }
  return null;
}
