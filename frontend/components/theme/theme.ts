"use client";

import { api } from "@/lib/api";

/**
 * L'identité visuelle, servie par le back.
 *
 * Elle vit dans `backend/theme.json` : on ouvre le fichier, on change une
 * couleur, on recharge la page. Rien à recompiler.
 *
 * Ce que le front compile dans `globals.css` reste la référence — le thème
 * **surcharge**, il ne remplace pas. Une clé absente laisse la valeur du CSS,
 * et un serveur muet laisse le site exactement tel qu'il est livré. Une
 * identité visuelle ne doit pas pouvoir empêcher l'affichage.
 */
export type ThemeColors = {
  page?: string;
  surface?: string;
  border?: string;
  fg?: string;
  muted?: string;
  ink?: string;
  accent?: string;
  official?: string;
  positive?: string;
  alert?: string;
};

export type Theme = {
  brand: { name?: string; logo?: string; logoWhite?: string };
  fonts: { sans?: string; serif?: string };
  colors: { light: ThemeColors; dark: ThemeColors };
};

export const THEME_VIDE: Theme = {
  brand: {},
  fonts: {},
  colors: { light: {}, dark: {} },
};

export async function getTheme(): Promise<Theme> {
  const data = await api<Theme>("/api/theme");
  return {
    brand: data.brand ?? {},
    fonts: data.fonts ?? {},
    colors: { light: data.colors?.light ?? {}, dark: data.colors?.dark ?? {} },
  };
}

/**
 * Le thème en CSS : une règle pour le clair, une pour le sombre.
 *
 * Les noms visés sont ceux que `globals.css` déclare dans `@theme inline` —
 * `--cp-accent` et compagnie. Tailwind y fait pointer ses utilitaires, donc
 * changer la variable suffit : chaque `bg-cp-accent` du site suit, sans qu'une
 * classe ait à être régénérée. C'est aussi pourquoi le thème ne peut pas
 * inventer un token : il n'existerait dans aucune classe.
 *
 * Le sélecteur du sombre est `.dark`, comme le variant déclaré en tête de
 * `globals.css`. Les deux blocs sont écrits même si l'un est vide : une règle
 * vide ne coûte rien et le code reste lisible.
 */
export function themeToCss(theme: Theme): string {
  const bloc = (couleurs: ThemeColors, polices: Theme["fonts"]) =>
    [
      ...Object.entries(couleurs).map(
        ([nom, valeur]) => `--cp-${nom}: ${valeur};`,
      ),
      polices.sans ? `--font-sans: ${polices.sans};` : "",
      polices.serif ? `--font-serif: ${polices.serif};` : "",
    ]
      .filter(Boolean)
      .join("");

  /* Les polices ne sont posées qu'une fois, sur :root — une famille ne dépend
     pas du thème clair ou sombre, et la répéter inviterait à les désaccorder. */
  const clair = bloc(theme.colors.light, theme.fonts);
  const sombre = bloc(theme.colors.dark, {});
  /* Chaîne vide quand le thème n'a rien à dire : l'appelant retire alors la
     feuille au lieu d'en poser une qui ne ferait rien. */
  if (!clair && !sombre) return "";
  return `${clair ? `:root{${clair}}` : ""}${sombre ? `.dark{${sombre}}` : ""}`;
}

/**
 * Enregistre l'identité visuelle. **Réservé à l'administration.**
 *
 * Rend le thème relu par le serveur, et non celui qu'on vient d'envoyer : le
 * fichier est la source, et il nettoie — une clé qu'il ne connaît pas est
 * ignorée. L'écran affiche donc ce que le site servira, pas ce qu'il espérait.
 *
 * Ce qui est refusé remonte tel quel : `api` lève avec le message du serveur,
 * qui nomme la clé fautive — « colors.light.accent : un hexadécimal comme
 * #4a1b6b est attendu ». Rien n'est écrit si une seule valeur est refusée,
 * donc un thème à moitié appliqué n'existe pas.
 */
export async function saveTheme(theme: Theme): Promise<Theme> {
  const data = await api<Theme>("/api/theme", {
    method: "PUT",
    body: JSON.stringify(theme),
  });
  return {
    brand: data.brand ?? {},
    fonts: data.fonts ?? {},
    colors: { light: data.colors?.light ?? {}, dark: data.colors?.dark ?? {} },
  };
}
