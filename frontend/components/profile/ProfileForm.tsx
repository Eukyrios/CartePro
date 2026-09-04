"use client";

import React, { useState } from "react";
import ProfileEmployeeFields from "./ProfileEmployeeFields";
import ProfilePartnerFields from "./ProfilePartnerFields";
import { validatePartnerFields } from "@/components/forms/partnerFields";
import { useDraft } from "@/components/forms/useDraft";
import Button from "@/components/ui/Button";
import Note from "@/components/ui/Note";
import type { Profile } from "@/components/account/AccountProvider";
import type {
  PartnerErrors,
  PartnerFields,
} from "@/components/forms/partnerFields";

/** The object the profile field sets read and write through. */
export type ProfileFormApi = {
  values: Profile;
  partnerErrors: PartnerErrors;
  setValue: <K extends keyof Profile>(field: K, value: Profile[K]) => void;
  setPartnerValue: <K extends keyof PartnerFields>(
    field: K,
    value: PartnerFields[K],
  ) => void;
};

type Props = {
  profile: Profile;
  /** Asynchrone, et attendu : voir useDraft. */
  onSave: (profile: Profile) => Promise<void> | void;
};

/**
 * Edits the signed-in profile. Changes are held in a local draft, so leaving
 * the page or hitting Annuler discards them; only Enregistrer commits.
 *
 * Le brouillon, l'état « enregistré » et l'erreur du serveur viennent de
 * `useDraft` : c'est lui qui attend la promesse, de sorte qu'un refus du
 * backend s'affiche au lieu d'être annoncé comme un succès.
 */
export default function ProfileForm({ profile, onSave }: Props) {
  const { draft, set, reset, submit, saved, error, saving, dirty } = useDraft(
    profile,
    onSave,
  );
  const [partnerErrors, setPartnerErrors] = useState<PartnerErrors>({});

  const isPartner = draft.audience === "partner";

  function setValue<K extends keyof Profile>(field: K, value: Profile[K]) {
    set((current) => ({ ...current, [field]: value }));
  }

  function setPartnerValue<K extends keyof PartnerFields>(
    field: K,
    value: PartnerFields[K],
  ) {
    set((current) => ({
      ...current,
      partner: { ...current.partner, [field]: value },
    }));
    // Clear the field's error as soon as it is edited.
    setPartnerErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isPartner) {
      const errors = validatePartnerFields(draft.partner);
      setPartnerErrors(errors);
      if (Object.values(errors).some(Boolean)) return;
    }

    await submit();
  }

  const form: ProfileFormApi = {
    values: draft,
    partnerErrors,
    setValue,
    setPartnerValue,
  };

  return (
    <form onSubmit={handleSubmit}>
      {isPartner ? (
        <ProfilePartnerFields form={form} />
      ) : (
        <ProfileEmployeeFields form={form} />
      )}

      {saved && (
        <Note tone="positive" role="status" className="mt-7">
          Modifications enregistrées.
        </Note>
      )}
      {error && (
        <Note tone="danger" role="alert" className="mt-7">
          {error}
        </Note>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button type="submit" variant="solid" disabled={!dirty || saving}>
          {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
        <Button
          disabled={!dirty || saving}
          onClick={() => {
            reset();
            setPartnerErrors({});
          }}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
