import Micro from "./Micro";
import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * What a list says when it has nothing to show, and what a screen says while
 * it waits for its data.
 *
 * Two variants, from five hand-written spellings. `slot` fills the place a list
 * would have occupied and keeps the rule that closes it; `page` is a whole
 * screen still loading, centred and quiet — genuinely a different case, not
 * drift.
 *
 * Sets no margin: the strip above it already draws the rule that separates it.
 */
type Props = {
  children: ReactNode;
  variant?: "slot" | "page";
  className?: string;
};

export default function EmptyState({
  children,
  variant = "slot",
  className,
}: Props) {
  if (variant === "page") {
    return (
      <Micro as="p" tone="muted" className={cx("py-24 text-center", className)}>
        {children}
      </Micro>
    );
  }
  return (
    <p
      className={cx(
        "text-cp-muted border-cp-border border-b py-10 text-sm",
        className,
      )}
    >
      {children}
    </p>
  );
}
