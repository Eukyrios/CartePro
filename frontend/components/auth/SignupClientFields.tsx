"use client";

import SigninFields from "./SigninFields";
import TextField from "@/components/ui/TextField";
import type { AuthFormApi } from "./AuthModal";

type Props = {
  form: AuthFormApi;
};

/**
 * Fields required when an employé registers: a username on top of the same
 * credentials used to sign in, so those are reused from SigninFields rather
 * than repeated here.
 */
export default function SignupClientFields({ form }: Props) {
  const { values, setValue } = form;

  return (
    <>
      <TextField
        id="username"
        label="Ton nom d’utilisateur"
        value={values.username}
        onChange={(value) => setValue("username", value)}
        className="mb-4"
        placeholder="ton nom d’utilisateur"
        required
      />

      <SigninFields form={form} />
    </>
  );
}
