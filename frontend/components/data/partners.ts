import { fold } from "@/lib/text";
import { partnerCategories } from "./partnerCategories";

/**
 * The partner network, as data — same contract as partnerCategories: the
 * interface never holds the list, and swapping this module's two functions for
 * fetches is the whole of the work when the backend arrives.
 *
 * Location is address, city and postcode. No coordinates: the space shows and
 * filters on those three fields and deliberately has no map.
 */
export type Partner = {
  id: string;
  name: string;
  /** Matches a PartnerCategory id, so a renamed category needs no edit here. */
  categoryId: string;
  /** One line, as it would be printed on a receipt. */
  address: string;
  city: string;
  postcode: string;
  /**
   * The partner's photograph. Currently placeholder artwork generated into
   * public/partenaires — sixteen rotations of the institutional blue inside a
   * narrow cool band, so the grid reads as one family. Real photography drops
   * in by changing this one field per partner; nothing in the interface knows
   * the difference.
   */
  photo: string;
  /**
   * What this partner is asking for, in cents — the amount is the merchant's
   * to set, never the employé's. In production the partner's terminal sends
   * it; here it stands in the data, which is also what makes some partners
   * cost more than the demo balance, so the refusal can be shown.
   */
  amountCents: number;
  /**
   * Conventionné « Partenaire Officiel du Ministère ».
   *
   * Statut administratif, décidé par le Ministère et porté par les données :
   * il n'a rien à voir avec le « Coup de cœur du Ministre », qui est une
   * sélection éditoriale et changeante (voir data/ministerPicks). Un partenaire
   * peut être l'un, l'autre, les deux ou aucun.
   */
  official: boolean;
};

const PARTNERS: Partner[] = [
  {
    id: "poney-dream-78",
    name: "Poney Dream 78",
    categoryId: "loisirs",
    address: "12 chemin des Écuries",
    city: "Rambouillet",
    postcode: "78120",
    photo: "/partenaires/poney-dream-78.svg",
    official: true,
    amountCents: 2500,
  },
  {
    id: "kostumparty",
    name: "KostumParty",
    categoryId: "culture",
    address: "23 rue de la Roquette",
    city: "Paris",
    postcode: "75011",
    photo: "/partenaires/kostumparty.svg",
    official: false,
    amountCents: 1800,
  },
  {
    id: "glaces-correze",
    name: "Glaces Artisanales Corrèze",
    categoryId: "restauration",
    address: "3 place de la Halle",
    city: "Brive-la-Gaillarde",
    postcode: "19100",
    photo: "/partenaires/glaces-correze.svg",
    official: false,
    amountCents: 450,
  },
  {
    id: "chapelier-fontaine",
    name: "Chapelier Fontaine",
    categoryId: "culture",
    address: "9 rue des Filatiers",
    city: "Toulouse",
    postcode: "31000",
    photo: "/partenaires/chapelier-fontaine.svg",
    official: true,
    amountCents: 2900,
  },
  {
    id: "table-des-quais",
    name: "La Table des Quais",
    categoryId: "restauration",
    address: "7 quai de la Fosse",
    city: "Nantes",
    postcode: "44000",
    photo: "/partenaires/table-des-quais.svg",
    official: false,
    amountCents: 1900,
  },
  {
    id: "librairie-bellevue",
    name: "Librairie Bellevue",
    categoryId: "culture",
    address: "22 cours Berriat",
    city: "Grenoble",
    postcode: "38000",
    photo: "/partenaires/librairie-bellevue.svg",
    official: true,
    amountCents: 1650,
  },
  {
    id: "atelier-savon-marseille",
    name: "Atelier du Savon de Marseille",
    categoryId: "commerce",
    address: "9 rue Sainte",
    city: "Marseille",
    postcode: "13001",
    photo: "/partenaires/atelier-savon-marseille.svg",
    official: false,
    amountCents: 900,
  },
  {
    id: "thermes-chaudes-aigues",
    name: "Thermes de Chaudes-Aigues",
    categoryId: "bien-etre",
    address: "1 avenue Georges-Pompidou",
    city: "Chaudes-Aigues",
    postcode: "15110",
    photo: "/partenaires/thermes-chaudes-aigues.svg",
    official: true,
    amountCents: 3200,
  },
  {
    id: "gite-monts-dore",
    name: "Gîte des Monts Dore",
    categoryId: "hebergement",
    address: "5 route du Sancy",
    city: "Le Mont-Dore",
    postcode: "63240",
    photo: "/partenaires/gite-monts-dore.svg",
    official: false,
    amountCents: 8900,
  },
  {
    id: "cinema-rex-lille",
    name: "Cinéma Le Rex",
    categoryId: "culture",
    address: "31 rue de Béthune",
    city: "Lille",
    postcode: "59800",
    photo: "/partenaires/cinema-rex-lille.svg",
    official: true,
    amountCents: 750,
  },
  {
    id: "accrobranche-esterel",
    name: "Accrobranche de l'Estérel",
    categoryId: "loisirs",
    address: "Route du Col Notre-Dame",
    city: "Fréjus",
    postcode: "83600",
    photo: "/partenaires/accrobranche-esterel.svg",
    official: false,
    amountCents: 2200,
  },
  {
    id: "primeur-victor-hugo",
    name: "Primeur Victor-Hugo",
    categoryId: "commerce",
    address: "14 place Victor-Hugo",
    city: "Toulouse",
    postcode: "31000",
    photo: "/partenaires/primeur-victor-hugo.svg",
    official: false,
    amountCents: 1200,
  },
  {
    id: "creperie-armor",
    name: "Crêperie d'Armor",
    categoryId: "restauration",
    address: "2 venelle du Port",
    city: "Vannes",
    postcode: "56000",
    photo: "/partenaires/creperie-armor.svg",
    official: false,
    amountCents: 1450,
  },
  {
    id: "spa-vosges",
    name: "Spa des Vosges",
    categoryId: "bien-etre",
    address: "8 rue du Tilleul",
    city: "Gérardmer",
    postcode: "88400",
    photo: "/partenaires/spa-vosges.svg",
    official: false,
    amountCents: 5500,
  },
  {
    id: "musee-verre-biot",
    name: "Musée du Verre de Biot",
    categoryId: "culture",
    address: "5 chemin des Combes",
    city: "Biot",
    postcode: "06410",
    photo: "/partenaires/musee-verre-biot.svg",
    official: true,
    amountCents: 600,
  },
  {
    id: "camping-etang-bleu",
    name: "Camping de l'Étang Bleu",
    categoryId: "hebergement",
    address: "Lieu-dit Le Grand Étang",
    city: "Vayrac",
    postcode: "46110",
    photo: "/partenaires/camping-etang-bleu.svg",
    official: false,
    amountCents: 4200,
  },
];

