"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import HistorySection from "@/components/espace/HistorySection";
import type { Movement } from "@/components/espace/movements";
import { getCompte, getMouvementsCompte, type Compte } from "./api";
import CompteSection from "./CompteSection";
import Breadcrumb from "@/components/ui/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import Note from "@/components/ui/Note";
import PageMain from "@/components/ui/PageMain";
import SectionNav, { type RailSection } from "@/components/layout/SectionNav";

/**
 * Les dépenses d'un salarié, vues par l'administration.
 *
 * Le pendant exact de `PartnerReceipts` de l'autre côté du comptoir, et bâti de
 * la même façon : c'est **le même écran** que « Historique des dépenses » de
 * l'espace du salarié — `espace/HistorySection` — nourri d'une autre route. Le
 * titulaire lit ses mouvements par son jeton, l'administration ceux de
 * n'importe quel compte par son identifiant. Filtres, catégories, solde après
 * chaque opération et pagination sont donc écrits une fois pour les deux.
 *
 * Les crédits d'employeur sont du lot, comme dans l'espace du salarié : sans
 * eux la colonne « solde après » ne voudrait rien dire, et la question « d'où
 * vient cet argent » resterait sans réponse au-dessus d'une liste de débits.
 *
 * En tête de page, la gestion du compte — voir `CompteSection` : son état, ce
 * qu'il porte, les mesures qu'on peut prendre et l'écrit de celles déjà
 * prises. Un agent qui vient lire un historique est souvent celui qui doit
 * décider quelque chose, et la décision se prend au vu des chiffres, qui sont
 * juste en dessous — plutôt que sur un écran de gestion séparé.
 *
 * Le garde ci-dessous n'est qu'un confort d'affichage : la vraie protection est
 * côté serveur, où chaque route porte `@admin_required`.
 */
/**
 * Les deux écrans de la page, pour le rail latéral.
 *
 * Le premier ne porte pas de numéro : l'en-tête lui appartient, et le rail y
 * ramène en haut du document plutôt que sur une ancre — même convention que
 * l'accueil et que l'espace d'administration.
 */
const SECTIONS: readonly RailSection[] = [
  { id: "compte", index: "", label: "Le compte" },
  { id: "historique", index: "01", label: "Les dépenses" },
];

export default function EmployeeSpending({ id }: { id: number }) {
  const { profile, ready } = useAccount();
  const [compte, setCompte] = useState<Compte | null>(null);
  const [etatCompte, setEtatCompte] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [rows, setRows] = useState<readonly Movement[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const admin = ready && profile?.role === "admin";

  /* Les deux appels sont rappelables ensemble : une mesure prise dans la bande
     change l'état du compte, et une clôture peut changer ce que la liste
     montrera ensuite. Relire les deux vaut mieux que rafistoler l'un des deux
     de mémoire. */
  const charger = useCallback(() => {
    if (!admin || !Number.isFinite(id)) return;
    getCompte(id)
      .then((lu) => {
        setCompte(lu);
        setEtatCompte("ready");
      })
      .catch(() => setEtatCompte("error"));
    getMouvementsCompte(id)
      .then((lignes) => {
        setRows(lignes);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [id, admin]);

  useEffect(charger, [charger]);

  if (!ready) {
    return (
      <PageMain>
        <EmptyState variant="page">Chargement de l’écran…</EmptyState>
      </PageMain>
    );
  }

  if (!admin) {
    return (
      <PageMain pad="y">
        <Note as="div" tone="danger" role="alert">
          <strong className="font-black">Accès refusé.</strong> L’historique
          d’un salarié est réservé aux comptes de l’administration.{" "}
          <Link href="/" className="font-black underline underline-offset-4">
            Retour à l’accueil
          </Link>
        </Note>
      </PageMain>
    );
  }

  /* Le nom vient du compte, et le compte peut n'avoir pas répondu : un
     historique s'affiche quand même, et le titre dit alors « ce compte »
     plutôt que d'attendre. */
  const nom = compte ? compte.nom : "ce compte";

  return (
    <PageMain snap>
      {/* La gestion du compte ouvre la page, l'historique la suit : on vient
          souvent ici pour décider — suspendre, clôturer, lire le motif de la
          mesure en cours — et la décision se prend au vu de ce que le compte a
          dépensé, qui est juste en dessous. */}
      <CompteSection
        compte={compte}
        state={etatCompte}
        titre="Le compte de"
        eyebrow={
          <Breadcrumb
            trail={[
              { label: "Administration", href: "/espace" },
              { label: "Les comptes", href: "/espace#comptes" },
              { label: "Le compte" },
            ]}
          />
        }
        onMesure={charger}
      />

      <HistorySection
        rows={rows}
        state={state}
        /* Plus de fil d'Ariane ici : la section du compte ouvre la page et le
           porte. Deux fils sur un même document désigneraient deux origines. */
        eyebrow={
          <Breadcrumb
            /* Le même fil que celui de la page, dans les mêmes couleurs, mais
               en surtitre : il situe le bloc sans être une seconde navigation.
               Voir `as` dans `ui/Breadcrumb`. */
            as="p"
            trail={[
              { label: "Administration" },
              { label: "Les comptes" },
              { label: "Historique des dépenses" },
            ]}
          />
        }
        title="Historique des dépenses de"
        accent={`${nom}.`}
        loadingMessage="Chargement des opérations…"
        errorMessage="Les opérations n’ont pas pu être chargées. Rechargez la page ; si cela persiste, le serveur ne répond pas."
        emptyMessage="Aucune opération sur ce compte. Son premier crédit et ses paiements apparaîtront ici."
      />

      {/* Le rail, comme sur l'accueil et dans les espaces : deux traits
          qui disent où l'on est et mènent à l'autre écran. */}
      <SectionNav sections={SECTIONS} />
    </PageMain>
  );
}
