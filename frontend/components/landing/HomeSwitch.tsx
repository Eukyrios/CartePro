"use client";

import EmployeeSpace from "@/components/espace/EmployeeSpace";
import PageMain from "@/components/ui/PageMain";
import { useAccount } from "@/components/account/AccountProvider";
import LandingPage from "./LandingPage";

/**
 * What "/" is depends on who is looking: the landing page for a visitor, and
 * the salarié space for a signed-in employé — the space is their homepage, and
 * the Coup de cœur du Ministre section belongs on it.
 *
 * The landing page is what renders until the stored session is known, because
 * it is also what the server rendered: swapping only after `ready` keeps the
 * markup identical through hydration. A signed-in employé therefore sees the
 * landing page for the instant it takes to read the session — unavoidable
 * while the session lives in localStorage rather than a cookie the server can
 * read, and the reason the space also keeps its own address at /espace.
 *
 * A partenaire keeps the landing page: their own space is not built yet, and
 * their account is reached from the menu.
 */
export default function HomeSwitch() {
  const { profile, ready } = useAccount();

  if (!ready || profile?.audience !== "employee") return <LandingPage />;

  return (
    <PageMain snap>
      <EmployeeSpace />
    </PageMain>
  );
}
