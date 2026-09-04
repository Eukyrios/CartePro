/**
 * The recurring graphic marks of the Ticket Tout design: the skewed logo glyph
 * and the diagonal arrow that trails every call to action. Both are pure
 * decoration, so both are hidden from assistive technology.
 *
 * Marks only. Two type helpers used to live here — `Eyebrow`, which was `MICRO`
 * minus `font-sans` and `uppercase`, and `SectionRail` — and they belonged to
 * the interface library, not to the marks: the first is now `<Micro
 * tone="accent">`, and the second went with the two landing sections that were
 * its only callers and were rendered nowhere.
 */

type LogoMarkProps = {
  /** Wrapper classes: size and the two colours (block + bar). */
  className?: string;
  barClassName?: string;
  /** For colours that are not known at build time, such as a picked hex. */
  style?: React.CSSProperties;
  barStyle?: React.CSSProperties;
};

/** Three skewed bars in a skewed square — the Ticket Tout monogram. */
export function LogoMark({
  className = "size-7 bg-primary-700",
  barClassName = "bg-white",
  style,
  barStyle,
}: LogoMarkProps) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`inline-flex shrink-0 -skew-x-[8deg] items-center justify-center gap-[2px] ${className}`}
    >
      {[0, 1, 2].map((bar) => (
        <i
          key={bar}
          style={barStyle}
          className={`block h-[15px] w-[3px] -skew-y-[25deg] ${barClassName}`}
        />
      ))}
    </span>
  );
}

type WordMarkProps = {
  /** Wrapper classes. The whole mark is sized in em, so set the type size here. */
  className?: string;
  /** Colour of the shared T. Defaults to the brand accent. */
  tClassName?: string;
  /** Colour of "icket" and "out". Defaults to the pale step of the ramp. */
  wordClassName?: string;
  /** For colours that are not known at build time, such as the card's ink. */
  style?: React.CSSProperties;
};

/**
 * The "Ticket Tout" wordmark: one oversized T, two lines tall, serving as the
 * initial of both words at once — "icket" on the upper line, "out" on the
 * lower.
 *
 * "out" is set larger than "icket" — the word the brand leans on — and tucked
 * back towards the stem, which the upper line cannot do without running into
 * the crossbar.
 *
 * The sizes are in em so the mark scales from whatever font-size the wrapper
 * carries, and the two boxes are matched on purpose: the T is 2.68em tall with
 * 0.74 leading (1.98em of box) against 0.86em + 1.12em of stacked lines (1.98em
 * likewise), which is what keeps the letter spanning both lines exactly instead
 * of overhanging them.
 *
 * Two tones: the T takes the deep brand blue and the two words a pale step of
 * the same ramp. Both flip with the theme — cp-accent is near-black blue on a
 * light ground and a light blue on a dark one — so the pairing keeps the same
 * relationship either way rather than inverting into two identical blues.
 *
 * Split across three elements, so the visual parts are hidden from assistive
 * technology and the name is exposed once, in full, instead of being read out
 * as "T icket out".
 */
export function WordMark({
  className = "",
  tClassName = "text-cp-accent",
  wordClassName = "text-primary-300 dark:text-primary-400",
  style,
}: WordMarkProps) {
  return (
    <span
      style={style}
      className={`inline-flex items-center gap-[0.06em] font-black ${className}`}
    >
      <span
        aria-hidden="true"
        className={`text-[2.68em] leading-[0.74] tracking-[-0.06em] ${tClassName}`}
      >
        T
      </span>
      <span
        aria-hidden="true"
        className={`flex flex-col items-start tracking-[-0.05em] ${wordClassName}`}
      >
        <span className="text-[1em] leading-[0.86]">icket</span>
        {/* Tucked back under the crossbar: nothing overhangs the lower line, so
            "out" can sit against the stem where "icket" cannot. The offset is
            in this span's own em — 1.44 of the wrapper's — so -0.35em here is
            roughly half a wrapper em to the left, landing just clear of the
            stem's right edge. */}
        <span className="-ml-[0.35em] text-[1.44em] leading-[0.78]">out</span>
      </span>
      <span className="sr-only">Ticket Tout</span>
    </span>
  );
}

/** The ↗ that follows links and buttons, nudged on hover by the parent group. */
export function Arrow({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`ml-2.5 inline-block text-[15px] leading-none transition-transform duration-200 group-hover:translate-x-[3px] group-hover:-translate-y-[3px] ${className}`}
    >
      ↗
    </span>
  );
}
