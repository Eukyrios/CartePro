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
    partnerId: "glaces-correze",
    note: "Trois parfums, pas trente. La châtaigne vaut le détour à elle seule.",
  },
  {
    partnerId: "librairie-bellevue",
    note: "On y entre pour un titre et on en ressort avec quatre. Le libraire y est pour beaucoup.",
  },
  {
    partnerId: "thermes-chaudes-aigues",
    note: "L'eau sort du sol à 82 °C depuis l'époque romaine. On ne s'en lasse pas.",
  },
];

/** The selection, with each pick's partner resolved. Skips unknown ids. */
export function ministerPicks(): readonly {
  pick: MinisterPick;
  partner: Partner;
}[] {
  return PICKS.flatMap((pick) => {
    const partner = partnerById(pick.partnerId);
    return partner ? [{ pick, partner }] : [];
  });
}
