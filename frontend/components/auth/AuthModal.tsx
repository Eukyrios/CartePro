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
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`bg-cp-page border-cp-fg pointer-events-auto relative z-50 max-h-[90vh] w-full overflow-y-auto rounded-none border-2 p-7 sm:p-8 ${
          partnerSignup ? "max-w-5xl" : "max-w-sm"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="text-cp-muted hover:bg-cp-surface hover:text-cp-fg absolute end-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-none bg-transparent"
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

        {/* Flowbite's underline tabs are grey-on-grey with rounded tops and
            body-weight text. Themed here rather than replaced, because the tab
            list is the one part of this dialog doing real work (roving focus
            and panel wiring). Every override carries its `dark:` twin: without
            one, the component's own dark variant wins over ours. */}
        <Tabs
          aria-label="Type de compte"
          variant="underline"
          theme={{
            tablist: {
              variant: {
                underline:
                  "border-cp-border dark:border-cp-border -mb-px flex-wrap gap-7 border-b-2",
              },
              tabitem: {
                base: "flex items-center justify-center rounded-none px-0 pt-0 pb-3.5 text-[10px] font-black tracking-[0.16em] uppercase first:ml-0 focus:outline-none disabled:cursor-not-allowed",
                variant: {
                  underline: {
                    base: "rounded-none",
                    active: {
                      on: "border-cp-accent text-cp-accent dark:border-cp-accent dark:text-cp-accent rounded-none border-b-2",
                      off: "text-cp-muted hover:border-cp-fg hover:text-cp-fg dark:text-cp-muted dark:hover:border-cp-fg dark:hover:text-cp-fg rounded-none border-b-2 border-transparent",
                    },
                  },
                },
              },
            },
          }}
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
