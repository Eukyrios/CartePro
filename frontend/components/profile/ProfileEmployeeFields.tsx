"use client";

import EmployeeIdentityFields from "@/components/forms/EmployeeIdentityFields";
import type { ProfileFormApi } from "./ProfileForm";

/**
 * Editable profile of an employé. Field ids are prefixed so they never collide
 * with the identically named registration fields in the auth dialog.
 *
 * Les champs eux-mêmes sont partagés avec l'inscription (voir
 * components/forms) : c'est la même déclaration, elle n'a pas à être écrite
 * deux fois, et surtout pas avec deux bibliothèques de contrôles.
 */
export default function ProfileEmployeeFields({
  form,
}: {
  form: ProfileFormApi;
}) {
  const { values, setValue } = form;

  return (
    <EmployeeIdentityFields
      className="mt-7"
      idPrefix="profile-"
      username={values.username}
      email={values.email}
      onUsernameChange={(value) => setValue("username", value)}
      onEmailChange={(value) => setValue("email", value)}
    />
  );
}
