import { cx } from "./cx";
import type { ComponentProps, ReactNode } from "react";

/**
 * A square button holding one glyph: back, close, previous, next.
 *
 * There were four of these — 36px bordered, 40px bordered with a different
 * disabled opacity, a full-size outline button squeezed with `px-4`, and a
 * 32px ghost — for the same job. One size now: 40px, the only one comfortably
 * over the 24px minimum target.
 *
 * The label is required and becomes `aria-label`, because a glyph is not a
 * name; the glyph itself is hidden from assistive technology.
 */
const VARIANTS = {
  outline:
    "border-cp-fg text-cp-fg enabled:hover:bg-cp-fg enabled:hover:text-cp-page border",
  /** No border: for a close button sitting inside a dialog's own frame. */
  ghost: "text-cp-muted hover:bg-cp-surface hover:text-cp-fg bg-transparent",
} as const;

type Props = Omit<ComponentProps<"button">, "className" | "aria-label"> & {
  /** What the button does, for anyone who cannot see the glyph. */
  label: string;
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  /** Additive only — this component owns the size, the border and the face. */
  className?: string;
};

export default function IconButton({
  label,
  children,
  variant = "outline",
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      className={cx(
        "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-none text-base leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-25",
        VARIANTS[variant],
        className,
      )}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
