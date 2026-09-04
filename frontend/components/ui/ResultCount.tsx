import Micro from "./Micro";
import { cx } from "./cx";
import { MICRO } from "./surfaces";

/**
 * "13 partenaires", and the way back to no filter at all.
 *
 * The 2px rule is the design's "the results begin here" device; one of the two
 * hand-written strips had lost it, which left the list floating under its
 * filters. The count is `aria-live`, so a filter typed with the keyboard
 * announces how many rows survived.
 */
export default function ResultCount({
  count,
  noun,
  zero,
  onReset,
  resetLabel = "Effacer les filtres",
  className,
}: {
  count: number;
  /** Singular and plural, because French agreement is the caller's business. */
  noun: readonly [string, string];
  /** What to say when nothing matched — never "0 partenaires". */
  zero: string;
  /** Omitted when no filter is set: nothing to clear, no button. */
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "border-t-cp-fg mt-9 flex flex-wrap items-baseline gap-4 border-t-2 pt-4",
        className,
      )}
    >
      <Micro as="p" aria-live="polite">
        {count === 0 ? zero : `${count} ${count > 1 ? noun[1] : noun[0]}`}
      </Micro>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className={cx(
            "text-cp-accent ms-auto cursor-pointer underline underline-offset-4",
            MICRO,
          )}
        >
          {resetLabel}
        </button>
      )}
    </div>
  );
}
