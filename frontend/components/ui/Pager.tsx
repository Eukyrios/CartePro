import IconButton from "./IconButton";
import Micro from "./Micro";
import Slash from "./Slash";
import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * Two arrows and, when there are pages to count, where you are among them.
 *
 * The three hand-written pagers disagreed on the button size, the disabled
 * opacity and whether the position was rendered at all. `position` omitted
 * means the row is endless — a drifting marquee has no page number — and `hint`
 * then explains what the arrows do instead.
 */
export default function Pager({
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  position,
  atStart = false,
  atEnd = false,
  hint,
  className,
}: {
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  /** Current and total. Omitted where there is nothing to number. */
  position?: readonly [number, number];
  atStart?: boolean;
  atEnd?: boolean;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-wrap items-center gap-3", className)}>
      <IconButton label={prevLabel} onClick={onPrev} disabled={atStart}>
        ←
      </IconButton>
      <IconButton label={nextLabel} onClick={onNext} disabled={atEnd}>
        →
      </IconButton>
      {position && (
        <Micro as="p" aria-live="polite">
          {String(position[0]).padStart(2, "0")}
          <Slash />
          {String(position[1]).padStart(2, "0")}
        </Micro>
      )}
      {hint && (
        <Micro as="p" tone="muted">
          {hint}
        </Micro>
      )}
    </div>
  );
}
