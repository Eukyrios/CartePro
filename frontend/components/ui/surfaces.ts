/**
 * The sharp surfaces shared by /parametres and the auth dialog.
 *
 * Both screens were stock Flowbite — rounded corners, soft shadows, grey
 * borders — while the rest of the design is flat, square and heavy. These
 * constants are that language written once: square corners, 2px rules on
 * cp-fg, uppercase micro-type for anything small, and the accent blue on the
 * one action that matters per panel.
 *
 * Plain classes rather than Flowbite theme overrides wherever a component is
 * only decorative: a component's own `dark:` variants beat our unprefixed ones
 * in tailwind-merge, so overriding them piecemeal reintroduces that trap on
 * every surface. Flowbite is kept only where it does real work — the tab list
 * and the deletion dialog — and themed there with `dark:` included.
 */

/** The box itself, without padding — see Panel.tsx's `padding="none"`. */
export const PANEL_BOX = "border-cp-fg bg-cp-page border-2";

/** Flat bordered box holding one section of a screen. */
export const PANEL = `${PANEL_BOX} p-6 sm:p-8`;

export const PANEL_HEADING =
  "text-cp-fg text-[24px] leading-[0.95] font-black tracking-[-0.05em] sm:text-[30px]";

export const PANEL_LEAD =
  "text-cp-muted mt-3 max-w-[580px] text-[13px] leading-[1.55]";

/** Uppercase micro-label: eyebrows, rail entries, badges, button faces. */
export const MICRO =
  "font-sans text-[9px] font-black tracking-[0.16em] uppercase";

/**
 * The display type scale — five steps, and the only place a `clamp()` for a
 * heading may be written.
 *
 * There were nine, of which two repeated: every screen invented its own step,
 * so `Ma carte` and `Mes opérations` sat at 38px and 34px on the same
 * scrolling page, which reads as a mistake rather than as a hierarchy.
 *
 * Leading tightens as the size grows, which is the actual rule the nine
 * accidental steps were groping towards. No colour here: a heading inherits its
 * ink, which is what lets the same scale serve the white-on-blue section.
 *
 * `hero` is deliberately unharmonised — one element, on one screen, whose grid
 * column is dimensioned around it.
 */
export const DISPLAY = {
  hero: "text-[clamp(68px,10vw,160px)] leading-[0.79] tracking-[-0.09em]",
  page: "text-[clamp(44px,6.8vw,112px)] leading-[0.82] tracking-[-0.08em]",
  section: "text-[clamp(34px,4.4vw,58px)] leading-[0.86] tracking-[-0.07em]",
  card: "text-[clamp(36px,4.4vw,60px)] leading-[0.9] tracking-[-0.055em]",
  panel: "text-[24px] leading-[0.95] tracking-[-0.05em] sm:text-[30px]",
} as const;

const BTN =
  "group inline-flex items-center justify-center rounded-none border-2 px-5 py-3 font-sans text-[10px] font-black tracking-[0.14em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-30";

/**
 * The one committing action of a panel — filled with the foreground ink, never
 * with the institutional blue. #1B3A6B is the identity colour of the ministry
 * and the charter reserves it for identity and text, so no button may be a
 * field of it; the blue still carries every heading accent, link and marker.
 */
export const BTN_SOLID = `${BTN} border-cp-fg bg-cp-fg text-cp-page enabled:hover:border-cp-accent enabled:hover:bg-cp-accent`;

/** Everything secondary: cancel, and actions that are not built yet. */
export const BTN_OUTLINE = `${BTN} border-cp-fg text-cp-fg bg-transparent enabled:hover:bg-cp-fg enabled:hover:text-cp-page`;

export const BTN_DANGER = `${BTN} border-fg-danger bg-fg-danger text-white enabled:hover:bg-transparent enabled:hover:text-fg-danger`;

/** Message strip: a 2px rule down the left, no rounding, no icon. */
const NOTE = "bg-cp-surface border-l-2 px-4 py-3 text-[12px] leading-[1.5]";
export const NOTE_INFO = `${NOTE} border-cp-accent text-cp-fg`;
export const NOTE_DANGER = `${NOTE} border-fg-danger text-cp-fg`;
/** Something went right, or something is available: the teal accent. */
export const NOTE_POSITIVE = `${NOTE} border-cp-positive text-cp-fg`;

/** Outlined chip. The ochre accent marks anything the ministry vouches for. */
const CHIP = `border px-2.5 py-1.5 ${MICRO}`;
export const CHIP_PLAIN = `${CHIP} border-cp-fg text-cp-fg`;
export const CHIP_OFFICIAL = `${CHIP} border-cp-official text-cp-official`;

/**
 * The simulation notice. Required wherever a monetary value is shown, and
 * required to stay visible rather than be tucked behind an interaction.
 */
export const SIMULATION_NOTICE = `text-cp-official ${MICRO}`;
