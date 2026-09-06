"use client";

import React, { useState } from "react";
import { TabItem, Tabs } from "flowbite-react";
import Modal from "@/components/ui/Modal";
import AuthForm from "./AuthForm";
import {
  EMPTY_PARTNER,
  validatePartnerFields,
} from "@/components/forms/partnerFields";
import type {
  PartnerErrors,
  PartnerFields,
} from "@/components/forms/partnerFields";

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
  /** Le refus du serveur, affiché dans le formulaire lui-même. */
  error?: string | null;
  /** Vrai pendant l'appel : le bouton le dit plutôt que de rester inerte. */
  busy?: boolean;
  /**
   * Efface le refus affiché. Appelé quand on change d'onglet ou de mode : un
   * « mot de passe incorrect » adressé au formulaire salarié n'a rien à dire
   * au formulaire partenaire.
   */
  onDismissError?: () => void;
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
  error,
  busy,
  onDismissError,
}: Props) {
  const [audience, setAudience] = useState<AuthAudience>(DEFAULT_AUDIENCE);
  const form = useAuthForm();

  const partnerSignup = audience === "partner" && mode === "signup";

  /* Pas de remise à zéro de l'audience à l'ouverture, et c'est important : le
     dialogue est un <dialog> qui reste monté une fois fermé, donc les onglets
     de Flowbite gardent leur onglet actif. Forcer l'audience de notre côté les
     désaccordait — l'onglet montrait « Partenaires » pendant que l'audience
     disait « employee », aucun des deux panneaux ne correspondait, et le
     dialogue s'affichait vide jusqu'à ce qu'on change d'onglet à la main. Les
     deux ne changent plus que par le même geste : un clic sur un onglet. */

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (partnerSignup && !form.validatePartner()) return;

    const { username, email, password, remember, partner } = form.values;
    onSubmit({
      audience,
      mode,
      /* Un partenaire ne saisit pas de nom d'utilisateur — sa raison sociale
         en tient lieu, comme `displayNameOf` le fait déjà à l'affichage. Sans
         ce repli, `username` partait vide et /api/auth/register refusait
         **toute** inscription partenaire par un 400 « Username, email and
         password are required. », remonté en alert(). */
      username: username || (partnerSignup ? partner.raisonSociale : username),
      email,
      password,
      remember,
      ...(partnerSignup ? { partner } : {}),
    });
  }

  /* Un <dialog> natif, et non plus un div en position fixe : la touche Échap,
     le piège de focus, le fond cliquable et le retour du focus au déclencheur
     viennent de showModal(). Ce dialogue était le seul recouvrement de
     l'application sans Échap ni piège de focus — la boîte du QR était plus
     accessible que le formulaire de connexion.
 
     Le « ne rien rendre tant que c'est fermé » disparaît du même coup : un
     <dialog> fermé reste monté, donc les champs à moitié saisis survivent sans
     contournement. */
  return (
    <Modal
      open={open}
      onClose={onClose}
      size={partnerSignup ? "2xl" : "sm"}
      labelledBy="auth-tabs-label"
    >
      <span id="auth-tabs-label" className="sr-only">
        {mode === "login" ? "Se connecter" : "Créer un compte"}
      </span>
      <div>
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
          onActiveTabChange={(index) => {
            setAudience(AUDIENCES[index]);
            onDismissError?.();
          }}
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
                  error={error}
                  busy={busy}
                  onModeChange={(next) => {
                    onDismissError?.();
                    onModeChange(next);
                  }}
                  onSubmit={handleSubmit}
                />
              )}
            </TabItem>
          ))}
        </Tabs>
      </div>
    </Modal>
  );
}
