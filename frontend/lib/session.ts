/**
 * Où vit la session, et combien de temps.
 *
 * Le formulaire de connexion demande « Se souvenir de moi » depuis toujours, et
 * la case ne servait à rien : le jeton et le profil partaient dans
 * `localStorage` dans les deux cas, donc on restait connecté après avoir fermé
 * le navigateur, coché ou non. La case posait une question dont la réponse
 * était ignorée.
 *
 * Deux magasins, et c'est le navigateur qui fait le travail :
 *
 * — **coché** : `localStorage`. La session survit à la fermeture de l'onglet et
 *   du navigateur, jusqu'à une déconnexion explicite.
 * — **non coché** : `sessionStorage`. Le navigateur vide ce magasin quand
 *   l'onglet se ferme. Rien à programmer, aucun minuteur, aucun événement
 *   `beforeunload` — et surtout rien qui dépende de l'exécution d'un script au
 *   moment de la fermeture, moment où justement rien ne garantit qu'on tourne
 *   encore.
 *
 * Le prix du non-coché : la session est propre à l'onglet. Ouvrir un lien dans
 * un nouvel onglet demande de se reconnecter. C'est le comportement attendu de
 * « ne pas se souvenir de moi », pas un défaut.
 *
 * La lecture regarde les deux magasins, la session d'abord : c'est le plus
 * récent des deux, puisqu'une connexion écrit dans l'un **et efface l'autre**.
 * Sans cet effacement, se reconnecter sans cocher la case aurait laissé
 * derrière la session persistante de la fois précédente — celle qu'on venait
 * justement de refuser.
 *
 * Tous les accès sont enveloppés : en navigation privée, et sous une politique
 * qui interdit le stockage, le simple fait de lire `localStorage` lève. Perdre
 * la session vaut mieux que casser la page.
 */

function magasin(nom: "local" | "session"): Storage | null {
  try {
    return nom === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** La valeur, cherchée dans la session puis dans le persistant. */
export function lireSession(cle: string): string | null {
  for (const nom of ["session", "local"] as const) {
    try {
      const valeur = magasin(nom)?.getItem(cle);
      if (valeur !== null && valeur !== undefined) return valeur;
    } catch {
      /* Magasin inaccessible : on essaie l'autre. */
    }
  }
  return null;
}

/**
 * Écrit dans le magasin voulu, et efface l'autre.
 *
 * `persistant` décide : vrai pour `localStorage`, faux pour `sessionStorage`.
 */
export function ecrireSession(
  cle: string,
  valeur: string,
  persistant: boolean,
): void {
  const voulu = persistant ? "local" : "session";
  const autre = persistant ? "session" : "local";
  try {
    magasin(voulu)?.setItem(cle, valeur);
  } catch {
    /* Voir l'en-tête : une session perdue vaut mieux qu'une page cassée. */
  }
  try {
    magasin(autre)?.removeItem(cle);
  } catch {
    /* idem */
  }
}

/** Efface la clé des deux magasins. Une déconnexion ne laisse rien. */
export function effacerSession(cle: string): void {
  for (const nom of ["session", "local"] as const) {
    try {
      magasin(nom)?.removeItem(cle);
    } catch {
      /* idem */
    }
  }
}

/**
 * La session en cours est-elle persistante ?
 *
 * Lue de l'emplacement du jeton plutôt que d'un drapeau à part : le jeton est
 * la première chose écrite à la connexion, donc son magasin **est** la réponse,
 * et il ne peut pas se désynchroniser d'un booléen gardé à côté. Sert aux
 * écritures qui suivent la connexion — un profil rafraîchi, un style de carte
 * enregistré — pour qu'elles atterrissent là où vit la session et non dans
 * l'autre magasin.
 *
 * Par défaut persistant quand il n'y a pas de session : c'est ce que fait une
 * page ouverte sans être connecté, et le premier écrivain sera de toute façon
 * la connexion, qui tranche elle-même.
 */
export function sessionPersistante(cle: string): boolean {
  try {
    if (magasin("session")?.getItem(cle) !== null) return false;
  } catch {
    /* idem */
  }
  return true;
}
