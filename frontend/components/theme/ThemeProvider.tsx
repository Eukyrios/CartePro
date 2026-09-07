"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { THEME_VIDE, getTheme, themeToCss, type Theme } from "./theme";
import type { ReactNode } from "react";

const Contexte = createContext<Theme>(THEME_VIDE);

/**
 * De quoi remplacer le thème appliqué, sans recharger la page.
 *
 * Dans un contexte à part et non dans `Contexte` : `useTheme()` rend un `Theme`
 * et une quinzaine d'appels le déstructurent (`const { brand } = useTheme()`).
 * Y glisser une fonction aurait demandé de tous les réécrire pour le seul écran
 * qui enregistre.
 *
 * Le défaut ne fait rien : hors du fournisseur, il n'y a pas de feuille à
 * refaire.
 */
const Remplacer = createContext<(theme: Theme) => void>(() => undefined);

/** L'identifiant de la feuille posée par ce composant, pour la retrouver. */
const ID = "theme-du-serveur";

/**
 * Applique l'identité visuelle servie par le back, et la met à disposition.
 *
 * Le CSS est posé dans une feuille `<style>` du document, et non écrit
 * propriété par propriété sur `documentElement` : une feuille porte les deux
 * thèmes d'un coup — `:root` et `.dark` — donc la bascule clair / sombre
 * continue de fonctionner sans qu'on ait à réappliquer quoi que ce soit.
 *
 * Elle est écrite par `textContent`, jamais par `innerHTML` ni par
 * `dangerouslySetInnerHTML`. Le thème vient d'un fichier du serveur, donc de
 * l'exploitant et non d'un visiteur — mais une chaîne qui traverse le réseau
 * pour devenir du CSS ne mérite pas qu'on lui ouvre l'analyseur HTML, et
 * `textContent` ferme la question au lieu de la peser.
 *
 * Il n'y a pas de scintillement au chargement tant que `theme.json` dit la même
 * chose que `globals.css`, ce qui est le cas à la livraison. S'ils divergent,
 * la première image est celle du CSS compilé, puis le thème du serveur prend le
 * dessus — c'est le prix d'une identité modifiable sans recompiler, et il n'est
 * payé que par celui qui la modifie.
 *
 * Un serveur muet ne change rien : la requête échoue, le thème reste vide, et
 * le site s'affiche tel qu'il est livré.
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(THEME_VIDE);

  useEffect(() => {
    let cancelled = false;
    getTheme()
      .then((recu) => !cancelled && setTheme(recu))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const css = themeToCss(theme);
    let feuille = document.getElementById(ID) as HTMLStyleElement | null;
    if (!css) {
      feuille?.remove();
      return;
    }
    if (!feuille) {
      feuille = document.createElement("style");
      feuille.id = ID;
      document.head.append(feuille);
    }
    feuille.textContent = css;
  }, [theme]);

  return (
    <Contexte.Provider value={theme}>
      <Remplacer.Provider value={setTheme}>{children}</Remplacer.Provider>
    </Contexte.Provider>
  );
}

/** L'identité visuelle courante — le nom de marque et les chemins de logotype. */
export function useTheme(): Theme {
  return useContext(Contexte);
}

/**
 * Applique un thème que l'on vient d'enregistrer.
 *
 * L'écran de style s'en sert pour que la page prenne les nouvelles couleurs à
 * l'instant où le serveur les accepte : la feuille est réécrite par l'effet
 * ci-dessus, donc le site change sous les yeux de celui qui vient de le
 * changer. Sans cela il fallait recharger pour voir son propre enregistrement,
 * et l'écran ne valait pas mieux que l'éditeur de texte qu'il remplace.
 */
export function useApplyTheme(): (theme: Theme) => void {
  return useContext(Remplacer);
}
