import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * The white QR ticket, drawn as a real version-1 module grid.
 *
 * Two of these existed — one on the landing page that dissolves into a
 * confirmation on hover, one in the salarié space that forms itself when a
 * token is issued — and they shared everything except the function filling the
 * data area: `SIZE`, the three finder squares, the Chebyshev trick that draws
 * all three of their rings, the module loop, the diagonal delay and the
 * `qr-module fill-primary-700` class. That is here once.
 *
 * It encodes nothing scannable. The server does produce a real QR image
 * (`qr_image_base64`), and the day a terminal has to read one, that is the
 * image to show — which is why no screen around this component ever claims the
 * drawing is readable.
 *
 * White in both themes, whatever sits behind it: a QR is a thing to be read,
 * not a themed surface. The one rounded corner in an otherwise square design,
 * and deliberate — it is a printed ticket.
 */

/** Modules per side. 21 is a real QR version-1 grid, which is why it reads. */
const SIZE = 21;

/** Top-left corners of the three finder squares. */
const FINDERS = [
  [0, 0],
  [0, SIZE - 7],
  [SIZE - 7, 0],
] as const;

/**
 * A finder pattern is a 7x7 square: dark outer ring, light ring inside it, and
 * a solid 3x3 centre. Chebyshev distance from the centre gives all three.
 */
function finderModule(row: number, col: number): boolean | null {
  for (const [top, left] of FINDERS) {
    if (row >= top && row < top + 7 && col >= left && col < left + 7) {
      const ring = Math.max(Math.abs(row - top - 3), Math.abs(col - left - 3));
      return ring === 3 || ring <= 1;
    }
  }
  return null;
}

/** Deterministic fill — identical on the server and the client, so no mismatch. */
function staticModule(row: number, col: number): boolean {
  return (row * 29 + col * 13 + ((row * col) % 7) * 5) % 9 < 4;
}

/** A stable 32-bit hash, so one token always draws the same code. */
function hash(seed: string): number {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function modulesFor(seed: string | undefined) {
  const seeded = seed === undefined ? null : hash(seed);
  const modules: { row: number; col: number }[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const finder = finderModule(row, col);
      const dark =
        finder !== null
          ? finder
          : seeded === null
            ? staticModule(row, col)
            : ((seeded >> (row % 16)) ^ (seeded >> (col % 13)) ^ (row * col)) %
                7 <
              3;
      if (dark) modules.push({ row, col });
    }
  }
  return modules;
}

type Props = {
  /**
   * Omitted for the fixed demonstration grid; a token id for a code that has to
   * look different from the last one and the same as itself.
   */
  seed?: string;
  /** How it moves: away on hover, or into being when it is issued. */
  motion: "dissolve" | "materialise";
  /** Spent or expired: still shown, visibly out of use. */
  dimmed?: boolean;
  /**
   * Present only where the ticket is itself the interactive object — it then
   * takes focus and carries this as its accessible name. Otherwise the ticket
   * is decoration and hidden from assistive technology.
   */
  label?: string;
  /** The layer revealed under the dissolve. */
  children?: ReactNode;
  /** Additive only — this component owns the field, the radius and the ratio. */
  className?: string;
};

export default function QrCode({
  seed,
  motion,
  dimmed = false,
  label,
  children,
  className,
}: Props) {
  const modules = modulesFor(seed);
  const interactive = label !== undefined;

  return (
    <div
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      className={cx(
        "relative aspect-square w-full rounded-2xl bg-white p-[5%]",
        motion === "dissolve" ? "qr-dissolve" : "qr-materialise",
        interactive &&
          "cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/40",
        dimmed && "opacity-30",
        className,
      )}
    >
      <svg
        /* Keyed on the seed so a new token remounts and draws itself, instead
           of swapping in fully formed. */
        key={seed}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
        className="size-full"
        shapeRendering="crispEdges"
      >
        {modules.map(({ row, col }) => (
          <rect
            key={`${row}-${col}`}
            x={col}
            y={row}
            width="1"
            height="1"
            className="qr-module fill-primary-700"
            /* Staggered along the diagonal, so the code wipes away — or draws
               itself — from one corner rather than blinking all at once. The
               dissolve transitions in both directions, so it re-forms the same
               way; the materialise is a keyframe, so it needs the delay on the
               animation instead. */
            style={
              motion === "dissolve"
                ? { transitionDelay: `${(row + col) * 12}ms` }
                : { animationDelay: `${(row + col) * 12}ms` }
            }
          />
        ))}
      </svg>
      {children}
    </div>
  );
}
