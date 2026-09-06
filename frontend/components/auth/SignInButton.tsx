"use client";

import Button from "@/components/ui/Button";
import { openAuth } from "./authIntent";
import type { AuthMode } from "./AuthModal";
import type { ComponentProps, ReactNode } from "react";

/**
 * Un bouton qui ouvre le dialogue de connexion, où qu'il se trouve.
 *
 * Il existe pour que les écrans qui l'appellent restent rendus sur le serveur :
 * seul ce bouton est un client, pas la section qui le contient. C'est le même
 * `Button` que partout ailleurs — il n'apporte que le geste.
 *
 * Les props reprises sont celles du bouton, une par une plutôt qu'en bloc : le
 * type de `Button` est une union « lien ou bouton », et l'étaler ici y ferait
 * entrer les attributs d'ancre que celui-ci ne peut pas être.
 */
export default function SignInButton({
  children,
  mode = "login",
  variant,
  arrow,
  className,
}: {
  children: ReactNode;
  /** "signup" pour un appel qui invite à créer un compte plutôt qu'à entrer. */
  mode?: AuthMode;
} & Pick<ComponentProps<typeof Button>, "variant" | "arrow" | "className">) {
  return (
    <Button
      variant={variant}
      arrow={arrow}
      className={className}
      onClick={() => openAuth(mode)}
    >
      {children}
    </Button>
  );
}
