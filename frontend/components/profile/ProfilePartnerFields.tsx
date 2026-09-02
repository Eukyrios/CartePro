"use client";

import { HelperText, Label, Select, TextInput } from "flowbite-react";
import { PARTNER_CATEGORIES } from "@/components/auth/SignupPartnerFields";
import type { ProfileFormApi } from "./ProfileForm";

type Props = {
  form: ProfileFormApi;
};

/** Keeps digits only, capped at `max` characters. */
const digits = (max: number) => (raw: string) =>
  raw.replace(/\D/g, "").slice(0, max);

/**
 * Editable profile of a partenaire, in the same reading order as registration
 * minus the password. SIREN and code postal reuse the registration validators
 * through ProfileForm. Field ids are prefixed so they never collide with the
 * identically named registration fields in AuthModal.
 */
export default function ProfilePartnerFields({ form }: Props) {
  const { values, partnerErrors, setValue, setPartnerValue } = form;
  const partner = values.partner;

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="profile-raisonSociale">Raison sociale</Label>
        <TextInput
          id="profile-raisonSociale"
          className="mt-2"
          value={partner.raisonSociale}
          onChange={(e) => setPartnerValue("raisonSociale", e.target.value)}
          placeholder="Nom de l'établissement"
          required
        />
      </div>

      <div>
        <Label htmlFor="profile-siren">SIREN</Label>
        <TextInput
          id="profile-siren"
          className="mt-2"
          color={partnerErrors.siren ? "failure" : undefined}
          value={partner.siren}
          onChange={(e) => setPartnerValue("siren", digits(9)(e.target.value))}
          inputMode="numeric"
          maxLength={9}
          placeholder="9 chiffres"
          required
        />
        {partnerErrors.siren && (
          <HelperText color="failure">{partnerErrors.siren}</HelperText>
        )}
      </div>

      <div>
        <Label htmlFor="profile-objetSocial">Objet social</Label>
        <TextInput
          id="profile-objetSocial"
          className="mt-2"
          value={partner.objetSocial}
          onChange={(e) => setPartnerValue("objetSocial", e.target.value)}
          placeholder="Texte libre ou code APE"
          required
        />
      </div>

      <div>
        <Label htmlFor="profile-categorie">Catégorie</Label>
        <Select
          id="profile-categorie"
          className="mt-2"
          value={partner.categorie}
          onChange={(e) => setPartnerValue("categorie", e.target.value)}
          required
        >
          <option value="">Sélectionner une catégorie</option>
          {PARTNER_CATEGORIES.map((categorie) => (
            <option key={categorie} value={categorie}>
              {categorie}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="profile-adresse">Adresse</Label>
        <TextInput
          id="profile-adresse"
          className="mt-2"
          value={partner.adresse}
          onChange={(e) => setPartnerValue("adresse", e.target.value)}
          placeholder="12 rue des Bains"
          required
        />
      </div>

      <div>
        <Label htmlFor="profile-ville">Ville</Label>
        <TextInput
          id="profile-ville"
          className="mt-2"
          value={partner.ville}
          onChange={(e) => setPartnerValue("ville", e.target.value)}
          placeholder="Royan"
          required
        />
      </div>

      <div>
        <Label htmlFor="profile-codePostal">Code postal</Label>
        <TextInput
          id="profile-codePostal"
          className="mt-2"
          color={partnerErrors.codePostal ? "failure" : undefined}
          value={partner.codePostal}
          onChange={(e) =>
            setPartnerValue("codePostal", digits(5)(e.target.value))
          }
          inputMode="numeric"
          maxLength={5}
          placeholder="17200"
          required
        />
        {partnerErrors.codePostal && (
          <HelperText color="failure">{partnerErrors.codePostal}</HelperText>
        )}
      </div>

      {/* Uniqueness is enforced by the backend: it doubles as the login id. */}
      <div>
        <Label htmlFor="profile-email">Email de contact</Label>
        <TextInput
          id="profile-email"
          type="email"
          className="mt-2"
          value={values.email}
          onChange={(e) => setValue("email", e.target.value)}
          placeholder="contact@entreprise.fr"
          required
        />
        <HelperText>Sert d&apos;identifiant de connexion.</HelperText>
      </div>

      <div>
        <Label htmlFor="profile-nomRepresentant">Nom du représentant</Label>
        <TextInput
          id="profile-nomRepresentant"
          className="mt-2"
          value={partner.nomRepresentant}
          onChange={(e) => setPartnerValue("nomRepresentant", e.target.value)}
          placeholder="Prénom et nom"
          required
        />
      </div>
    </div>
  );
}
