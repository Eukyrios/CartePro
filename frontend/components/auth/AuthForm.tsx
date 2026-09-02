"use client";

import type React from "react";
import SigninFields from "./SigninFields";
import SignupClientFields from "./SignupClientFields";
import SignupPartnerFields from "./SignupPartnerFields";
import type { AuthAudience, AuthFormApi, AuthMode } from "./AuthModal";

type Props = {
  audience: AuthAudience;
  mode: AuthMode;
  form: AuthFormApi;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (e: React.FormEvent) => void;
};

const isPartnerSignup = (audience: AuthAudience, mode: AuthMode) =>
  audience === "partner" && mode === "signup";

function headingFor(audience: AuthAudience, mode: AuthMode) {
  if (mode === "login") return "Connecte-toi à notre plateforme";
  return isPartnerSignup(audience, mode)
    ? "Crée ton compte partenaire"
    : "Crée ton compte employé";
}

function submitLabelFor(audience: AuthAudience, mode: AuthMode) {
  if (mode === "login") return "Se connecter";
  return isPartnerSignup(audience, mode)
    ? "Créer mon compte partenaire"
    : "Créer mon compte employé";
}

/**
 * The auth form for one audience. Sign-in is identical for every audience, so
 * both tabs share SigninFields; only registration differs, splitting into the
 * client and partner field sets. Values live in `form` (see useAuthForm in
 * AuthModal), which keeps this component presentational.
 */
export default function AuthForm({
  audience,
  mode,
  form,
  onModeChange,
  onSubmit,
}: Props) {
  const { values, setValue } = form;

  return (
    <form onSubmit={onSubmit}>
      <h5 className="text-heading mb-6 text-xl font-semibold">
        {headingFor(audience, mode)}
      </h5>

      {mode === "login" ? (
        <SigninFields form={form} />
      ) : audience === "partner" ? (
        <SignupPartnerFields form={form} />
      ) : (
        <SignupClientFields form={form} />
      )}

      <div className="my-6 flex items-start">
        <div className="flex items-center">
          <input
            id="checkbox-remember"
            type="checkbox"
            checked={values.remember}
            onChange={(e) => setValue("remember", e.target.checked)}
            className="border-default-medium bg-neutral-secondary-medium focus:ring-brand-soft h-4 w-4 rounded-xs border focus:ring-2"
          />
          <label
            htmlFor="checkbox-remember"
            className="text-heading ms-2 text-sm font-medium"
          >
            Se souvenir de moi
          </label>
        </div>
        <a
          href="#"
          className="text-fg-brand ms-auto text-sm font-medium hover:underline"
        >
          Mot de passe oublié&nbsp;?
        </a>
      </div>

      <button
        type="submit"
        className="bg-brand hover:bg-brand-strong focus:ring-brand-medium rounded-base mb-3 box-border w-full border border-transparent px-4 py-2.5 text-sm leading-5 font-medium text-white shadow-xs focus:ring-4 focus:outline-none"
      >
        {submitLabelFor(audience, mode)}
      </button>

      <div className="text-body text-sm font-medium">
        {mode === "login" ? (
          <>
            Pas encore inscrit&nbsp;?{" "}
            <button
              type="button"
              onClick={() => onModeChange("signup")}
              className="text-fg-brand hover:underline"
            >
              Créer un compte
            </button>
          </>
        ) : (
          <>
            Déjà inscrit&nbsp;?{" "}
            <button
              type="button"
              onClick={() => onModeChange("login")}
              className="text-fg-brand hover:underline"
            >
              Se connecter
            </button>
          </>
        )}
      </div>
    </form>
  );
}
