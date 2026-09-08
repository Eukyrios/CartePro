import { fold } from "@/lib/text";
import type { ApiPartner } from "@/lib/api";

/**
 * Un partenaire, tel qu'un écran l'affiche — et la logique de recherche qui va
 * avec. **Aucune donnée ici.**
 *
 * Ce module portait les seize partenaires du réseau en dur, avec leur adresse,
 * leur photographie et leur conventionnement. Deux sources pour un même fait :
 * la base en avait sa copie, et rien ne garantissait qu'elles disent la même
 * chose. Le réseau vient désormais de `/api/partenaires/catalogue`, et il ne
 * reste ici que le type, la traduction depuis l'API, et des fonctions pures qui
 * prennent la liste en argument.
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
   * public/partenaires — eighteen rotations of a cool hue inside a
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
   * Conventionné « Partenaire Officiel de l'administration ».
   *
   * Statut administratif, décidé par l'administration et porté par les données :
   * il n'a rien à voir avec le « Coup de cœur de l'administrateur », qui est une
   * sélection éditoriale et changeante, servie par le catalogue. Un partenaire
   * peut être l'un, l'autre, les deux ou aucun.
   */
  official: boolean;
  /**
   * Fiche renseignée pour de vrai, ou fiche de remplissage.
   *
   * Le démonstrateur mêle quelques partenaires dont les données ont été
   * rédigées et un réseau dont les textes sont générés. L'écran le dit plutôt
   * que de laisser le lecteur deviner. Distinct du coup de cœur : l'un est un
   * goût de l'administrateur, l'autre un constat sur la donnée.
   */
  real: boolean;
  likes: number;
  likedByUser: boolean;
};

/**
 * Une entrée du catalogue traduite vers la forme qu'affichent les écrans.
 *
 * Un seul endroit fait cette conversion. `PartnerCatalogue` la refaisait à la
 * main, avec ses replis sur les données locales pour la photographie — replis
 * qui n'ont plus lieu d'être puisque la base porte l'image.
 */
export function fromApi(entry: ApiPartner): Partner {
  return {
    id: entry.id,
    name: entry.nom,
    categoryId: entry.secteur,
    address: entry.adresse,
    city: entry.ville,
    postcode: entry.codePostal,
    photo: entry.photo,
    amountCents: entry.amountCents,
    official: entry.officiel,
    real: entry.donneesReelles,
    likes: entry.likes,
    likedByUser: entry.liked_by_user,
  };
}

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

/**
 * Les villes couvertes par une liste, pour les suggestions du filtre. Dérivées
 * des partenaires plutôt que listées une seconde fois.
 */
export function citiesOf(partners: readonly Partner[]): readonly string[] {
  return [...new Set(partners.map((partner) => partner.city))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

/**
 * Les catégories qui ont réellement des partenaires derrière elles.
 *
 * Une catégorie vide est légitime — elle ne s'offre simplement pas comme un
 * filtre qui ne pourrait rien rendre. L'ordre suit le référentiel, pas l'ordre
 * d'apparition dans la liste.
 */
export function categoriesOf(
  partners: readonly Partner[],
  categories: readonly { id: string; label: string }[],
): readonly { id: string; label: string }[] {
  const utilisees = new Set(partners.map((partner) => partner.categoryId));
  return categories.filter((categorie) => utilisees.has(categorie.id));
}
