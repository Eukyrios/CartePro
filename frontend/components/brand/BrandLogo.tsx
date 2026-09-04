import VectorMark from "./VectorMark";

/**
 * The Ticket Tout logotype as the chrome uses it.
 *
 * A thin wrapper over VectorMark that carries the ink per surface: the accent
 * blue on the page's own background — which flips to a light blue in the dark
 * theme, so one class covers both — and white where it sits on the footer's
 * near-black, in both themes.
 *
 * The coded lockup this replaced is still in Marks.tsx as LogoMark and
 * WordMark. Nothing about it has been deleted.
 */
export default function BrandLogo({
  variant = "auto",
  className = "h-9 w-auto",
}: {
  /** "auto" takes the accent, which follows the theme; "white" pins white. */
  variant?: "auto" | "white";
  className?: string;
}) {
  const ink = variant === "white" ? "text-white" : "text-cp-accent";
  return <VectorMark className={`${ink} ${className}`} />;
}
