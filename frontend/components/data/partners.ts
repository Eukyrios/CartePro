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
  },
  {
    id: "kostumparty",
    name: "KostumParty",
    categoryId: "culture",
    address: "44 rue de Bretagne",
    city: "Paris",
    postcode: "75003",
    photo: "/partenaires/kostumparty.svg",
  },
  {
    id: "glaces-correze",
    name: "Glaces Artisanales Corrèze",
    categoryId: "restauration",
    address: "3 place de la Halle",
    city: "Brive-la-Gaillarde",
    postcode: "19100",
    photo: "/partenaires/glaces-correze.svg",
  },
  {
    id: "chapelier-fontaine",
    name: "Chapelier Fontaine",
    categoryId: "culture",
    address: "18 rue des Petits-Carreaux",
    city: "Paris",
    postcode: "75002",
    photo: "/partenaires/chapelier-fontaine.svg",
  },
  {
    id: "table-des-quais",
    name: "La Table des Quais",
    categoryId: "restauration",
    address: "7 quai de la Fosse",
    city: "Nantes",
    postcode: "44000",
    photo: "/partenaires/table-des-quais.svg",
  },
  {
    id: "librairie-bellevue",
    name: "Librairie Bellevue",
    categoryId: "culture",
    address: "22 cours Berriat",
    city: "Grenoble",
    postcode: "38000",
    photo: "/partenaires/librairie-bellevue.svg",
  },
  {
    id: "atelier-savon-marseille",
    name: "Atelier du Savon de Marseille",
    categoryId: "commerce",
    address: "9 rue Sainte",
    city: "Marseille",
    postcode: "13001",
    photo: "/partenaires/atelier-savon-marseille.svg",
  },
  {
    id: "thermes-chaudes-aigues",
    name: "Thermes de Chaudes-Aigues",
    categoryId: "bien-etre",
    address: "1 avenue Georges-Pompidou",
    city: "Chaudes-Aigues",
    postcode: "15110",
    photo: "/partenaires/thermes-chaudes-aigues.svg",
  },
  {
    id: "gite-monts-dore",
    name: "Gîte des Monts Dore",
    categoryId: "hebergement",
    address: "5 route du Sancy",
    city: "Le Mont-Dore",
    postcode: "63240",
    photo: "/partenaires/gite-monts-dore.svg",
  },
  {
    id: "cinema-rex-lille",
    name: "Cinéma Le Rex",
    categoryId: "culture",
    address: "31 rue de Béthune",
    city: "Lille",
    postcode: "59800",
    photo: "/partenaires/cinema-rex-lille.svg",
  },
  {
    id: "accrobranche-esterel",
    name: "Accrobranche de l'Estérel",
    categoryId: "loisirs",
    address: "Route du Col Notre-Dame",
    city: "Fréjus",
    postcode: "83600",
    photo: "/partenaires/accrobranche-esterel.svg",
  },
  {
    id: "primeur-victor-hugo",
    name: "Primeur Victor-Hugo",
    categoryId: "commerce",
    address: "14 place Victor-Hugo",
    city: "Toulouse",
    postcode: "31000",
    photo: "/partenaires/primeur-victor-hugo.svg",
  },
  {
    id: "creperie-armor",
    name: "Crêperie d'Armor",
    categoryId: "restauration",
    address: "2 venelle du Port",
    city: "Vannes",
    postcode: "56000",
    photo: "/partenaires/creperie-armor.svg",
  },
  {
    id: "spa-vosges",
    name: "Spa des Vosges",
    categoryId: "bien-etre",
    address: "8 rue du Tilleul",
    city: "Gérardmer",
    postcode: "88400",
    photo: "/partenaires/spa-vosges.svg",
  },
  {
    id: "musee-verre-biot",
    name: "Musée du Verre de Biot",
    categoryId: "culture",
    address: "5 chemin des Combes",
    city: "Biot",
    postcode: "06410",
    photo: "/partenaires/musee-verre-biot.svg",
  },
  {
    id: "camping-etang-bleu",
    name: "Camping de l'Étang Bleu",
    categoryId: "hebergement",
    address: "Lieu-dit Le Grand Étang",
    city: "Vayrac",
    postcode: "46110",
    photo: "/partenaires/camping-etang-bleu.svg",
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

/** Accent- and case-insensitive, so "Correze" finds "Corrèze". */
function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * One page of the catalogue for a given query. Synchronous while the list is
 * local; the signature is already the shape a fetch would return, so the
 * screen does not change when this starts hitting the network.
 */
export function searchPartners(query: PartnerQuery = {}): PartnerPage {
  const search = fold(query.search ?? "");
  const city = fold(query.city ?? "");
  const postcode = fold(query.postcode ?? "");
  const categoryId = query.categoryId ?? "";

  const matches = PARTNERS.filter((partner) => {
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
