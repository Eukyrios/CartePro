import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * The row of filters above a list. Four across when there is room, two on a
 * tablet, one on a phone.
 *
 * No `columns` prop: the count is a function of the container, and both lists
 * that use this sit in the same `max-w-7xl` column. The history screen had
 * picked three, which left its fifth field alone on a row with a hole beside
 * it; four wraps 4+1 cleanly.
 */
export default function FilterGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("grid gap-5 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {children}
    </div>
  );
}
