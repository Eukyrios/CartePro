/**
 * Ce qu'un partenaire déclare, et ce qui le rend valide.
 *
 * Ces types vivaient dans `components/auth/SignupPartnerFields.tsx`, et
 * `AccountProvider` comme `lib/api.ts` en importaient `PartnerFields` : la
 * couche compte et le client d'API dépendaient d'un composant de vue. Ici, la
 * dépendance va dans le bon sens — les deux formulaires qui saisissent ces
 * champs dépendent de leur définition, et non l'inverse.
 */

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

  return errors;
}
