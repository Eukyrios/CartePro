import type { AuthAudience } from "@/components/auth/AuthModal";
import type { Profile } from "./AccountProvider";

/**
 * Demonstration accounts shipped in the build's starting data: one per type of
 * user, filled in as if the person had been using CartePro for a while, so the
 * app can be opened and shown without registering anything first.
 *
 * The type is imported for its shape only, so this module stays plain data with
 * no runtime dependency on the provider that reads it.
 */
export type DemoAccount = {
  /** How the account is announced in the sign-in dialog. */
  label: string;
  /** Same password for both, so there is only one thing to remember. */
  password: string;
  profile: Profile;
};

/** One password for every demo account. */
export const DEMO_PASSWORD = "Demo1234!";

/**
 * The employé: a complete card style, since customising the card is what an
 * employé's private space is for.
 */
const EMPLOYEE: DemoAccount = {
  label: "Compte employé de démonstration",
  password: DEMO_PASSWORD,
  profile: {
    audience: "employee",
    username: "Camille Fontaine",
    email: "employe@cartepro.fr",
    /* An employé has no establishment behind them, so the partner block stays
       empty — the settings page only renders the fields of its own audience. */
    partner: {
      raisonSociale: "",
      siren: "",
      objetSocial: "",
      categorie: "",
      adresse: "",
      ville: "",
      codePostal: "",
      nomRepresentant: "",
    },
    cardStyle: {
      color: "#1b3a6b",
      text: "#ffffff",
      pattern: "waves",
      metalness: 45,
    },
  },
};

/**
 * The partenaire: every registration field filled, including a SIREN that
 * passes the Luhn check in isValidSiren and a five-digit code postal, so the
 * settings form validates as-is instead of opening on errors.
 */
const PARTNER: DemoAccount = {
  label: "Compte partenaire de démonstration",
  password: DEMO_PASSWORD,
  profile: {
    audience: "partner",
    username: "Chapelier Fontaine",
    email: "partenaire@cartepro.fr",
    partner: {
      raisonSociale: "Chapelier Fontaine",
      siren: "404833048",
      objetSocial: "Chapellerie artisanale et accessoires de costume",
      categorie: "Culture",
      adresse: "18 rue des Petits-Carreaux",
      ville: "Paris",
      codePostal: "75002",
      nomRepresentant: "Élise Chapelier",
    },
    cardStyle: {
      color: "#0a0a0b",
      text: "#ffffff",
      pattern: "grid",
      metalness: 15,
    },
  },
};

/** In tab order, so the sign-in dialog can pick by audience. */
export const DEMO_ACCOUNTS: DemoAccount[] = [EMPLOYEE, PARTNER];

export function demoAccountFor(audience: AuthAudience) {
  return DEMO_ACCOUNTS.find(
    (account) => account.profile.audience === audience,
  ) as DemoAccount;
}

/**
 * The demo account these credentials sign into, if any. Email is matched
 * case-insensitively — a tablet keyboard capitalises the first letter.
 */
export function findDemoAccount(email: string, password: string) {
  const wanted = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find(
    (account) =>
      account.profile.email.toLowerCase() === wanted &&
      account.password === password,
  );
}
