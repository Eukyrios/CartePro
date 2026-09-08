"use client";

import Link from "next/link";
import { useAccount } from "@/components/account/AccountProvider";
import SectionNav from "@/components/layout/SectionNav";
import EmptyState from "@/components/ui/EmptyState";
import Note from "@/components/ui/Note";
import AbondementsSection from "./AbondementsSection";
import ComptesSection from "./ComptesSection";
import DashboardSection from "./DashboardSection";
import PartnerRequestsSection from "./PartnerRequestsSection";
import type { RailSection } from "@/components/layout/SectionNav";

/**
 * Les écrans de l'espace d'administration, dans l'ordre, pour le rail.
 *
 * Le premier ne porte pas de numéro : l'en-tête lui appartient, et le rail y
 * ramène en haut du document plutôt que sur une ancre — même convention que
 * l'accueil, où « Accueil » est la seule entrée sans chiffre.
 */
const SECTIONS: readonly RailSection[] = [
  { id: "tableau-de-bord", index: "", label: "Le dispositif" },
  { id: "demandes", index: "01", label: "Demandes" },
  { id: "comptes", index: "02", label: "Les comptes" },
  { id: "abondements", index: "03", label: "Créditer" },
];

/**
 * L'espace d'administration : instruire, mesurer, doter, puis regarder ce que
 * le dispositif produit.
 *
 * Quatre écrans pleins qui s'accrochent au défilement, avec le même rail que
 * l'accueil et que les deux autres espaces. L'en-tête appartient au premier
 * écran — d'où sa hauteur sous la barre — et le pied de page au dernier, d'où
 * la hauteur amputée de l'écran des abondements : les deux ensemble font
 * exactement une fenêtre.
 *
 * L'ordre suit la journée d'un agent plutôt que l'ordre où les écrans ont été
 * écrits : l'état du dispositif d'abord, les dossiers qui attendent une
 * décision ensuite, les comptes et ce qu'ils ont fait circuler, et pour finir
 * le geste qui les dote — on ne crédite qu'une fois qu'on sait qui.
 *
 * Les trois écrans du milieu portent chacun leur propre appel et leur propre
 * état de chargement. Aucun ne dépend d'un autre : un serveur muet sur les
 * chiffres ne doit pas empêcher d'instruire un dossier.
 *
 * Le troisième écran, « Les comptes », porte les deux côtés d'un paiement :
 * un rang d'établissements et un rang de comptes salariés, chacun menant à
 * l'historique du compte qu'il nomme. Il tient deux fenêtres à lui seul — voir
 * `ComptesSection`, et le rang du haut **est** le catalogue du réseau, pas une
 * copie.
 *
 * Les mesures — suspendre, réactiver, clôturer — ne sont plus un écran de
 * l'espace : elles se prennent là où sont les chiffres du compte, à côté du
 * titre de son historique. Voir `CompteMesures`, sur `/recettes/<slug>` et
 * `/depenses/<id>`.
 *
 * Le garde ci-dessous n'est qu'un confort d'affichage : il évite qu'un compte
 * non-administrateur voie l'interface avant de comprendre qu'elle lui est
 * fermée. La vraie protection est côté serveur — chaque route de `/api/admin`
 * porte `@admin_required` (voir `backend/decorators.py`), donc appeler l'API
 * sans le rôle échoue, garde ou pas.
 */
export default function AdminSpace() {
  const { profile, ready } = useAccount();

  if (!ready) {
    return <EmptyState variant="page">Chargement de l’espace…</EmptyState>;
  }

  if (!profile) {
    return (
      <Note as="div">
        <strong className="font-black">Connexion requise.</strong>{" "}
        Connectez-vous avec un compte administrateur pour accéder à cet espace.{" "}
        <Link href="/" className="font-black underline underline-offset-4">
          Retour à l’accueil
        </Link>
      </Note>
    );
  }

  if (profile.role !== "admin") {
    return (
      <Note as="div" tone="danger" role="alert">
        <strong className="font-black">Accès refusé.</strong> Cet espace est
        réservé aux comptes de l’administration.{" "}
        <Link href="/" className="font-black underline underline-offset-4">
          Retour à l’accueil
        </Link>
      </Note>
    );
  }

  return (
    <>
      {/* L'ordre suit ce qu'un agent fait de sa journée : il regarde où en est
          le dispositif, instruit ce qui attend une décision, lit les comptes et
          ce qu'ils ont fait circuler, et ne dote qu'ensuite — créditer est le
          geste qu'on prend en dernier, quand on sait à qui.

          Aucun compteur de rafraîchissement entre les écrans, et il n'en faut
          pas : une décision se prend sur `/dossier/<slug>`, donc revenir ici
          est une navigation, qui remonte les sections et les fait relire
          toutes seules. */}
      <DashboardSection />

      <PartnerRequestsSection />

      <ComptesSection />

      <AbondementsSection />

      <SectionNav sections={SECTIONS} />
    </>
  );
}
