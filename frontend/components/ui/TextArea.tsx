"use client";

import { ERROR_CLASS, HINT_CLASS, INPUT_CLASS, LABEL_CLASS } from "./TextField";
import type { ComponentProps } from "react";

/**
 * Le champ multiligne, taillé sur `TextField`.
 *
 * Il reprend ses quatre classes plutôt que d'en inventer : un formulaire qui
 * mélange un champ carré à filet fin et un pavé de saisie arrondi se lit comme
 * deux formulaires. Seule la hauteur est à lui — `rows` — et le
 * redimensionnement est laissé vertical, parce qu'un pavé qu'on élargit sort de
 * la grille du panneau.
 *
 * `aria-describedby` pointe l'indication **et** l'erreur, dans cet ordre : la
 * consigne de saisie est aussi utile que le refus, et c'était le défaut que
 * `TextField` avait avant sa reprise.
 */
type Props = Omit<
  ComponentProps<"textarea">,
  "value" | "onChange" | "className"
> & {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** Mise en page du bloc seulement : le champ garde son propre style. */
  className?: string;
};

export default function TextArea({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  className,
  rows = 8,
  ...textareaProps
}: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <textarea
        {...textareaProps}
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${INPUT_CLASS} resize-y leading-[1.6]`}
      />
      {hint && (
        <span id={hintId} className={HINT_CLASS}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className={ERROR_CLASS}>
          {error}
        </span>
      )}
    </div>
  );
}
