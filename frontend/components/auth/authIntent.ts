/**
 * Ouvrir le dialogue de connexion depuis n'importe où.
 *
 * Le dialogue appartient à `TopBar`, qui en tient l'état — et `TopBar` vit dans
 * le châssis, au-dessus de l'arbre des pages. Un écran qui veut y envoyer
 * quelqu'un (la carte barrée de l'accueil) n'a donc aucun chemin de props pour
 * l'atteindre. Plutôt que de hisser tout l'état d'authentification dans un
 * contexte pour un seul bouton, on passe par un événement de fenêtre : une
 * intention, émise ici, écoutée là-bas.
 *
 * Le nom de l'événement est préfixé, et il ne sort jamais de ce fichier : les
 * deux extrémités passent par ces fonctions, donc une faute de frappe dans la
 * chaîne est impossible ailleurs.
 */
import type { AuthMode } from "./AuthModal";

const EVENT = "ticket-tout:auth";

/** Demande l'ouverture du dialogue. Sans effet côté serveur, où il n'y en a pas. */
export function openAuth(mode: AuthMode = "login") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AuthMode>(EVENT, { detail: mode }));
}

/** S'abonne aux intentions. Rend son désabonnement, pour `useEffect`. */
export function onAuthIntent(handler: (mode: AuthMode) => void) {
  const listener = (event: Event) =>
    handler((event as CustomEvent<AuthMode>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
