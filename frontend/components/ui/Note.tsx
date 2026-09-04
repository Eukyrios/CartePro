import { cx } from "./cx";
import { NOTE_DANGER, NOTE_INFO, NOTE_POSITIVE } from "./surfaces";
import type { ElementType, ReactNode } from "react";

/**
 * A message strip: a 2px rule down the left, no rounding, no icon.
 *
 * `role` is the caller's, not the tone's: a refusal the reader must be told
 * about is `role="alert"`, a confirmation is `role="status"`, and a standing
 * explanation is neither. Colour alone never carries the meaning.
 */
const TONES = {
  info: NOTE_INFO,
  danger: NOTE_DANGER,
  positive: NOTE_POSITIVE,
} as const;

type Props = {
  children: ReactNode;
  tone?: keyof typeof TONES;
  as?: ElementType;
  role?: "alert" | "status";
  /** Additive only — this component owns the rule, the field and the type. */
  className?: string;
};

export default function Note({
  children,
  tone = "info",
  as: Tag = "p",
  role,
  className,
}: Props) {
  return (
    <Tag role={role} className={cx(TONES[tone], className)}>
      {children}
    </Tag>
  );
}
