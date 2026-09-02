"use client";

import type { ComponentProps } from "react";

/** Shared control styling, so every field in the app looks identical. */
export const LABEL_CLASS = "text-heading mb-2.5 block text-sm font-medium";

export const INPUT_CLASS =
  "bg-neutral-secondary-medium border-default-medium text-heading rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body block w-full border px-3 py-2.5 text-sm";

export const ERROR_CLASS = "text-fg-danger mt-1.5 block text-xs font-medium";

export const HINT_CLASS = "text-body mt-1.5 block text-xs";

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
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span id={`${id}-error`} className={ERROR_CLASS}>
          {error}
        </span>
      )}
      {hint && <span className={HINT_CLASS}>{hint}</span>}
    </div>
  );
}
