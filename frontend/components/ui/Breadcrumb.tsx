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
  as = "nav",
}: {
  trail: readonly { label: string; href?: string }[];
  className?: string;
  /**
   * "p" pour un fil qui **situe** sans mener nulle part : le surtitre d'un bloc
   * dans une page qui porte déjà son fil d'Ariane.
   *
   * Les deux pages d'historique de l'administration en ont un de chaque : le
   * fil de la page en tête — où l'on est, et par où l'on repart — et le
   * surtitre du bloc des chiffres juste au-dessus de son titre. Écrit à la main
   * en `Micro tone="accent"`, ce second fil était violet et sans dernier
   * segment marqué, si bien que deux fils du même document ne se ressemblaient
   * pas. Il sort maintenant d'ici, donc il a la même graisse, les mêmes
   * séparateurs et les mêmes couleurs — sans être une seconde navigation :
   * pas de `<nav>` et pas de liens, que le lecteur d'écran aurait entendus
   * deux fois.
   */
  as?: "nav" | "p";
}) {
  const fil = (
    <Micro as="p" tone="muted" className="flex flex-wrap items-baseline">
      {trail.map((crumb, index) => (
        <Fragment key={crumb.label}>
          {index > 0 && <Slash />}
          {crumb.href && as === "nav" ? (
            <Link href={crumb.href} className="hover:text-cp-fg">
              {crumb.label}
            </Link>
          ) : index === trail.length - 1 ? (
            <span className="text-cp-fg">{crumb.label}</span>
          ) : (
            <span>{crumb.label}</span>
          )}
        </Fragment>
      ))}
    </Micro>
  );

  if (as === "p") return <div className={className}>{fil}</div>;

  return (
    <nav aria-label="Fil d'Ariane" className={className}>
      {fil}
    </nav>
  );
}
