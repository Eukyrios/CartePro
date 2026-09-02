"use client";

import SelectField from "@/components/ui/SelectField";
import TextField from "@/components/ui/TextField";
import type { AuthFormApi } from "./AuthModal";

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

/**
 * Partner categories. Spec says this list lives in the database, so this is a
 * placeholder to be replaced by a fetch once the backend exists.
 */
export const PARTNER_CATEGORIES = [
  "Restauration",
  "Culture",
  "Loisirs",
  "Commerce",
  "Hébergement",
  "Bien-être",
  "Autre",
];

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

type Props = {
  form: AuthFormApi;
};

/** Keeps digits only, capped at `max` characters. */
const digits = (max: number) => (raw: string) =>
  raw.replace(/\D/g, "").slice(0, max);

/**
 * Fields required at partner registration, laid out two per row (one per row on
 * small screens). Reading order matches the registration spec: raison sociale,
 * SIREN, objet social, catégorie, adresse, ville, code postal, email de
 * contact, nom du représentant, mot de passe.
 */
export default function SignupPartnerFields({ form }: Props) {
  const { values, partnerErrors, setValue, setPartnerValue } = form;
  const partner = values.partner;

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <TextField
        id="raisonSociale"
        label="Raison sociale"
        value={partner.raisonSociale}
        onChange={(value) => setPartnerValue("raisonSociale", value)}
        placeholder="Nom de l'établissement"
        required
      />

      <TextField
        id="siren"
        label="SIREN"
        value={partner.siren}
        onChange={(value) => setPartnerValue("siren", value)}
        sanitise={digits(9)}
        error={partnerErrors.siren}
        inputMode="numeric"
        pattern="\d{9}"
        maxLength={9}
        placeholder="9 chiffres"
        required
      />

      <TextField
        id="objetSocial"
        label="Objet social"
        value={partner.objetSocial}
        onChange={(value) => setPartnerValue("objetSocial", value)}
        placeholder="Texte libre ou code APE"
        required
      />

      <SelectField
        id="categorie"
        label="Catégorie"
        value={partner.categorie}
        onChange={(value) => setPartnerValue("categorie", value)}
        options={PARTNER_CATEGORIES}
        placeholder="Sélectionner une catégorie"
        required
      />

      <TextField
        id="adresse"
        label="Adresse"
        value={partner.adresse}
        onChange={(value) => setPartnerValue("adresse", value)}
        placeholder="12 rue des Bains"
        required
      />

      <TextField
        id="ville"
        label="Ville"
        value={partner.ville}
        onChange={(value) => setPartnerValue("ville", value)}
        placeholder="Royan"
        required
      />

      <TextField
        id="codePostal"
        label="Code postal"
        value={partner.codePostal}
        onChange={(value) => setPartnerValue("codePostal", value)}
        sanitise={digits(5)}
        error={partnerErrors.codePostal}
        inputMode="numeric"
        pattern="\d{5}"
        maxLength={5}
        placeholder="17200"
        required
      />

      {/* Uniqueness is enforced by the backend: it doubles as the login id. */}
      <TextField
        id="email"
        type="email"
        label="Email de contact"
        value={values.email}
        onChange={(value) => setValue("email", value)}
        hint="Sert d'identifiant de connexion."
        placeholder="contact@entreprise.fr"
        required
      />

      <TextField
        id="nomRepresentant"
        label="Nom du représentant"
        value={partner.nomRepresentant}
        onChange={(value) => setPartnerValue("nomRepresentant", value)}
        placeholder="Prénom et nom"
        required
      />

      <TextField
        id="password"
        type="password"
        label="Mot de passe"
        value={values.password}
        onChange={(value) => setValue("password", value)}
        placeholder="•••••••••"
        required
      />
    </div>
  );
}
