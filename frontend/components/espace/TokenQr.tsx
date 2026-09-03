/**
 * The QR for a payment token.
 *
 * The module grid is derived from the token id, so a new token looks different
 * and the same token always looks the same. It encodes nothing scannable — the
 * real code is the server's to produce once it signs the token — which is why
 * the screen around it never claims otherwise.
 *
 * Deliberately drawn from the id alone: the amount and the holder are not in
 * the picture, and could not be read out of it.
 */
const SIZE = 21;

const FINDERS = [
  [0, 0],
  [0, SIZE - 7],
  [SIZE - 7, 0],
] as const;

/** 7x7: dark ring, light ring, solid 3x3 centre — Chebyshev distance gives all three. */
function finderModule(row: number, col: number): boolean | null {
  for (const [top, left] of FINDERS) {
    if (row >= top && row < top + 7 && col >= left && col < left + 7) {
      const ring = Math.max(Math.abs(row - top - 3), Math.abs(col - left - 3));
      return ring === 3 || ring <= 1;
    }
  }
  return null;
}

/** A stable 32-bit hash of the token id, spread over the data area. */
function seedOf(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export default function TokenQr({
  tokenId,
  dimmed = false,
}: {
  tokenId: string;
  /** Spent or expired: still shown, visibly out of use. */
  dimmed?: boolean;
}) {
  const seed = seedOf(tokenId);
  const modules: { row: number; col: number }[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const finder = finderModule(row, col);
      const dark =
        finder === null
          ? ((seed >> (row % 16)) ^ (seed >> (col % 13)) ^ (row * col)) % 7 < 3
          : finder;
      if (dark) modules.push({ row, col });
    }
  }

  return (
    <div
      className={`aspect-square w-[min(72vw,300px)] rounded-2xl bg-white p-[5%] ${
        dimmed ? "opacity-30" : ""
      }`}
    >
      <svg
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
            className="fill-primary-700"
          />
        ))}
      </svg>
    </div>
  );
}
