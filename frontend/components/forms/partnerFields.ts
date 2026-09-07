/**
 * Ce qu'un partenaire déclare, et ce qui le rend valide.
 *
 * Ces types vivaient dans `components/auth/SignupPartnerFields.tsx`, et
 * `AccountProvider` comme `lib/api.ts` en importaient `PartnerFields` : la
 * couche compte et le client d'API dépendaient d'un composant de vue. Ici, la
 * dépendance va dans le bon sens — les deux formulaires qui saisissent ces
 * champs dépendent de leur définition, et non l'inverse.
 */

/**
 * La semaine, dans l'ordre où elle se lit — lundi d'abord, pas dimanche.
 *
 * Les clés sont ce qui part en base : des mots, pas des indices. Un tableau de
 * sept cases aurait été plus court à écrire et illisible dans un JSON, où
 * `horaires[3]` ne dit pas si la semaine commence le lundi ou le dimanche.
 */
export const JOURS = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
] as const;

export type Jour = (typeof JOURS)[number];

/**
 * Les horaires d'ouverture, un texte libre par jour.
 *
 * Une chaîne vide veut dire fermé, et c'est le seul encodage : deux champs par
 * jour — ouverture et fermeture — auraient interdit « 9h–12h / 14h–19h », qui
 * est l'horaire de la moitié des commerces français. Le texte reste court, et
 * la fiche affiche « Fermé » là où il n'y a rien.
 */
export type Horaires = Record<Jour, string>;

export const EMPTY_HORAIRES: Horaires = {
  lundi: "",
  mardi: "",
  mercredi: "",
  jeudi: "",
  vendredi: "",
  samedi: "",
  dimanche: "",
};

/** Fields collected only when a "partenaire" registers. */
export type PartnerFields = {
  raisonSociale: string;
  siren: string;
  objetSocial: string;
  categorie: string;
  adresse: string;
  ville: string;
  codePostal: string;
  nomRepresentant: string;
  /**
   * La présentation que le partenaire écrit lui-même, affichée sur sa fiche.
   *
   * Trois champs et pas un objet imbriqué : `partner_data` est un JSON libre
   * côté serveur, mais tout ce qui est plat ici se compare, se valide et se
   * saisit comme le reste — et `EMPTY_PARTNER` reste une seule couche à
   * étaler.
   */
  siteWeb: string;
  presentationTitre: string;
  /** Markdown, dans le sous-ensemble que `ui/Markdown` sait rendre. */
  presentationTexte: string;
  horaires: Horaires;
};

/** Validation messages keyed by the field they belong to. */
export type PartnerErrors = Partial<Record<keyof PartnerFields, string>>;

export const EMPTY_PARTNER: PartnerFields = {
  raisonSociale: "",
  siren: "",
  objetSocial: "",
  categorie: "",
  adresse: "",
  ville: "",
  codePostal: "",
  nomRepresentant: "",
  siteWeb: "",
  presentationTitre: "",
  presentationTexte: "",
  horaires: EMPTY_HORAIRES,
};

/** Keeps digits only, capped at `max` characters. */
export const digits = (max: number) => (raw: string) =>
  raw.replace(/\D/g, "").slice(0, max);

/**
 * Form-level SIREN check: 9 digits validated with the Luhn checksum.
 * Verified against real SIRENs (404833048, 552100554, 443061841, 380129866).
 * All-zeros passes Luhn arithmetically, so it is rejected explicitly.
 */
export function isValidSiren(siren: string): boolean {
  if (!/^\d{9}$/.test(siren)) return false;
  if (siren === "000000000") return false;

  let sum = 0;
  for (let i = 0; i < siren.length; i++) {
    let digit = Number(siren[i]);
    // Double the digits in even positions, counting from the left.
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Longueurs retenues pour la présentation.
 *
 * Le titre tient sur une ligne d'affichage, le corps sur un écran de lecture :
 * ce ne sont pas des limites techniques mais des limites de mise en page, et
 * c'est pourquoi elles vivent avec les champs plutôt que dans le formulaire.
 */
export const PRESENTATION_LIMITS = {
  titre: 70,
  texte: 1200,
  /** Un horaire, pas une phrase : « 9h–12h / 14h–19h » tient largement. */
  horaire: 40,
} as const;

/** Les sept jours, complétés : ce qui manque en base est un jour fermé. */
export function toHoraires(raw: unknown): Horaires {
  const source = (raw ?? {}) as Partial<Record<string, unknown>>;
  const out = { ...EMPTY_HORAIRES };
  for (const jour of JOURS) {
    const valeur = source[jour];
    if (typeof valeur === "string") out[jour] = valeur;
  }
  return out;
}

/** Ouvert au moins un jour ? Sinon la fiche n'affiche pas de semaine. */
export function hasHoraires(horaires: Horaires): boolean {
  return JOURS.some((jour) => horaires[jour].trim() !== "");
}

/**
 * L'adresse d'un site, telle qu'un partenaire l'écrit.
 *
 * Vide est valide — tout le monde n'a pas de site. On accepte une adresse sans
 * protocole (« poney-dream-78.fr »), qu'il faudra préfixer à l'affichage : la
 * refuser serait pinailler sur ce que l'auteur voulait manifestement dire.
 */
export function isValidSiteWeb(siteWeb: string): boolean {
  const url = siteWeb.trim();
  if (url === "") return true;
  if (/\s/.test(url)) return false;
  const sansProtocole = url.replace(/^https?:\/\//i, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(sansProtocole);
}

/** L'adresse à mettre dans un `href`, protocole compris. */
export function siteWebHref(siteWeb: string): string {
  const url = siteWeb.trim();
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Ce qui s'affiche : le domaine, sans protocole ni barre finale. */
export function siteWebLabel(siteWeb: string): string {
  return siteWeb
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

/** French postal code: exactly 5 digits. */
export function isValidCodePostal(codePostal: string): boolean {
  return /^\d{5}$/.test(codePostal);
}

/**
 * Validates the format-constrained partner fields. Uniqueness of the contact
 * email can only be settled by the backend, so it is not checked here.
 */
export function validatePartnerFields(fields: PartnerFields): PartnerErrors {
  const errors: PartnerErrors = {};

  if (!isValidSiren(fields.siren)) {
    errors.siren = "SIREN invalide : 9 chiffres avec une clé de Luhn valide.";
  }
  if (!isValidCodePostal(fields.codePostal)) {
    errors.codePostal = "Code postal invalide : 5 chiffres attendus.";
  }
  if (!isValidSiteWeb(fields.siteWeb)) {
    errors.siteWeb =
      "Adresse invalide : un domaine, par exemple mon-entreprise.fr";
  }
  if (fields.presentationTitre.length > PRESENTATION_LIMITS.titre) {
    errors.presentationTitre = `Titre trop long : ${PRESENTATION_LIMITS.titre} caractères au maximum.`;
  }
  if (fields.presentationTexte.length > PRESENTATION_LIMITS.texte) {
    errors.presentationTexte = `Texte trop long : ${PRESENTATION_LIMITS.texte} caractères au maximum.`;
  }
  if (
    JOURS.some(
      (jour) => fields.horaires[jour].length > PRESENTATION_LIMITS.horaire,
    )
  ) {
    errors.horaires = `Horaire trop long : ${PRESENTATION_LIMITS.horaire} caractères au maximum par jour.`;
  }

  return errors;
}
