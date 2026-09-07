import { cx } from "./cx";
import { CHIP_MUTED, CHIP_OFFICIAL, CHIP_PLAIN } from "./surfaces";
import type { ElementType, ReactNode } from "react";

/**
 * An outlined chip. The ochre one marks what the ministry vouches for.
 *
 * One size, deliberately. The same words — "Partenaire Officiel de l'administration" —
 * were rendered at 9px in the settings panel and at 15px with a 2px border and
 * a fixed 17rem width on the payment page, which reads as two different claims
 * about how official something is. A caller who needs the chip to sit at the
 * top of a stretched column passes `self-start`, not a bigger badge.
 */
/**
 * Trois teintes, et pas une quatrième.
 *
 * `official` — l'ochre — marque ce dont l'administration se porte garant. `plain`
 * est le fait neutre. `muted` est pour ce qui n'est ni l'un ni l'autre : un
 * constat en retrait, qu'on lit si on le cherche — « fiche de démonstration »
 * ne réclame pas la même attention qu'un conventionnement.
 */
const TONES = {
  plain: CHIP_PLAIN,
  official: CHIP_OFFICIAL,
  muted: CHIP_MUTED,
} as const;

type Props = {
  children: ReactNode;
  tone?: keyof typeof TONES;
  as?: ElementType;
  /** Additive only — this component owns the border, the type and the padding. */
  className?: string;
};

export default function Chip({
  children,
  tone = "plain",
  as: Tag = "span",
  className,
}: Props) {
  return <Tag className={cx(TONES[tone], className)}>{children}</Tag>;
}
