import { cx } from "./cx";
import { DISPLAY } from "./surfaces";
import type { ReactNode } from "react";

/**
 * A display heading: the heavy sans line, and the accent line in the serif.
 *
 * The two-part shape is the design's signature — "Dépenser / *autrement.*",
 * "Payer chez / *Poney Dream 78.*", "Le réseau*.*" — and it was written by hand
 * twelve times, eleven with an `<em>` and once with a `<span>` carrying the
 * same classes. It is an `<em>`: the accent line is where the sentence turns.
 *
 * Sets no margin. Every caller wants a different one, and a component that sets
 * one cannot be overridden by a class (see cx.ts), so the caller owns it.
 */
type Props = {
  /** The heading level the document needs. Never inferred from the scale. */
  level: 1 | 2 | 3;
  scale?: keyof typeof DISPLAY;
  children: ReactNode;
  /** The serif accent. Often the second line; sometimes only the full stop. */
  accent?: ReactNode;
  /** False when the accent continues the same line — a trailing full stop. */
  br?: boolean;
  id?: string;
  /** Additive only — this component owns size, leading, tracking and weight. */
  className?: string;
};

export default function Display({
  level,
  scale = "section",
  children,
  accent,
  br = true,
  id,
  className,
}: Props) {
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  return (
    <Tag id={id} className={cx(DISPLAY[scale], "font-black", className)}>
      {children}
      {accent !== undefined && (
        <>
          {br && <br />}
          <em className="text-cp-accent font-serif font-normal">{accent}</em>
        </>
      )}
    </Tag>
  );
}
