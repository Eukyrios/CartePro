import type { Metadata } from "next";
import PageMain from "@/components/ui/PageMain";
import AccountSettings from "@/components/profile/AccountSettings";

export const metadata: Metadata = {
  title: "Paramètres du compte | CartePro",
  description:
    "Modifier les informations de son profil partenaire ou employé, et supprimer son compte",
};

export default function ParametresPage() {
  // The container matches TopBar's, so the page's left edge lines up with the
  // logo instead of being inset from it. The background lives in the root
  // layout; flex-1 takes the space left between the top and bottom bars.
  return (
    <PageMain pad="y">
      <AccountSettings />
    </PageMain>
  );
}
