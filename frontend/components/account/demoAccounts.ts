import type { AuthAudience } from "@/components/auth/AuthModal";

/**
 * Les comptes de démonstration proposés sous le formulaire de connexion, pour
 * qu'on puisse ouvrir l'application et la montrer sans rien créer.
 *
 * **Ce sont ceux que `make seed` écrit en base** — voir `backend/seed.py`, qui
 * les imprime aussi à la fin de son exécution. C'était de fausses identités
 * inventées ici, du temps où la connexion se jouait dans le navigateur : elles
 * n'ont jamais existé côté serveur, si bien que le bouton « Remplir ces
 * identifiants » remplissait des identifiants systématiquement refusés.
 *
 * Ces deux listes doivent donc bouger ensemble. Si le seed change un email ou
 * le mot de passe, ce fichier le suit — sinon le raccourci ment de nouveau.
 */
export type DemoAccount = {
  audience: AuthAudience;
  /** Comment le compte est annoncé dans le dialogue de connexion. */
  label: string;
  email: string;
  /** Le même pour tous les comptes semés : une seule chose à retenir. */
  password: string;
};

/** Le mot de passe commun, tel que `backend/seed.py` le pose. */
export const DEMO_PASSWORD = "CartePro2026";

/** Dans l'ordre des onglets, pour que le dialogue puisse choisir par audience. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    audience: "employee",
    label: "Compte salarié de démonstration",
    email: "camille.durand@administration.example",
    password: DEMO_PASSWORD,
  },
  {
    audience: "partner",
    label: "Compte partenaire de démonstration",
    email: "contact@poney-dream-78.fr",
    password: DEMO_PASSWORD,
  },
];

export function demoAccountFor(audience: AuthAudience) {
  return DEMO_ACCOUNTS.find((account) => account.audience === audience);
}
