"use client";

import AdminSpace from "@/components/admin/AdminSpace";
import EmployeeSpace from "@/components/espace/EmployeeSpace";
import PartnerSpace from "@/components/partenaire/PartnerSpace";
import { useAccount } from "./AccountProvider";

/**
 * L'espace du compte connecté : administration, partenaire, ou salarié.
 *
 * Le choix se fait sur le compte et nulle part ailleurs — ni sur l'adresse, ni
 * sur un réglage. `/espace` mène donc chacun chez soi, et le partenaire qui
 * suit un lien vers l'espace ne tombe plus sur un « réservé aux employés ».
 *
 * Le rôle est lu **avant** l'audience, et il faut le faire dans cet ordre : le
 * profil d'un administrateur porte `audience: "employee"` — il n'est pas
 * partenaire, et c'est tout ce que ce champ dit — si bien qu'un agent de
 * l'administration atterrissait sur l'espace salarié, devant une carte de
 * paiement à 0,00 € qui n'était pas la sienne. L'audience distingue deux
 * façons d'utiliser le dispositif ; le rôle dit de quel côté du guichet on se
 * tient.
 *
 * Le cas « pas encore chargé » et le cas « non connecté » appartiennent aux
 * espaces, qui les traitent déjà : les dupliquer ici ferait trois endroits où
 * corriger la même phrase.
 */
export default function AccountSpace() {
  const { profile } = useAccount();
  if (profile?.role === "admin") return <AdminSpace />;
  return profile?.audience === "partner" ? <PartnerSpace /> : <EmployeeSpace />;
}
