"use client";

import Link from "next/link";
import { useAccount } from "@/components/account/AccountProvider";
import SectionNav from "@/components/layout/SectionNav";
import PartnerCatalogue, {
  estConventionne,
} from "@/components/espace/PartnerCatalogue";
import EmptyState from "@/components/ui/EmptyState";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import Slash from "@/components/ui/Slash";
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
  { id: "demandes", index: "", label: "Demandes" },
  { id: "recettes", index: "01", label: "Recettes" },
];

/**
 * L'espace d'administration : instruire les dossiers, puis voir le réseau
 * qu'on a conventionné.
 *
 * Deux écrans pleins qui s'accrochent au défilement, avec le même rail que
 * l'accueil et que les deux autres espaces. L'en-tête appartient au premier
 * écran — d'où sa hauteur sous la barre — et le pied de page au dernier, d'où
 * `last` sur le catalogue : les deux ensemble font exactement une fenêtre.
 *
 * Le second écran **est** celui du réseau, pas une copie : c'est
 * `PartnerCatalogue`, avec un prédicat plus étroit et une autre destination.
 * Un administrateur regarde la même liste qu'un salarié, avec une exigence
 * différente — les conventionnés seulement — et il ne vient pas y chercher la
 * même chose : chaque tuile mène aux **recettes** de l'établissement, quand
 * celle du salarié mène à sa fiche. D'où le titre « Les recettes ». Recopier le
 * composant aurait fait deux réseaux à maintenir.
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
      {/* Aucun compteur de rafraîchissement entre les deux écrans, et il n'en
          faut pas : la décision se prend sur `/dossier/<slug>`, donc
          revenir ici est une navigation, qui remonte les deux sections et les
          fait relire toutes seules. */}
      <PartnerRequestsSection />

      <PartnerCatalogue
        id="recettes"
        heading="Les recettes"
        eyebrow={
          <Micro as="p" tone="accent">
            Administration
            <Slash />
            Historique des paiements
          </Micro>
        }
        keep={estConventionne}
        /* Une tuile mène aux recettes de l'établissement, pas à sa fiche : la
           fiche est ce qu'un salarié vient lire, et l'administration vient
           lire ce qui a été encaissé. */
        hrefOf={(partner) => `/recettes/${partner.id}`}
        last
      />

      <SectionNav sections={SECTIONS} />
    </>
  );
}
