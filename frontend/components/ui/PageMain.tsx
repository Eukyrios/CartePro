import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * The page's main column: centred, capped, and gutter-ed.
 *
 * Two of the four `<main>`s in the app were byte-identical, comment included,
 * and the other two had each dropped something. `snap` adds the scroll-snap
 * container that the section rails need; `pad="y"` is for a page that is one
 * panel rather than a stack of full-height screens.
 *
 * `<main>` prend toute la largeur du document et la colonne vit à l'intérieur,
 * plutôt que l'inverse. C'est ce qui permet à un écran de saigner jusqu'aux
 * bords de la fenêtre — les hachures d'un `HatchedPanel` sur une section
 * barrée — sans que la colonne bouge d'un pixel : la coupe horizontale se fait
 * au bord du document et non au bord du contenu.
 *
 * Deux autres pistes ont été mesurées et écartées : `overflow-clip-margin` sur
 * la colonne n'est pas honoré par Chrome quand un seul axe est en `clip`
 * (valeur calculée à 960px, rognage inchangé), et passer la colonne en
 * `overflow-x: visible` laissait 8px de débordement horizontal — la largeur de
 * la barre de défilement, que `100vw` compte et que le document n'a pas.
 */
export default function PageMain({
  children,
  snap = false,
  pad = "none",
  width = "container",
  className,
}: {
  children: ReactNode;
  snap?: boolean;
  pad?: "none" | "y";
  /**
   * "full" for the landing page, whose screens carry their own gutters and go
   * edge to edge — a container there would inset the blue block from the
   * window.
   */
  width?: "container" | "full";
  className?: string;
}) {
  const column = (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );

  return (
    <main
      className={cx(
        "w-full flex-1",
        /* Screens inside a snapping container may not be clipped horizontally
           by the container itself, or a card that tilts on hover gets cut. Le
           clip est ici, sur la pleine largeur : il coupe au bord du document,
           donc il absorbe les 100vw d'un écran barré sans les raboter. */
        snap && "snap-sections overflow-x-clip",
        pad === "y" && "py-10",
        className,
      )}
    >
      {width === "container" ? column : children}
    </main>
  );
}
