import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * Who is signed in: the accent disc with their initial, their name, their
 * address.
 *
 * Two sizes, and both are kept. A 13rem dropdown row and a page-width identity
 * band are not the same context — one value would either bloat the menu or
 * shrink the band. One component with two sizes *is* the harmonisation; the
 * drift was that each place also picked its own type sizes and its own way of
 * cutting a long name.
 *
 * Split in three because the parts are not always adjacent: in the user menu
 * the disc is the button that opens the dropdown and the name sits inside it.
 */
const SIZES = {
  sm: {
    disc: "size-10 text-[15px]",
    name: "text-[13px]",
    email: "text-[11px]",
  },
  md: {
    disc: "size-11 text-[16px]",
    name: "text-[15px]",
    email: "text-[12px]",
  },
} as const;

type Size = keyof typeof SIZES;

/** The disc with the first letter of the name. Never a photograph. */
export function Avatar({
  name,
  size = "md",
  color,
  className,
}: {
  name: string;
  size?: Size;
  /**
   * L'aplat du disque. Absent, c'est l'accent de la marque.
   *
   * Le compte connecté passe sa propre couleur — celle de sa vignette, qu'il
   * choisit dans ses réglages — pour que le disque de la barre haute et la
   * vignette des listes soient le même objet. Les endroits qui nomment
   * quelqu'un d'autre que le compte connecté n'en ont pas et gardent l'accent.
   */
  color?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={color ? { backgroundColor: color } : undefined}
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full font-black text-white",
        // Sans couleur passée, l'accent de la marque : la classe reste, et une
        // couleur en ligne la recouvre quand il y en a une.
        !color && "bg-cp-accent",
        SIZES[size].disc,
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Name over address, both truncated: neither may push a layout open. */
export function NameEmail({
  name,
  email,
  size = "md",
}: {
  name: string;
  email: string;
  size?: Size;
}) {
  return (
    <div className="min-w-0">
      <div
        className={cx(
          "text-cp-fg truncate font-black tracking-[-0.03em]",
          SIZES[size].name,
        )}
      >
        {name}
      </div>
      <div className={cx("text-cp-muted truncate", SIZES[size].email)}>
        {email}
      </div>
    </div>
  );
}

/**
 * The full band: rules above and below rather than a floating card, so it reads
 * as part of the page's grid. `children` holds whatever chips belong to the
 * account.
 */
export default function IdentityStrip({
  name,
  email,
  children,
  className,
}: {
  name: string;
  email: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "border-t-cp-fg border-b-cp-border flex flex-wrap items-center gap-5 border-t-2 border-b py-5",
        className,
      )}
    >
      <Avatar name={name} />
      <NameEmail name={name} email={email} />
      {children}
    </div>
  );
}
