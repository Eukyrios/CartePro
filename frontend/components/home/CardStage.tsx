/**
 * The tinted panel the card is presented on: the blueprint grid behind it and
 * the small tilted tag pinned to a corner — the hero's two devices, shared so
 * the card looks the same wherever it is shown.
 *
 * The grid itself is `.blueprint-grid` in globals.css, which mixes its rules
 * from the palette and re-mixes them for the dark theme.
 */
export function CardTag({
  className = "top-[9%] right-[6%] rotate-[4deg]",
}: {
  /** Corner and tilt. Top-right, tilted clockwise, unless overridden. */
  className?: string;
}) {
  return (
    <div
      className={`text-cp-accent border-primary-700 bg-cp-page absolute z-3 border px-[13px] py-[11px] ${className}`}
    >
      <span className="mb-[7px] block text-[7px] font-black tracking-[0.16em]">
        UNE CARTE
      </span>
      <b className="text-[13px] leading-[0.85] tracking-[-0.05em]">
        POUR
        <br />
        CHOISIR.
      </b>
    </div>
  );
}

/**
 * The panel as a self-contained box, for the places that need one. The hero
 * builds its own instead: there the panel is a full-height grid column with
 * the card absolutely centred inside it.
 */
export default function CardStage({
  children,
  tagClassName,
  className = "",
}: {
  children: React.ReactNode;
  tagClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-cp-surface border-cp-border relative overflow-hidden border ${className}`}
    >
      <div aria-hidden="true" className="blueprint-grid absolute inset-[7%]" />
      <CardTag className={tagClassName} />
      {/* Above the grid, and inset so the card floats on the panel rather than
          filling it. The vertical inset is in vh, not per cent: a percentage
          padding resolves against the panel's *width*, which on a wide column
          made the panel far taller than the card inside it. */}
      <div className="relative z-2 px-[7%] py-[2.2vh]">{children}</div>
    </div>
  );
}
