"use client";

import React, { useEffect, useState } from "react";
import { TabItem, Tabs } from "flowbite-react";
import AuthForm from "./AuthForm";
import { validatePartnerFields } from "./SignupPartnerFields";
import type { PartnerErrors, PartnerFields } from "./SignupPartnerFields";

export type AuthMode = "login" | "signup";

/** Which audience the auth tabs are pointed at. */
export type AuthAudience = "partner" | "employee";

/** Everything the auth form holds while it is being filled in. */
export type AuthFormValues = {
  username: string;
  email: string;
  password: string;
  remember: boolean;
  partner: PartnerFields;
};

export type AuthSubmitPayload = {
  audience: AuthAudience;
  mode: AuthMode;
  username: string;
  email: string;
  password: string;
  remember: boolean;
  /** Present only for a partner registration. */
  partner?: PartnerFields;
};

/** The single object the auth form components read and write through. */
export type AuthFormApi = {
  values: AuthFormValues;
  partnerErrors: PartnerErrors;
  setValue: <K extends keyof AuthFormValues>(
    field: K,
    value: AuthFormValues[K],
  ) => void;
  setPartnerValue: <K extends keyof PartnerFields>(
    field: K,
    value: PartnerFields[K],
  ) => void;
  /** Validates partner fields, publishes the messages, returns whether it passed. */
  validatePartner: () => boolean;
};

export const EMPTY_PARTNER: PartnerFields = {
  raisonSociale: "",
  siren: "",
  objetSocial: "",
  categorie: "",
  adresse: "",
  ville: "",
  codePostal: "",
  nomRepresentant: "",
};

const EMPTY_VALUES: AuthFormValues = {
  username: "",
  email: "",
  password: "",
  remember: false,
  partner: EMPTY_PARTNER,
};

/**
 * Owns the auth form's values and validation messages. Kept in one place so the
 * form components stay presentational and every field survives a tab switch.
 */
function useAuthForm(): AuthFormApi {
  const [values, setValues] = useState<AuthFormValues>(EMPTY_VALUES);
  const [partnerErrors, setPartnerErrors] = useState<PartnerErrors>({});

  function setValue<K extends keyof AuthFormValues>(
    field: K,
    value: AuthFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function setPartnerValue<K extends keyof PartnerFields>(
    field: K,
    value: PartnerFields[K],
  ) {
    setValues((current) => ({
      ...current,
      partner: { ...current.partner, [field]: value },
    }));
    // Clear the field's error as soon as it is edited.
    setPartnerErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  }

  function validatePartner() {
    const errors = validatePartnerFields(values.partner);
    setPartnerErrors(errors);
    return !Object.values(errors).some(Boolean);
  }

  return { values, partnerErrors, setValue, setPartnerValue, validatePartner };
}

type Props = {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onSubmit: (payload: AuthSubmitPayload) => void;
};

/** Tab order, left to right. The first entry is the default tab. */
const AUDIENCES: AuthAudience[] = ["employee", "partner"];

const TAB_TITLES: Record<AuthAudience, string> = {
  employee: "Employés",
  partner: "Partenaires",
};

/** Tab selected whenever the modal is opened from Connexion or Inscription. */
const DEFAULT_AUDIENCE: AuthAudience = AUDIENCES[0];

/**
 * Dialog wrapping the auth form, with one tab per audience. Owns which tab is
 * showing and the form state; the form itself lives in AuthForm.
 */
export default function AuthModal({
  open,
  mode,
  onModeChange,
  onClose,
  onSubmit,
}: Props) {
  const [audience, setAudience] = useState<AuthAudience>(DEFAULT_AUDIENCE);
  const form = useAuthForm();

  const partnerSignup = audience === "partner" && mode === "signup";

  // Every open starts on the default tab. Closing unmounts Flowbite's Tabs, so
  // its internal active tab resets to the first one; resetting the audience
  // here keeps the two in step instead of leaving a hidden panel holding the
  // form.
  useEffect(() => {
    if (open) setAudience(DEFAULT_AUDIENCE);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (partnerSignup && !form.validatePartner()) return;

    const { username, email, password, remember, partner } = form.values;
    onSubmit({
      audience,
      mode,
      username,
      email,
      password,
      remember,
      ...(partnerSignup ? { partner } : {}),
    });
  }

  // Render nothing while closed rather than being unmounted by the parent, so
  // half-typed field values survive closing and reopening the modal.
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`bg-neutral-primary-soft border-default rounded-base pointer-events-auto relative z-50 max-h-[90vh] w-full overflow-y-auto border p-6 shadow-xs ${
          partnerSignup ? "max-w-5xl" : "max-w-sm"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="text-body hover:bg-neutral-secondary-medium hover:text-heading rounded-base absolute end-3 top-3 inline-flex h-8 w-8 items-center justify-center bg-transparent"
        >
          <svg
            className="h-4 w-4"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18 17.94 6M18 18 6.06 6"
            />
          </svg>
          <span className="sr-only">Fermer la fenêtre</span>
        </button>

        <Tabs
          aria-label="Type de compte"
          variant="underline"
          onActiveTabChange={(index) => setAudience(AUDIENCES[index])}
        >
          {/* Only the active panel holds the form: Flowbite renders every
              panel (hiding inactive ones), which would otherwise duplicate
              every field id in the document. */}
          {AUDIENCES.map((tabAudience) => (
            <TabItem key={tabAudience} title={TAB_TITLES[tabAudience]}>
              {audience === tabAudience && (
                <AuthForm
                  audience={tabAudience}
                  mode={mode}
                  form={form}
                  onModeChange={onModeChange}
                  onSubmit={handleSubmit}
                />
              )}
            </TabItem>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
