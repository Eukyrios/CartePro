/**
 * A mock QR code that dissolves into a payment confirmation on hover, and
 * re-forms when the pointer leaves. The animation itself lives in globals.css
 * under `.qr-dissolve`.
 *
 * The grid is generated from the row and column indices rather than a random
 * source: it has to render identically on the server and on the client, and
 * Math.random would produce a hydration mismatch.
 *
 * The confirmation is real text in the DOM, so it reaches assistive technology
 * whether or not the dissolve ever plays, and the panel is focusable so the
 * effect is reachable without a pointer.
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

/** Deterministic fill for the data area — stable across server and client. */
function dataModule(row: number, col: number): boolean {
  return (row * 29 + col * 13 + ((row * col) % 7) * 5) % 9 < 4;
}

const MODULES: { row: number; col: number }[] = [];
for (let row = 0; row < SIZE; row++) {
  for (let col = 0; col < SIZE; col++) {
    const finder = finderModule(row, col);
    const dark = finder === null ? dataModule(row, col) : finder;
    if (dark) MODULES.push({ row, col });
  }
}

export default function PaymentQr() {
  return (
    <div
      tabIndex={0}
      aria-label="QR de paiement de démonstration : 10,00 € payés via ce QR"
      className="qr-dissolve bg-cp-page relative size-[min(74vw,42vh)] max-w-[460px] cursor-pointer rounded-2xl p-[5%] outline-none focus-visible:ring-4 focus-visible:ring-white/40"
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
        className="size-full"
        shapeRendering="crispEdges"
      >
        {MODULES.map(({ row, col }) => (
          <rect
            key={`${row}-${col}`}
            x={col}
            y={row}
            width="1"
            height="1"
            className="qr-module fill-primary-700"
            /* Staggered along the diagonal so the code wipes away rather than
               blinking out all at once. The delay applies in both directions,
               so it re-forms the same way. */
            style={{ transitionDelay: `${(row + col) * 12}ms` }}
          />
        ))}
      </svg>

      <div className="qr-reveal pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="text-cp-muted text-[clamp(8px,1vw,12px)] font-black tracking-[0.14em]">
          SIMULATION
        </span>
        <strong className="text-primary-700 mt-2 block text-[clamp(30px,4.4vw,66px)] leading-none tracking-[-0.05em]">
          10,00 €
        </strong>
        <span className="text-cp-muted mt-3 text-[clamp(10px,1.1vw,15px)] leading-[1.4]">
          payés via ce QR chez le partenaire
        </span>
      </div>
    </div>
  );
}
