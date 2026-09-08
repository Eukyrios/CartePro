"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import HistorySection from "@/components/espace/HistorySection";
import type { Movement } from "@/components/espace/movements";
import { getCompte, getMouvementsCompte, type Compte } from "./api";
import CompteMesures from "./CompteMesures";
import Breadcrumb from "@/components/ui/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import Note from "@/components/ui/Note";
import PageMain from "@/components/ui/PageMain";

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
 * À côté du titre, l'état du compte et les mesures qu'on peut prendre — voir
 * `CompteMesures`. Un agent qui vient lire un historique est souvent celui qui
 * doit décider quelque chose : la décision se prend donc là où sont les
 * chiffres, et non sur un écran de gestion séparé.
 *
 * Le garde ci-dessous n'est qu'un confort d'affichage : la vraie protection est
 * côté serveur, où chaque route porte `@admin_required`.
 */
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
    <PageMain>
      <HistorySection
        rows={rows}
        state={state}
        /* L'état du compte et ses mesures, à côté du titre qui le nomme : un
           agent qui vient lire un historique est souvent celui qui doit
           décider quelque chose, et la décision se prend là où sont les
           chiffres. */
        aside={
          <CompteMesures
            compte={compte}
            state={etatCompte}
            onMesure={charger}
          />
        }
        /* Le même en-tête que les recettes d'un partenaire : les deux écrans
           s'ouvrent depuis une liste, et on en repart par le même geste — une
           entrée du fil d'Ariane, qui nomme sa destination. */
        eyebrow={
          <Breadcrumb
            trail={[
              { label: "Administration", href: "/espace" },
              { label: "Les comptes", href: "/espace#comptes" },
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
    </PageMain>
  );
}
