"use client";

import { useEffect, useState } from "react";
import TransactionsSection from "@/components/transactions/TransactionsSection";
import { getReceivedTransactions } from "./api";
import type { Receipt } from "./api";

/**
 * Le tableau de bord des recettes : ce que le partenaire a encaissé.
 *
 * L'écran lui-même est `transactions/TransactionsSection`, partagé avec
 * l'espace d'administration : filtres, total, tableau et pagination y sont
 * écrits une fois. Ce qui reste ici est ce qui n'est vrai que de ce côté du
 * comptoir — la route, le droit d'encaisser, et les mots.
 *
 * Pas de colonne « Partenaire » : le partenaire qui lit ses propres recettes
 * sait chez qui elles ont eu lieu.
 */
export default function ReceiptsSection({
  refreshKey = 0,
  access = "open",
}: {
  /** Change à chaque encaissement : la liste et le total se refont. */
  refreshKey?: number;
  /**
   * Le droit d'encaisser de l'établissement, qui décide s'il y a quelque chose
   * à demander au serveur.
   *
   * — "open"    : conventionné, l'écran interroge la route.
   * — "locked"  : pas conventionné. L'écran reste dessiné — c'est
   *               `PartnerSpace` qui le barre — mais il ne demande rien et
   *               n'affiche aucune ligne : un compte qui n'a pas le droit
   *               d'encaisser n'a pas de recettes, et en montrer sous les
   *               hachures affirmerait le contraire de la barrière.
   * — "pending" : le droit n'est pas encore connu. Ni requête ni verdict : sans
   *               ce troisième état, la première image était soit un refus
   *               affiché à un partenaire en règle, soit un appel lancé pour
   *               rien puis jeté.
   */
  access?: "pending" | "open" | "locked";
}) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (access === "pending") {
      setState("loading");
      return;
    }
    if (access === "locked") {
      setReceipts([]);
      setState("ready");
      return;
    }
    let cancelled = false;
    getReceivedTransactions()
      .then((rows) => {
        if (cancelled) return;
        setReceipts(rows);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [refreshKey, access]);

  return (
    <TransactionsSection
      id="recettes"
      title="Mes recettes"
      rows={receipts}
      state={state}
      totalLabel="Total encaissé"
      whoLabel="Salarié"
      searchLabel="Salarié ou référence"
      searchPlaceholder="Camille, 42…"
      noun={["encaissement", "encaissements"]}
      zero="Aucun encaissement"
      caption="Encaissements reçus, du plus récent au plus ancien"
      loadingMessage="Chargement de vos encaissements…"
      errorMessage="Vos encaissements n'ont pas pu être chargés. Rechargez la page ; si cela persiste, le serveur ne répond pas."
      emptyMessage={
        access === "locked"
          ? "Aucune recette : votre établissement n'encaisse pas encore."
          : "Aucun encaissement pour l'instant. Le premier code encaissé apparaîtra ici."
      }
      noMatchMessage="Aucun encaissement ne correspond à ces filtres. Élargissez la période ou effacez-les."
    />
  );
}
