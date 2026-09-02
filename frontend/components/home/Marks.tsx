/**
 * The two recurring graphic marks of the CartePro design: the skewed logo glyph
 * and the diagonal arrow that trails every call to action. Both are pure
 * decoration, so both are hidden from assistive technology.
 */

type LogoMarkProps = {
  /** Wrapper classes: size and the two colours (block + bar). */
  className?: string;
  barClassName?: string;
};

/** Three skewed bars in a skewed square — the CartePro monogram. */
export function LogoMark({
  className = "size-7 bg-primary-700",
  barClassName = "bg-white",
}: LogoMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 -skew-x-[8deg] items-center justify-center gap-[2px] ${className}`}
    >
      {[0, 1, 2].map((bar) => (
        <i
          key={bar}
          className={`block h-[15px] w-[3px] -skew-y-[25deg] ${barClassName}`}
        />
      ))}
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

/** Tiny uppercase blue label used above every section heading. */
export function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-cp-accent text-[9px] font-black tracking-[0.16em] ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * The numbered vertical rail down the left edge of a section: the index at the
 * top, the section name at the bottom. Collapses to a single row on mobile,
 * as in the original.
 */
export function SectionRail({ index, name }: { index: string; name: string }) {
  return (
    <div className="flex flex-row justify-between gap-4 text-[9px] font-black tracking-[0.14em] md:w-[100px] md:flex-col">
      <span className="text-cp-accent text-[17px]">{index}</span>
      <span>{name}</span>
    </div>
  );
}
