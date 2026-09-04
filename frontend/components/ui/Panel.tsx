import { cx } from "./cx";
import { PANEL_BOX, PANEL_LEAD } from "./surfaces";
import type { ElementType, ReactNode } from "react";

/**
 * The flat bordered box that holds one block of a screen: 2px of foreground ink
 * around a page-coloured field, square, no shadow.
 *
 * `padding="none"` exists because the step deck needs `p-9 sm:p-12 lg:p-14` and
 * a class cannot override the base's padding (see cx.ts) — so the box is
 * available without any, and the caller supplies its own.
 */
type Props = {
  children: ReactNode;
  as?: ElementType;
  padding?: "normal" | "none";
  /** Additive only — this component owns the border and the background. */
  className?: string;
};

export default function Panel({
  children,
  as: Tag = "div",
  padding = "normal",
  className,
}: Props) {
  return (
    <Tag
      className={cx(PANEL_BOX, padding === "normal" && "p-6 sm:p-8", className)}
    >
      {children}
    </Tag>
  );
}

/** The muted line under a panel heading, capped at a readable measure. */
function Lead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cx(PANEL_LEAD, className)}>{children}</p>;
}

Panel.Lead = Lead;
