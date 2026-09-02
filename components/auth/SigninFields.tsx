"use client";

import TextField from "@/components/ui/TextField";
import type { AuthFormApi } from "./AuthModal";

type Props = {
  form: AuthFormApi;
};

/**
 * Credentials asked for at sign-in. Identical for partenaires and employés,
 * which is why both tabs render this same component.
 */
export default function SigninFields({ form }: Props) {
  const { values, setValue } = form;

  return (
    <>
      <TextField
        id="email"
        type="email"
        label="Ton adresse email"
        value={values.email}
        onChange={(value) => setValue("email", value)}
        className="mb-4"
        placeholder="exemple@entreprise.fr"
        required
      />

      <TextField
        id="password"
        type="password"
        label="Ton mot de passe"
        value={values.password}
        onChange={(value) => setValue("password", value)}
        placeholder="•••••••••"
        required
      />
    </>
  );
}
