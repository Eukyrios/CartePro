"use client";

import EmployeeSpace from "@/components/espace/EmployeeSpace";
import PartnerSpace from "@/components/partenaire/PartnerSpace";
import { useAccount } from "./AccountProvider";

/**
 * L'espace du compte connecté : celui du salarié, ou celui du partenaire.
 *
 * Le choix se fait sur l'audience du compte et nulle part ailleurs — ni sur
 * l'adresse, ni sur un réglage. `/espace` mène donc chacun chez soi, et le
 * partenaire qui suit un lien vers l'espace ne tombe plus sur un « réservé aux
 * employés ».
 *
 * Le cas « pas encore chargé » et le cas « non connecté » appartiennent aux
 * deux espaces, qui les traitent déjà : les dupliquer ici ferait deux endroits
 * où corriger la même phrase.
 */
export default function AccountSpace() {
  const { profile } = useAccount();
  return profile?.audience === "partner" ? <PartnerSpace /> : <EmployeeSpace />;
}
