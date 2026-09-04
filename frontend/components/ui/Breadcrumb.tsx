import Link from "next/link";
import Micro from "./Micro";
import Slash from "./Slash";
import { Fragment } from "react";

/**
 * The trail back up. The last entry is where you are and carries no link.
 *
 * The separators are `<Slash>`, which brings its own spacing — the two
 * hand-written trails used a bare slash inside a `gap-2` row, six pixels
 * against eight. Nobody will see the difference; the point is that there is now
 * one slash in the codebase and it is hidden from screen readers.
 *
 * Sets no margin.
 */
export default function Breadcrumb({
  trail,
  className,
}: {
  trail: readonly { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Fil d'Ariane" className={className}>
      <Micro as="p" tone="muted" className="flex flex-wrap items-baseline">
        {trail.map((crumb, index) => (
          <Fragment key={crumb.label}>
            {index > 0 && <Slash />}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-cp-fg">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-cp-fg">{crumb.label}</span>
            )}
          </Fragment>
        ))}
      </Micro>
    </nav>
  );
}
