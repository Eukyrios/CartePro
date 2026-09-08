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
 *
 * Les trois y sont désormais, agent de l'administration compris. Ils n'y
 * étaient pas tant que la connexion se faisait par deux onglets, « Employés »
 * et « Partenaires » : il n'y avait pas d'onglet où poser le troisième. Le
 * formulaire de connexion n'en a plus qu'un seul, et la liste peut dire ce qui
 * existe vraiment.
 */

/** À quoi sert le compte, une fois entré. */
export type DemoRole = "employee" | "partner" | "admin";

export type DemoAccount = {
  role: DemoRole;
  /** Comment le compte est annoncé dans le dialogue de connexion. */
  label: string;
  /** Ce qu'on voit en entrant avec lui, en quelques mots. */
  hint: string;
  email: string;
  /** Le même pour tous les comptes semés : une seule chose à retenir. */
  password: string;
};

/** Le mot de passe commun, tel que `backend/seed.py` le pose. */
export const DEMO_PASSWORD = "CartePro2026";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "employee",
    label: "Salarié",
    hint: "Un crédit à dépenser, le réseau, l’historique",
    email: "camille.durand@administration.example",
    password: DEMO_PASSWORD,
  },
  {
    role: "partner",
    label: "Partenaire conventionné",
    hint: "Encaisser, le réseau, les recettes",
    email: "contact@comptoir-du-midi.fr",
    password: DEMO_PASSWORD,
  },
  {
    role: "admin",
    label: "Agent de l’administration",
    hint: "Instruire les dossiers, voir les conventionnés",
    email: "admin@administration.example",
    password: DEMO_PASSWORD,
  },
];
