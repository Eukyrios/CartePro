"use client";

import { HelperText, Label, TextInput } from "flowbite-react";
import type { ProfileFormApi } from "./ProfileForm";

type Props = {
  form: ProfileFormApi;
};

/**
 * Editable profile of an employé. Field ids are prefixed so they never collide
 * with the identically named registration fields in AuthModal.
 */
export default function ProfileEmployeeFields({ form }: Props) {
  const { values, setValue } = form;

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="profile-username">Nom d&apos;utilisateur</Label>
        <TextInput
          id="profile-username"
          className="mt-2"
          value={values.username}
          onChange={(e) => setValue("username", e.target.value)}
          placeholder="ton nom d'utilisateur"
          required
        />
      </div>

      {/* Uniqueness is enforced by the backend: it doubles as the login id. */}
      <div>
        <Label htmlFor="profile-email">Adresse email</Label>
        <TextInput
          id="profile-email"
          type="email"
          className="mt-2"
          value={values.email}
          onChange={(e) => setValue("email", e.target.value)}
          placeholder="exemple@entreprise.fr"
          required
        />
        <HelperText>Sert d&apos;identifiant de connexion.</HelperText>
      </div>
    </div>
  );
}
