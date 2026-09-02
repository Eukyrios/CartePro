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
  options: readonly string[];
  /** Empty first entry, shown until a choice is made. */
  placeholder: string;
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
  className,
  ...selectProps
}: Props) {
  return (
    <div className={className}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <select
        {...selectProps}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
