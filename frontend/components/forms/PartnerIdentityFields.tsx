"use client";

import { partnerCategories } from "@/components/data/partnerCategories";
import FieldGrid from "@/components/ui/FieldGrid";
import SelectField from "@/components/ui/SelectField";
import TextField from "@/components/ui/TextField";
import { digits } from "./partnerFields";
import type { PartnerErrors, PartnerFields } from "./partnerFields";
import type { ReactNode } from "react";

/**
 * Ce qu'un partenaire déclare : neuf champs, dans l'ordre du cahier des
 * charges — raison sociale, SIREN, objet social, catégorie, adresse, ville,
 * code postal, email de contact, nom du représentant.
 *
 * Ils étaient saisis **deux fois** : à l'inscription avec les champs maison,
 * carrés, et dans les paramètres avec ceux de Flowbite, arrondis et gris. Les
 * mêmes libellés, les mêmes placeholders, le même commentaire sur l'unicité de
 * l'email — et deux langages visuels dans la même application.
 *
 * Contrôlé de bout en bout, et il ne soumet rien : l'inscription poste sur
 * /api/auth/register, les paramètres sur /api/auth/profile, et ce qui les sépare
 * n'a rien à voir avec la saisie. Le mot de passe de l'inscription arrive par
 * `children`, dans la dernière case de la grille — une prop `variant` aurait
 * appris à ce composant de quel écran il vient.
 *
 * Pas de `pattern` sur le SIREN ni sur le code postal, délibérément : la
 * validation passe par `validatePartnerFields`, en français, dans la voix du
 * design. Deux canaux d'erreur — l'infobulle du navigateur et notre message —
 * pour un même champ, c'est un de trop.
 */
type Props = {
  partner: PartnerFields;
  /** L'email vit sur le compte, pas dans la fiche partenaire. */
  email: string;
  errors: PartnerErrors;
  onPartnerChange: <K extends keyof PartnerFields>(
    field: K,
    value: PartnerFields[K],
  ) => void;
  onEmailChange: (value: string) => void;
  /**
   * Préfixe des identifiants de champ. Les deux formulaires peuvent être dans
   * le même document, donc leurs `id` ne doivent pas se heurter.
   */
  idPrefix?: string;
  /** Marge extérieure : la grille n'en pose aucune elle-même. */
  className?: string;
  /** La dernière case : le mot de passe, à l'inscription seulement. */
  children?: ReactNode;
};

export default function PartnerIdentityFields({
  partner,
  email,
  errors,
  onPartnerChange,
  onEmailChange,
  idPrefix = "",
  children,
  className,
}: Props) {
  const id = (name: string) => `${idPrefix}${name}`;

  return (
    <FieldGrid className={className}>
      <TextField
        id={id("raisonSociale")}
        label="Raison sociale"
        value={partner.raisonSociale}
        onChange={(value) => onPartnerChange("raisonSociale", value)}
        placeholder="Nom de l'établissement"
        required
      />

      <TextField
        id={id("siren")}
        label="SIREN"
        value={partner.siren}
        onChange={(value) => onPartnerChange("siren", value)}
        sanitise={digits(9)}
        error={errors.siren}
        inputMode="numeric"
        maxLength={9}
        placeholder="9 chiffres"
        required
      />

      <TextField
        id={id("objetSocial")}
        label="Objet social"
        value={partner.objetSocial}
        onChange={(value) => onPartnerChange("objetSocial", value)}
        placeholder="Texte libre ou code APE"
        required
      />

      <SelectField
        id={id("categorie")}
        label="Catégorie"
        value={partner.categorie}
        onChange={(value) => onPartnerChange("categorie", value)}
        options={partnerCategories().map((entry) => ({
          value: entry.id,
          label: entry.label,
        }))}
        emptyLabel="Aucune catégorie disponible"
        placeholder="Sélectionner une catégorie"
        required
      />

      <TextField
        id={id("adresse")}
        label="Adresse"
        value={partner.adresse}
        onChange={(value) => onPartnerChange("adresse", value)}
        placeholder="12 rue des Bains"
        required
      />

      <TextField
        id={id("ville")}
        label="Ville"
        value={partner.ville}
        onChange={(value) => onPartnerChange("ville", value)}
        placeholder="Royan"
        required
      />

      <TextField
        id={id("codePostal")}
        label="Code postal"
        value={partner.codePostal}
        onChange={(value) => onPartnerChange("codePostal", value)}
        sanitise={digits(5)}
        error={errors.codePostal}
        inputMode="numeric"
        maxLength={5}
        placeholder="17200"
        required
      />

      {/* Uniqueness is enforced by the backend: it doubles as the login id. */}
      <TextField
        id={id("email")}
        type="email"
        label="Email de contact"
        value={email}
        onChange={onEmailChange}
        hint="Sert d'identifiant de connexion."
        placeholder="contact@entreprise.fr"
        required
      />

      <TextField
        id={id("nomRepresentant")}
        label="Nom du représentant"
        value={partner.nomRepresentant}
        onChange={(value) => onPartnerChange("nomRepresentant", value)}
        placeholder="Prénom et nom"
        required
      />

      {children}
    </FieldGrid>
  );
}
