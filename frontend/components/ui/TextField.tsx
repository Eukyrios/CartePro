"use client";

import { MICRO } from "./surfaces";
import type { ComponentProps } from "react";

/**
 * Shared control styling, so every field in the app looks identical — and the
 * single place the auth dialog and /parametres get their look from.
 *
 * Square and flat, to match the rest of the design: a hairline rule that goes
 * to the full-strength foreground on focus, an uppercase micro-label above,
 * and no rounding or shadow anywhere.
 */
/* Bâti sur MICRO, et non recopié : c'était la même recette moins `font-sans`,
   donc le libellé prenait la serif dans tout élément qui l'hérite. */
export const LABEL_CLASS = `text-cp-fg mb-2 block ${MICRO}`;

export const INPUT_CLASS =
  "bg-cp-page border-cp-border text-cp-fg placeholder:text-cp-muted focus:border-cp-fg focus:ring-cp-fg block w-full rounded-none border px-3.5 py-3 text-sm outline-none focus:ring-1";

export const ERROR_CLASS =
  "text-fg-danger mt-2 block text-[10px] font-black tracking-[0.1em] uppercase";

export const HINT_CLASS = "text-cp-muted mt-2 block text-[11px] leading-[1.45]";

type Props = Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "className"
> & {
  /** Ties the label, the input and the error message together. */
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Rewrites the raw input before it reaches onChange, e.g. digits only. */
  sanitise?: (raw: string) => string;
  error?: string;
  hint?: string;
  /** Wrapper layout only: the input's own styling is fixed by INPUT_CLASS. */
  className?: string;
};

/** A labelled text input with optional hint and error message. */
export default function TextField({
  id,
  label,
  value,
  onChange,
  sanitise,
  error,
  hint,
  className,
  type = "text",
  ...inputProps
}: Props) {
  return (
    <div className={className}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <input
        {...inputProps}
        type={type}
        id={id}
        value={value}
        onChange={(e) =>
          onChange(sanitise ? sanitise(e.target.value) : e.target.value)
        }
        className={INPUT_CLASS}
        aria-invalid={error ? true : undefined}
        /* L'indication aussi, pas seulement l'erreur : « Sert d'identifiant de
           connexion. » était invisible aux lecteurs d'écran sur tous les
           écrans, faute d'être référencée ici. */
        aria-describedby={
          [error && `${id}-error`, hint && `${id}-hint`]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {error && (
        <span id={`${id}-error`} className={ERROR_CLASS}>
          {error}
        </span>
      )}
      {hint && (
        <span id={`${id}-hint`} className={HINT_CLASS}>
          {hint}
        </span>
      )}
    </div>
  );
}
