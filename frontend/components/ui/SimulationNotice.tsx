import Micro from "./Micro";
import type { ReactNode } from "react";

/**
 * The notice that says what is real and what is not, in the ochre the administration
 * uses for its own claims.
 *
 * Required wherever a monetary value is shown, and required to stay visible
 * rather than be tucked behind an interaction — which is why it is a component
 * and not a class on whatever paragraph happened to be nearby. The wording is
 * the caller's, because it has to tell the truth about that particular screen:
 * a simulated balance and a payment written to the database are not the same
 * claim.
 */
export default function SimulationNotice({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Micro as="p" tone="official" className={className}>
      {children}
    </Micro>
  );
}
