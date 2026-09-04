"use client";

import PartnerIdentityFields from "@/components/forms/PartnerIdentityFields";
import TextField from "@/components/ui/TextField";
import type { AuthFormApi } from "./AuthModal";

/**
 * Fields required at partner registration: the nine declarations, shared with
 * /parametres (see components/forms), plus the password.
 *
 * Le mot de passe passe par la fente `children`, donc il occupe la dixième
 * case de la même grille : l'inscription ajoute un champ, elle ne redéfinit pas
 * la fiche.
 */
export default function SignupPartnerFields({ form }: { form: AuthFormApi }) {
  const { values, partnerErrors, setValue, setPartnerValue } = form;

  return (
    <PartnerIdentityFields
      partner={values.partner}
      email={values.email}
      errors={partnerErrors}
      onPartnerChange={setPartnerValue}
      onEmailChange={(value) => setValue("email", value)}
    >
      <TextField
        id="password"
        type="password"
        label="Mot de passe"
        value={values.password}
        onChange={(value) => setValue("password", value)}
        placeholder="•••••••••"
        required
      />
    </PartnerIdentityFields>
  );
}
