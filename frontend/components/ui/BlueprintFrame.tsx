import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * A square frame ruled like graph paper, holding one object at its centre.
 *
 * The pattern is `.blueprint-grid` from globals.css, which mixes its rules from
 * the palette — the version this replaces had the two rgba() pairs written out
 * inline, one per theme, so the frame no longer followed the tokens it was
 * drawn from. It also carried the only rounded corner in an otherwise square
 * design, and that is gone: the frame is the place, not the object.
 */
export default function BlueprintFrame({
  children,
  pitch = "coarse",
  className,
}: {
  children?: ReactNode;
  /** "fine" for a frame around a single object, "coarse" behind a panel. */
  pitch?: "coarse" | "fine";
  /** Additive only — this component owns the border, the field and the ratio. */
  className?: string;
}) {
  return (
    <div
      className={cx(
        "blueprint-grid border-cp-border bg-cp-page relative grid aspect-square w-full place-items-center overflow-hidden border",
        pitch === "fine" && "blueprint-grid--fine",
        className,
      )}
    >
      {children}
    </div>
  );
}
