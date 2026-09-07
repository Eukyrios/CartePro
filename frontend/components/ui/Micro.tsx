import { cx } from "./cx";
import { MICRO } from "./surfaces";
import type { ComponentProps, ElementType } from "react";

/**
 * Uppercase micro-type: eyebrows, rail entries, counts, captions, table heads.
 *
 * The design's smallest voice, and the one that had drifted furthest — it was
 * hand-written in seventeen places with five different tracking values, one of
 * them `font-extrabold` (a no-op: the single Archivo Bold file is mapped to
 * 700–900) and several missing `font-sans`, which silently fell back to the
 * serif in any element that inherits it.
 *
 * `MICRO` stays exported from surfaces.ts on purpose: where the element belongs
 * to somebody else — a Flowbite theme *string*, a `<th>`, a button face — a
 * component cannot go, but the class can.
 */
const TONES = {
  fg: "text-cp-fg",
  muted: "text-cp-muted",
  accent: "text-cp-accent",
  official: "text-cp-official",
  /** Takes the colour of whatever contains it: buttons, coloured panels. */
  inherit: "",
} as const;

type Props = ComponentProps<"span"> & {
  /** Any element: `p` for a standalone line, `th` in a table, `dt` in a list. */
  as?: ElementType;
  tone?: keyof typeof TONES;
  /** Additive only — this component owns family, size, weight and tracking. */
  className?: string;
};

export default function Micro({
  as: Tag = "span",
  tone = "fg",
  className,
  ...rest
}: Props) {
  return <Tag {...rest} className={cx(MICRO, TONES[tone], className)} />;
}
