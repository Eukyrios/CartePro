import path from "path";
import type { NextConfig } from "next";
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  /*
   * Ship a self-contained server, so CI can publish a bundle that runs with
   * `node server.js` and nothing to install — the whole point of the build
   * artifact. Its companion is outputFileTracingRoot below.
   */
  output: "standalone",

  /*
   * Pin the file-tracing root to this folder. Next otherwise walks up looking
   * for the workspace root and stops at the first package-lock.json it finds,
   * which on a machine with a stray lockfile in $HOME is the home directory:
   * the standalone bundle then traces the wrong tree, and even a plain build
   * fails while collecting page data.
   */
  outputFileTracingRoot: path.join(__dirname),

  // 👉 Ajout du proxy silencieux pour le backend Flask
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:5000/api/:path*",
      },
    ];
  },
};

/*
 * Le plugin Flowbite, dont on retire une seule chose : `optimizePackageImports`.
 *
 * `withFlowbiteReact` fait deux travaux sans rapport l'un avec l'autre. Il
 * génère `.flowbite-react/class-list.json`, dont dépend le style des
 * composants Flowbite — celui-là, on le garde. Et il ajoute
 * `"flowbite-react"` à l'expérience `experimental.optimizePackageImports`,
 * qui casse la construction de production.
 *
 * Le symptôme, mesuré : sous Node 22 — la version que la CI déclare —
 * `next build` compile, puis échoue au pré-rendu de la première page
 * statique sur « Could not find the module
 * components/theme/ThemeProvider.tsx#default in the React Client Manifest ».
 * Le message accuse le composant, à tort : la page nommée change selon
 * l'ordre d'export (`/_not-found`, ou `/espace` si l'on retire
 * `global-error.tsx`), et c'est la référence au module client qui n'arrive pas
 * dans le manifeste, pas le composant qui serait mal écrit. Bissection : sans
 * le plugin, la construction passe ; avec le plugin et cette seule expérience
 * vidée, elle passe aussi. Sous Node 24 le défaut ne se voit pas, ce qui
 * explique qu'il ait échappé aux constructions faites à la main.
 *
 * Ce qui se perd est une optimisation d'imports de barils : des paquets un
 * peu plus gros, et rien d'autre. Une construction juste vaut mieux qu'une
 * construction optimisée qui n'aboutit pas.
 *
 * Le plugin renvoie une **fonction** de configuration, pas un objet — d'où
 * l'enveloppe plutôt qu'un simple étalement : l'appeler est ce qui déclenche
 * la génération de la liste de classes.
 */
const withFlowbite = withFlowbiteReact(nextConfig) as (
  phase: string,
  options: unknown,
) => Promise<NextConfig>;

export default async function config(
  phase: string,
  options: unknown,
): Promise<NextConfig> {
  const patched = await withFlowbite(phase, options);
  const experimental = patched.experimental ?? {};
  /* Filtré plutôt que vidé : si quelqu'un ajoute un jour une autre entrée à
     l'expérience, elle survivra à ce correctif. */
  const reste = (experimental.optimizePackageImports ?? []).filter(
    (paquet) => paquet !== "flowbite-react",
  );
  return {
    ...patched,
    experimental: {
      ...experimental,
      /* `undefined` et non `[]` quand il ne reste rien, et c'est tout le
         correctif : un tableau vide **laisse l'expérience active** — Next
         l'annonce encore au démarrage — et remplace du même coup la liste que
         Next optimise par défaut. La construction échouait alors au pré-rendu
         de la première page, sur un « TypeError: a[d] is not a function » venu
         du runtime webpack. Clé absente, l'expérience ne s'allume pas. */
      optimizePackageImports: reste.length > 0 ? reste : undefined,
    },
  };
}
