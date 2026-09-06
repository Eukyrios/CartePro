"use client";

import type React from "react";
import { demoAccountFor } from "@/components/account/demoAccounts";
import Button from "@/components/ui/Button";
import Display from "@/components/ui/Display";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import { MICRO } from "@/components/ui/surfaces";
import SigninFields from "./SigninFields";
import SignupClientFields from "./SignupClientFields";
import SignupPartnerFields from "./SignupPartnerFields";
import type { AuthAudience, AuthFormApi, AuthMode } from "./AuthModal";

type Props = {
  audience: AuthAudience;
  mode: AuthMode;
  form: AuthFormApi;
  /** Ce que le serveur a refusé, dans ses mots. */
  error?: string | null;
  busy?: boolean;
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
  error,
  busy,
  onModeChange,
  onSubmit,
}: Props) {
  const { values, setValue } = form;

  // The demonstration account for this tab, offered on sign-in only: there is
  // one per audience, and registering does not need it.
  const demo = mode === "login" ? demoAccountFor(audience) : null;

  return (
    <form onSubmit={onSubmit}>
      {/* Micro-label over a heavy tight heading, as every section of the
          landing page opens. */}
      <Micro tone="accent">
        {mode === "login" ? "Connexion" : "Inscription"}
      </Micro>
      <Display level={2} scale="panel" className="mt-3.5 mb-7">
        {headingFor(audience, mode)}
      </Display>

      {mode === "login" ? (
        <SigninFields form={form} />
      ) : audience === "partner" ? (
        <SignupPartnerFields form={form} />
      ) : (
        <SignupClientFields form={form} />
      )}

      {demo && (
        <Note as="div" className="mt-5">
          <Micro tone="accent" as="p">
            {demo.label}
          </Micro>
          <p className="text-cp-fg mt-2 font-mono text-[12px] break-all">
            {demo.email} · {demo.password}
          </p>
          {/* One tap on a tablet beats typing a password into a demo. */}
          <button
            type="button"
            onClick={() => {
              setValue("email", demo.email);
              setValue("password", demo.password);
            }}
            className={`text-cp-fg decoration-cp-accent mt-2.5 underline underline-offset-4 hover:decoration-2 ${MICRO}`}
          >
            Remplir ces identifiants
          </button>
        </Note>
      )}

      <div className="my-6 flex items-start">
        <div className="flex items-center">
          <input
            id="checkbox-remember"
            type="checkbox"
            checked={values.remember}
            onChange={(e) => setValue("remember", e.target.checked)}
            className="border-cp-border bg-cp-page text-cp-accent focus:ring-cp-accent size-4 rounded-none border focus:ring-1"
          />
          <label
            htmlFor="checkbox-remember"
            className="text-cp-fg ms-2.5 text-[12px]"
          >
            Se souvenir de moi
          </label>
        </div>
        <a
          href="#"
          className={`text-cp-accent ms-auto hover:underline ${MICRO}`}
        >
          Mot de passe oublié&nbsp;?
        </a>
      </div>

      {/* Le refus du serveur, juste au-dessus du bouton qui l'a provoqué —
          c'est là qu'on regarde après avoir cliqué, et `role="alert"` le fait
          annoncer sans déplacer le focus hors du formulaire. */}
      {error && (
        <Note tone="danger" role="alert" className="mb-4">
          {error}
        </Note>
      )}

      <Button
        type="submit"
        variant="solid"
        arrow
        disabled={busy}
        className="mb-4 w-full"
      >
        {busy ? "Un instant…" : submitLabelFor(audience, mode)}
      </Button>

      <div className="text-cp-muted text-[12px]">
        {mode === "login" ? (
          <>
            Pas encore inscrit&nbsp;?{" "}
            <button
              type="button"
              onClick={() => onModeChange("signup")}
              className="text-cp-fg font-black underline underline-offset-4 hover:no-underline"
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
              className="text-cp-fg font-black underline underline-offset-4 hover:no-underline"
            >
              Se connecter
            </button>
          </>
        )}
      </div>
    </form>
  );
}
