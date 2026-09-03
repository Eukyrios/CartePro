"use client";

import React, { useEffect, useState } from "react";
import ProfileEmployeeFields from "./ProfileEmployeeFields";
import ProfilePartnerFields from "./ProfilePartnerFields";
import { validatePartnerFields } from "@/components/auth/SignupPartnerFields";
import type { Profile } from "@/components/account/AccountProvider";
import {
  BTN_OUTLINE,
  BTN_SOLID,
  NOTE_POSITIVE,
} from "@/components/ui/surfaces";
import type {
  PartnerErrors,
  PartnerFields,
} from "@/components/auth/SignupPartnerFields";

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
  onSave: (profile: Profile) => void;
};

/**
 * Edits the signed-in profile. Changes are held in a local draft, so leaving
 * the page or hitting Annuler discards them; only Enregistrer commits.
 */
export default function ProfileForm({ profile, onSave }: Props) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [partnerErrors, setPartnerErrors] = useState<PartnerErrors>({});
  const [saved, setSaved] = useState(false);

  const isPartner = draft.audience === "partner";
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);

  // Follow the saved profile whenever it changes underneath, so a save from
  // elsewhere is not overwritten by a stale draft.
  useEffect(() => {
    setDraft(profile);
    setPartnerErrors({});
  }, [profile]);

  function setValue<K extends keyof Profile>(field: K, value: Profile[K]) {
    setSaved(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function setPartnerValue<K extends keyof PartnerFields>(
    field: K,
    value: PartnerFields[K],
  ) {
    setSaved(false);
    setDraft((current) => ({
      ...current,
      partner: { ...current.partner, [field]: value },
    }));
    // Clear the field's error as soon as it is edited.
    setPartnerErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isPartner) {
      const errors = validatePartnerFields(draft.partner);
      setPartnerErrors(errors);
      if (Object.values(errors).some(Boolean)) return;
    }

    onSave(draft);
    setSaved(true);
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
        <p className={`${NOTE_POSITIVE} mt-7`}>Modifications enregistrées.</p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!dirty} className={BTN_SOLID}>
          Enregistrer les modifications
        </button>
        <button
          type="button"
          className={BTN_OUTLINE}
          disabled={!dirty}
          onClick={() => {
            setDraft(profile);
            setPartnerErrors({});
            setSaved(false);
          }}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
