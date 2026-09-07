import type { Metadata } from "next";
import PageMain from "@/components/ui/PageMain";
import AdminSpace from "@/components/admin/AdminSpace";

export const metadata: Metadata = {
  title: "Administration | Ticket Tout",
  description: "Panneau d'administration, réservé aux comptes administrateur",
};

export default function AdminPage() {
  return (
    <PageMain pad="y">
      <AdminSpace />
    </PageMain>
  );
}
