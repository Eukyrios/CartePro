import Link from "next/link";
import PartnerPhoto from "./PartnerPhoto";
import { cx } from "./cx";
import type { Partner } from "@/components/data/partners";
import type { ReactNode } from "react";

/**
 * A partner, as something you can click to go and pay them.
 *
 * The link wrapper was byte-identical in the catalogue and in the Minister's
 * selection; only what sits under the photograph differed — the category and
 * the full address in one, the Minister's own words in the other — so that
 * stays with the caller as `children`.
 *
 * A real link, so it opens in a new tab, is shareable, and the keyboard reaches
 * it. `onClick` exists for the one caller that has to cancel a click: inside a
 * row you can drag, a gesture that happens to end on a tile is a swipe and not
 * a choice of partner.
 */
export default function PartnerTile({
  partner,
  children,
  href,
  withName = true,
  onClick,
  tabIndex,
  className,
  photoClassName,
  nameClassName,
}: {
  partner: Partner;
  children: ReactNode;
  /** Defaults to that partner's payment page. */
  href?: string;
  withName?: boolean;
  /**
   * The photograph's frame, when a caller needs another shape than the row's
   * 4/3 — a lone featured tile is taller than one of twelve in a grid.
   */
  photoClassName?: string;
  /** The name laid over it, likewise. */
  nameClassName?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  /** -1 on the decorative copies of a looping row. */
  tabIndex?: number;
  className?: string;
}) {
  return (
    <Link
      href={href ?? `/espace/partenaire/${partner.id}`}
      onClick={onClick}
      tabIndex={tabIndex}
      className={cx(
        "border-cp-border group hover:border-cp-fg focus-visible:outline-cp-accent flex h-full w-full cursor-pointer flex-col overflow-hidden border text-left focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
    >
      <PartnerPhoto
        partner={partner}
        withName={withName}
        className={photoClassName}
        nameClassName={nameClassName}
      />
      {children}
    </Link>
  );
}
