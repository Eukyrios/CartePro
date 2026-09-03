"use client";

import type { ComponentProps } from "react";
import { INPUT_CLASS, LABEL_CLASS } from "./TextField";

type Props = Omit<
  ComponentProps<"select">,
  "value" | "onChange" | "className" | "children"
> & {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /**
   * What to offer. Pairs rather than plain strings, so the stored value can
   * outlive a rename of its label.
   */
  options: readonly { value: string; label: string }[];
  /** Empty first entry, shown until a choice is made. */
  placeholder: string;
  /** Shown in place of the placeholder when there is nothing to offer. */
  emptyLabel?: string;
  /** Wrapper layout only: the select's own styling is fixed by INPUT_CLASS. */
  className?: string;
};

/** A labelled single-choice select built from a list of string options. */
export default function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  emptyLabel = "Aucune option disponible",
  className,
  ...selectProps
}: Props) {
  // A list served from data can legitimately be empty. Say so and disable the
  // control, rather than offering a select that silently opens onto nothing.
  const empty = options.length === 0;
  return (
    <div className={className}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <select
        {...selectProps}
        id={id}
        value={value}
        disabled={selectProps.disabled ?? empty}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
      >
        <option value="">{empty ? emptyLabel : placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
