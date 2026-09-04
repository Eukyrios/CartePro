import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * The two-column form grid: wider gap between the columns than between the
 * rows, so a label never looks as though it belongs to the field beside it.
 *
 * Three identical copies of this string existed, one per field set.
 */
export default function FieldGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
