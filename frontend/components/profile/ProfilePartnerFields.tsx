"use client";

import PartnerIdentityFields from "@/components/forms/PartnerIdentityFields";
import type { ProfileFormApi } from "./ProfileForm";

/**
 * Editable company profile of a partenaire.
 *
 * Ce fichier rendait les mêmes neuf champs que l'inscription, dans le même
 * ordre, avec les mêmes placeholders — mais en contrôles Flowbite, arrondis et
 * gris, quand le dialogue d'inscription les rendait carrés. Il n'est plus qu'un
 * adaptateur : la déclaration est partagée (components/forms), les identifiants
 * restent préfixés pour ne pas heurter ceux du dialogue.
 */
export default function ProfilePartnerFields({
  form,
}: {
  form: ProfileFormApi;
}) {
  const { values, partnerErrors, setValue, setPartnerValue } = form;

  return (
    <PartnerIdentityFields
      className="mt-7"
      idPrefix="profile-"
      partner={values.partner}
      email={values.email}
      errors={partnerErrors}
      onPartnerChange={setPartnerValue}
      onEmailChange={(value) => setValue("email", value)}
    />
  );
}
