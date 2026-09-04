import Link from "next/link";
import { Arrow } from "@/components/brand/Marks";
import { cx } from "./cx";
import { BTN_DANGER, BTN_OUTLINE, BTN_SOLID } from "./surfaces";
import type { ComponentProps, ReactNode } from "react";

/**
 * The three buttons this design has, and no fourth.
 *
 * `solid` is the one committing action of a panel, filled with the foreground
 * ink and never with the institutional blue — the charter reserves #1B3A6B for
 * identity and text, so no button may be a field of it. `outline` is everything
 * secondary. `danger` is destruction.
 *
 * `href` turns it into a link without changing a pixel: the same face has to
 * serve "Créer un compte" (a route) and "Enregistrer" (a submit), and the
 * `group` in the base is what lets `arrow` slide on hover.
 */
const VARIANTS = {
  solid: BTN_SOLID,
  outline: BTN_OUTLINE,
  danger: BTN_DANGER,
} as const;

type Common = {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  /** The little diagonal arrow that slides out on hover. */
  arrow?: boolean;
  /** Additive only — this component owns the border, the face and the type. */
  className?: string;
};

type Props = Common &
  (
    | ({ href: string } & Omit<
        ComponentProps<typeof Link>,
        "href" | "className"
      >)
    | ({ href?: undefined } & Omit<ComponentProps<"button">, "className">)
  );

export default function Button({
  children,
  variant = "outline",
  arrow = false,
  className,
  ...rest
}: Props) {
  const face = cx(VARIANTS[variant], className);
  const body = (
    <>
      {children}
      {arrow && <Arrow />}
    </>
  );

  if (rest.href !== undefined) {
    const { href, ...linkProps } = rest;
    return (
      <Link {...linkProps} href={href} className={face}>
        {body}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = rest as ComponentProps<"button">;
  return (
    <button {...buttonProps} type={type} className={face}>
      {body}
    </button>
  );
}
