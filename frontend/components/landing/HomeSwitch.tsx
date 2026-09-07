"use client";

import AccountSpace from "@/components/account/AccountSpace";
import AdminSpace from "@/components/admin/AdminSpace";
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
 * Les deux audiences ont désormais leur espace, et c'est `AccountSpace` qui
 * choisit : un partenaire connecté est chez lui ici autant qu'un salarié.
 *
 * Un admin n'a ni carte ni réseau à consulter : son accueil est le panneau
 * d'administration lui-même, pas la vitrine ni un espace salarié qui ne le
 * concerne pas. `role` tranche avant `audience`, qui ne distingue que
 * salarié et partenaire.
 */
export default function HomeSwitch() {
  const { profile, ready } = useAccount();

  if (!ready || !profile) return <LandingPage />;

  if (profile.role === "admin") {
    return (
      <PageMain pad="y">
        <AdminSpace />
      </PageMain>
    );
  }

  return (
    <PageMain snap>
      <AccountSpace />
    </PageMain>
  );
}