/**
 * How many partners one page of the catalogue shows: three, side by side, with
 * a swipe to reach the rest.
 */
export const PARTNERS_PER_PAGE = 3;

export type PartnerQuery = {
  /** Matched against the partner's name and address. */
  search?: string;
  /** A PartnerCategory id, or empty for every category. */
  categoryId?: string;
  city?: string;
  postcode?: string;
  /** 1-based. Clamped into range, so a stale page never renders empty. */
  page?: number;
};

export type PartnerPage = {
  items: readonly Partner[];
  /** Matches before paging, for "n résultats". */
  total: number;
  page: number;
  pages: number;
};

/**
 * Every partner in `partners` that the query matches, in declaration order and
 * without paging.
 *
 * What the catalogue's drifting row needs: it shows the whole result and lets
 * the reader push it along, so cutting the list into pages of three would only
 * have to be undone. `searchPartnerList` pages over this same function, so the
 * row and a page filter identically — there is one predicate here, not two.
 */
export function matchingPartnerList(
  partners: readonly Partner[],
  query: PartnerQuery = {},
): readonly Partner[] {
  // Folded once for the whole list rather than once per partner.
  const search = fold(query.search ?? "");
  const city = fold(query.city ?? "");
  const postcode = fold(query.postcode ?? "");
  const categoryId = query.categoryId ?? "";

  return partners.filter((partner) => {
    if (categoryId && partner.categoryId !== categoryId) return false;
    if (city && !fold(partner.city).includes(city)) return false;
    if (postcode && !partner.postcode.startsWith(postcode)) return false;
    if (
      search &&
      !fold(partner.name).includes(search) &&
      !fold(partner.address).includes(search)
    ) {
      return false;
    }
    return true;
  });
}

/** The local network's matches, unpaged. */
export function matchingPartners(query: PartnerQuery = {}): readonly Partner[] {
  return matchingPartnerList(PARTNERS, query);
}

/**
 * One page of the catalogue for a given query. Synchronous while the list is
 * local; the signature is already the shape a fetch would return, so the
 * screen does not change when this starts hitting the network.
 */
export function searchPartnerList(
  partners: readonly Partner[],
  query: PartnerQuery = {},
): PartnerPage {
  const matches = matchingPartnerList(partners, query);

  const pages = Math.max(1, Math.ceil(matches.length / PARTNERS_PER_PAGE));
  const page = Math.min(Math.max(query.page ?? 1, 1), pages);
  const start = (page - 1) * PARTNERS_PER_PAGE;

  return {
    items: matches.slice(start, start + PARTNERS_PER_PAGE),
    total: matches.length,
    page,
    pages,
  };
}

export function searchPartners(query: PartnerQuery = {}): PartnerPage {
  return searchPartnerList(PARTNERS, query);
}

/** Les conventionnés, pour les écrans qui les distinguent du reste du réseau. */
export function officialPartners(): readonly Partner[] {
  return PARTNERS.filter((partner) => partner.official);
}

/** Every partner, for the places that need the whole list rather than a page. */
export function allPartners(): readonly Partner[] {
  return PARTNERS;
}

/** One partner by id, for anything that stores a reference rather than a copy. */
export function partnerById(id: string): Partner | undefined {
  return PARTNERS.find((partner) => partner.id === id);
}

/**
 * The cities the network covers, for the city filter's suggestions. Derived
 * from the partners rather than listed a second time.
 */
export function partnerCities(): readonly string[] {
  return [...new Set(PARTNERS.map((partner) => partner.city))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

/**
 * Categories that actually have partners behind them, in the order the category
 * data declares. An empty category is legitimate — it simply does not offer
 * itself as a filter that could only ever return nothing.
 */
export function categoriesInUse() {
  const used = new Set(PARTNERS.map((partner) => partner.categoryId));
  return partnerCategories().filter((category) => used.has(category.id));
}
