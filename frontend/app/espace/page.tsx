import type { Metadata } from "next";
import AccountSpace from "@/components/account/AccountSpace";
import PageMain from "@/components/ui/PageMain";

export const metadata: Metadata = {
  title: "Mon espace | CartePro",
  description:
    "Espace salarié CartePro : le réseau de partenaires où utiliser son crédit",
};

export default function EspacePage() {
  return (
    <PageMain snap>
      <AccountSpace />
    </PageMain>
  );
}
