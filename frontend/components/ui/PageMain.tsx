import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * The page's main column: centred, capped, and gutter-ed.
 *
 * Two of the four `<main>`s in the app were byte-identical, comment included,
 * and the other two had each dropped something. `snap` adds the scroll-snap
 * container that the section rails need; `pad="y"` is for a page that is one
 * panel rather than a stack of full-height screens.
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
  return (
    <main
      className={cx(
        "w-full flex-1",
        width === "container" && "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
        /* Screens inside a snapping container may not be clipped horizontally
           by the container itself, or a card that tilts on hover gets cut. */
        snap && "snap-sections overflow-x-clip",
        pad === "y" && "py-10",
        className,
      )}
    >
      {children}
    </main>
  );
}
