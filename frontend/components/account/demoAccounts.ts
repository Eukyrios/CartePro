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

/**
 * Les identifiants de démonstration s'affichent-ils sous le formulaire ?
 *
 * Le dialogue de connexion propose trois comptes prêts à l'emploi, avec leur
 * adresse et le mot de passe commun en clair. C'est précieux pour montrer le
 * dispositif et insupportable en production : une page publique qui affiche des
 * identifiants valides est une porte ouverte, même sur une démonstration — le
 * jeu de données est faux, mais l'espace d'administration qu'on ouvre avec est
 * le vrai.
 *
 * La règle est **fermé par défaut là où ça compte** :
 *
 * — `npm run dev` : affichés. C'est le moment où l'on veut cliquer plutôt que
 *   taper.
 * — `npm run build` puis `npm start`, et tout déploiement — Vercel compris :
 *   masqués, sans que personne ait à s'en souvenir. C'est le point : une
 *   variable qu'il faut penser à poser est une variable qu'on oublie, et
 *   l'oubli publie des identifiants. `make prod` ne fait donc rien de spécial.
 * — `NEXT_PUBLIC_COMPTES_DEMO=1` : réaffichés, y compris en production, pour
 *   une démonstration hébergée qu'on veut cliquable. C'est alors un choix
 *   explicite, écrit dans la configuration du déploiement — voir `make
 *   prod-demo`.
 * — `NEXT_PUBLIC_COMPTES_DEMO=0` : masqués même en développement, pour voir
 *   l'écran tel que le public l'aura.
 *
 * **L'expression est écrite ici, en clair, et non importée d'un module à
 * part.** C'est ce qui fait la différence entre masquer et retirer : le
 * compilateur remplace `process.env.NODE_ENV` et les `NEXT_PUBLIC_*` par leur
 * valeur, donc la condition devient `false` littéral, et le tableau de la
 * branche morte est éliminé du paquet. Passée par un module voisin, la
 * constante n'était plus reconnue comme constante à cet endroit : le bloc
 * disparaissait de l'écran, mais les trois adresses et le mot de passe
 * restaient lisibles dans les sources du navigateur. Mesuré : quatre fichiers
 * de `.next/static` les contenaient encore.
 */
export const COMPTES_DEMO_VISIBLES =
  process.env.NEXT_PUBLIC_COMPTES_DEMO === "1" ||
  (process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_COMPTES_DEMO !== "0");

/**
 * Le mot de passe commun, tel que `backend/seed.py` le pose.
 *
 * Derrière le drapeau comme la liste : une construction de production ne doit
 * pas seulement masquer le bloc à l'écran, elle ne doit pas **contenir** ces
 * chaînes. Masqué mais présent dans le paquet, un identifiant se lit encore
 * dans les sources du navigateur.
 */
const DEMO_PASSWORD = COMPTES_DEMO_VISIBLES ? "CartePro2026" : "";

/**
 * Les comptes offerts sous le formulaire — ou rien du tout.
 *
 * Vide dès que `COMPTES_DEMO_VISIBLES` est faux, c'est-à-dire dans toute
 * construction de production : la condition est une constante à la
 * compilation, donc le tableau littéral est éliminé et les adresses ne se
 * retrouvent pas dans le paquet livré. Vérifié en cherchant les chaînes dans
 * `.next/static` après `npm run build`.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = !COMPTES_DEMO_VISIBLES
  ? []
  : [
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
