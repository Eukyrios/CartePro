import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * One full-height screen of a scroll-snapping page.
 *
 * Ten of these were written out by hand, and they had drifted on six axes at
 * once: `min-h-screen` against `calc(100vh-76px)` against `calc(100dvh-76px)`,
 * `py-16` against `py-14` against `py-3`, the bottom rule present or missing,
 * `snap-start` present or missing, grid against flex. What varies here is a
 * prop; what does not is in the base.
 *
 * `dvh` everywhere and `vh` nowhere: on a mobile browser with a collapsing
 * toolbar, `100vh` is taller than the visible viewport, so the bottom of the
 * screen is cut off. That was already fixed on the payment page and still wrong
 * on the hero.
 */
const HEIGHTS = {
  /** A full viewport: the normal case inside a snapping page. */
  screen: "min-h-dvh",
  /** Under the 76px top bar, for a page that is one screen and not a rail. */
  "below-bar": "min-h-[calc(100dvh-76px)]",
  /**
   * Laisse la place du pied de page : les deux ensemble font un écran.
   *
   * Pour le dernier écran de chaque page qui défile par écrans. La valeur suit
   * la hauteur du pied — voir layout/Footer, où elle est écrite une fois.
   */
  "screen-minus-footer": "min-h-dvh lg:min-h-[calc(100dvh-115px)]",
} as const;

const GAPS = { 0: "", 6: "gap-6", 9: "gap-9", 10: "gap-10" } as const;

const DENSITIES = {
  /** The normal case: 4rem of air above and below. */
  normal: "py-16",
  /** For a screen capped under the bar, where 4rem pushes content off. */
  tight: "py-3",
  /**
   * For a screen that can grow past the viewport — see `long`.
   *
   * Such a screen cannot be centred: its content is taller than the box, so
   * `content-center` has nothing to centre and the heading ends up jammed
   * under the top bar. The other screens start low only because they *are*
   * centred, so their gap comes from their own short content — there is no
   * padding to copy from them. This offset is that gap, written down: enough
   * air that a long screen reads as placed rather than pushed against the bar.
   */
  offset: "pt-[12vh] pb-16",
} as const;

type Props = {
  children: ReactNode;
  /** The scroll-snap anchor and the id the section rail scrolls to. */
  id?: string;
  height?: keyof typeof HEIGHTS;
  /** False for a screen that is not inside a `.snap-sections` container. */
  snap?: boolean;
  /** The 2px bottom rule that separates one screen from the next. */
  rule?: boolean;
  /**
   * "center" packs the content in the middle; "stretch" lets it fill; "start"
   * pins it to the top.
   *
   * "start" is for a screen whose content changes height while it is read. On
   * "center", a block that grows re-centres, so everything above it slides up —
   * the balance screen's heading moved by 55px the moment its QR panel filled
   * in. Pinning the top makes the heading's place a property of the screen and
   * not of whatever is happening lower down.
   */
  align?: "center" | "stretch" | "start";
  layout?: "grid" | "flex";
  /** How much air above and below. See `DENSITIES`. */
  density?: keyof typeof DENSITIES;
  /** "page" screens carry their own horizontal gutter; "container" inherit it. */
  gutter?: "container" | "page";
  gap?: keyof typeof GAPS;
  /**
   * True for a screen whose content can be taller than the viewport — a long
   * paginated list, say.
   *
   * L'écran reçoit alors un **second point d'accroche**, collé à son bas : on
   * s'accroche à son sommet, puis à son pied, et les deux vues couvrent sa
   * hauteur entière. L'accrochage obligatoire doit venir au repos *sur* un
   * point d'accroche, donc sans ce second point la moitié basse d'un écran de
   * deux écrans était inatteignable — le défilement était ramené à son sommet.
   *
   * Ce réglage **n'affaiblit plus l'accrochage de la page**. Il a posé un
   * temps une classe qui faisait passer tout le document en `proximity`, et
   * avant cela en `none` : dans les deux cas une seule section longue changeait
   * le comportement de toutes les autres, puisque le sélecteur portait sur le
   * document. En `none`, trois des quatre pages avaient perdu tout accrochage ;
   * en `proximity`, l'accrochage ne s'engageait plus qu'au voisinage d'une
   * frontière, si bien qu'un défilement s'arrêtant entre deux sections courtes
   * y restait. Le point d'accroche supplémentaire règle le cas de l'écran long
   * sans rien changer aux autres.
   */
  long?: boolean;
  /**
   * Additive only. This component owns padding, min-height, the rule, the snap
   * anchor and the display mode — pass grid *templates*, backgrounds and ink.
   */
  className?: string;
  "aria-labelledby"?: string;
};

export default function Screen({
  children,
  id,
  height = "screen",
  snap = true,
  rule = true,
  align = "center",
  layout = "grid",
  density = "normal",
  gutter = "container",
  gap = 0,
  long = false,
  className,
  ...rest
}: Props) {
  return (
    <section
      {...rest}
      id={id}
      className={cx(
        layout === "grid" ? "grid" : "flex flex-col",
        HEIGHTS[height],
        snap && "snap-start",
        /* `relative` uniquement ici : la sentinelle ci-dessous est
           positionnée, et faire de *chaque* écran un bloc conteneur
           déplacerait les enfants absolus des autres. */
        long && "snap-long relative",
        rule && "border-cp-border border-b",
        align === "center" &&
          (layout === "grid" ? "content-center" : "justify-center"),
        align === "start" &&
          (layout === "grid" ? "content-start" : "justify-start"),
        DENSITIES[density],
        gutter === "page" && "px-6 lg:px-[7vw] lg:py-[110px]",
        GAPS[gap],
        className,
      )}
    >
      {children}
      {/* Le second point d'accroche d'un écran long, collé à son bas.
          Voir `long` : sans lui, la moitié basse d'un écran de deux écrans est
          hors d'atteinte sous accrochage obligatoire. Un div vide plutôt qu'un
          `::after` — sur une section en `grid`, un pseudo-élément devient un
          élément de grille et s'ajoute à la mise en page. */}
      {long && <div aria-hidden="true" className="snap-long-tail" />}
    </section>
  );
}
