"use client";

import FieldGrid from "@/components/ui/FieldGrid";
import TextField from "@/components/ui/TextField";
import type { ReactNode } from "react";

/**
 * Ce qu'un salarié déclare : son nom d'utilisateur et son email.
 *
 * Deux champs, mais ils étaient saisis deux fois eux aussi — en Flowbite dans
 * les paramètres, en champs maison à l'inscription — avec la même indication
 * « Sert d'identifiant de connexion. » recopiée de part et d'autre.
 */
export default function EmployeeIdentityFields({
  username,
  email,
  onUsernameChange,
  onEmailChange,
  idPrefix = "",
  children,
  className,
}: {
  username: string;
  email: string;
  onUsernameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  idPrefix?: string;
  /** Marge extérieure : la grille n'en pose aucune elle-même. */
  className?: string;
  /** Le mot de passe, à l'inscription seulement. */
  children?: ReactNode;
}) {
  return (
    <FieldGrid className={className}>
      <TextField
        id={`${idPrefix}username`}
        label="Nom d'utilisateur"
        value={username}
        onChange={onUsernameChange}
        placeholder="ton nom d'utilisateur"
        required
      />

      {/* Uniqueness is enforced by the backend: it doubles as the login id. */}
      <TextField
        id={`${idPrefix}email`}
        type="email"
        label="Adresse email"
        value={email}
        onChange={onEmailChange}
        hint="Sert d'identifiant de connexion."
        placeholder="exemple@entreprise.fr"
        required
      />

      {children}
    </FieldGrid>
  );
}
