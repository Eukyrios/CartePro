import type { Metadata } from "next";
import EmployeeSpace from "@/components/espace/EmployeeSpace";

export const metadata: Metadata = {
  title: "Mon espace | Ticket Tout",
  description:
    "Espace salarié Ticket Tout : le réseau de partenaires où utiliser son crédit",
};

export default function EspacePage() {
  // Same container as TopBar and /parametres, so the page's left edge lines up
  // with the logotype rather than being inset from it.
  return (
    <main className="snap-sections mx-auto w-full max-w-7xl flex-1 overflow-x-clip px-4 sm:px-6 lg:px-8">
      <EmployeeSpace />
    </main>
  );
}
