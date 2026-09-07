"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEuros } from "@/components/data/ledger";
import { fold } from "@/lib/text";
import { useFilters } from "@/hooks/useFilters";
import Display from "@/components/ui/Display";
import EmptyState from "@/components/ui/EmptyState";
import FilterGrid from "@/components/ui/FilterGrid";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import Pager from "@/components/ui/Pager";
import ResultCount from "@/components/ui/ResultCount";
import Screen from "@/components/ui/Screen";
import SimulationNotice from "@/components/ui/SimulationNotice";
import TextField from "@/components/ui/TextField";
import { MICRO } from "@/components/ui/surfaces";
import { getReceivedTransactions } from "./api";
import type { Receipt } from "./api";

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Lignes par page. La liste défile aussi, donc une fenêtre courte suffit. */
const PER_PAGE = 8;

/** Ce que les filtres retiennent. Les dates sont des jours ISO, qui se trient comme des chaînes. */
type Filters = {
  search: string;
  from: string;
  to: string;
  min: string;
};

const NO_FILTERS: Filters = { search: "", from: "", to: "", min: "" };

/**
 * Le tableau de bord des recettes : ce que le partenaire a encaissé.
 *
 * Lecture seule, et c'est le point : un encaissement est irréversible de ce
 * côté du comptoir, donc rien ici ne permet de le défaire. Le total en tête
 * porte sur ce qui est listé — un chiffre qui ignorerait le filtre au-dessus
 * de la liste qui l'applique inviterait à mal lire.
 *
 * Le filtrage se fait à l'écran parce que la route ne prend pas encore de
 * paramètres ; le jour où elle en prendra, c'est `getReceivedTransactions` qui
 * les passera, et cet écran n'en saura rien.
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
  const [page, setPage] = useState(1);
  const { filters, setFilter, reset, dirty } = useFilters<Filters>(
    NO_FILTERS,
    () => setPage(1),
  );

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

  const matches = useMemo(() => {
    const wanted = fold(filters.search);
    const min = filters.min ? Number(filters.min.replace(",", ".")) * 100 : 0;
    return receipts.filter((receipt) => {
      /* Les dix premiers caractères d'un horodatage ISO sont son jour, et les
         jours ISO se comparent correctement comme des chaînes — pas de Date à
         analyser, pas de fuseau à rater. */
      const day = receipt.at.slice(0, 10);
      if (filters.from && day < filters.from) return false;
      if (filters.to && day > filters.to) return false;
      if (min && receipt.amountCents < min) return false;
      if (
        wanted &&
        !fold(receipt.label).includes(wanted) &&
        !receipt.id.includes(wanted)
      ) {
        return false;
      }
      return true;
    });
  }, [receipts, filters]);

  const total = useMemo(
    () => matches.reduce((sum, receipt) => sum + receipt.amountCents, 0),
    [matches],
  );
  const grandTotal = useMemo(
    () => receipts.reduce((sum, receipt) => sum + receipt.amountCents, 0),
    [receipts],
  );

  const pages = Math.max(1, Math.ceil(matches.length / PER_PAGE));
  const current = Math.min(page, pages);
  const rows = matches.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <Screen id="recettes">
      <Display level={2} accent="." br={false} className="mb-4">
        Mes recettes
      </Display>
      <SimulationNotice className="mb-8 block">
        Simulation — montants de démonstration
      </SimulationNotice>

      {/* Le total, en tête, à taille d'affichage : c'est le chiffre qu'on vient
          chercher. */}
      <div className="border-t-cp-fg border-b-cp-border mb-8 flex flex-wrap items-baseline gap-x-8 gap-y-2 border-t-2 border-b py-5">
        <Micro as="p" tone="muted">
          Total encaissé
        </Micro>
        <p
          aria-live="polite"
          className="text-cp-fg text-[clamp(28px,4vw,44px)] leading-none font-black tracking-[-0.05em] tabular-nums"
        >
          {formatEuros(total)}
        </p>
        {dirty && (
          <Micro as="p" tone="muted">
            sur {formatEuros(grandTotal)} au total
          </Micro>
        )}
      </div>

      <FilterGrid>
        <TextField
          id="recettes-recherche"
          label="Salarié ou référence"
          value={filters.search}
          onChange={(value) => setFilter("search", value)}
          placeholder="Camille, 42…"
          type="search"
        />
        {/* Sélecteurs de date natifs : ils portent le calendrier de la locale
            et la saisie clavier qui va avec. `max`/`min` tiennent la paire dans
            l'ordre, donc l'intervalle ne peut pas être inversé. */}
        <TextField
          id="recettes-du"
          label="Du"
          type="date"
          value={filters.from}
          onChange={(value) => setFilter("from", value)}
          max={filters.to || undefined}
        />
        <TextField
          id="recettes-au"
          label="Au"
          type="date"
          value={filters.to}
          onChange={(value) => setFilter("to", value)}
          min={filters.from || undefined}
        />
        <TextField
          id="recettes-min"
          label="Montant minimum"
          value={filters.min}
          onChange={(value) => setFilter("min", value)}
          inputMode="decimal"
          placeholder="10"
          hint="En euros."
        />
      </FilterGrid>

      <ResultCount
        count={matches.length}
        noun={["encaissement", "encaissements"]}
        zero="Aucun encaissement"
        onReset={dirty ? reset : undefined}
      />

      {state === "loading" ? (
        <EmptyState>Chargement de vos encaissements…</EmptyState>
      ) : state === "error" ? (
        <Note tone="danger" role="alert" className="mt-3">
          Vos encaissements n&apos;ont pas pu être chargés. Rechargez la page ;
          si cela persiste, le serveur ne répond pas.
        </Note>
      ) : matches.length === 0 ? (
        <EmptyState>
          {access === "locked"
            ? "Aucune recette : votre établissement n'encaisse pas encore."
            : receipts.length === 0
              ? "Aucun encaissement pour l'instant. Le premier code encaissé apparaîtra ici."
              : "Aucun encaissement ne correspond à ces filtres. Élargissez la période ou effacez-les."}
        </EmptyState>
      ) : (
        /* Défile dans l'écran plutôt que de l'étirer. */
        <div className="mt-3 max-h-[46vh] overflow-y-auto">
          <table className="border-t-cp-fg w-full border-t-2 text-left">
            <caption className="sr-only">
              Encaissements reçus, du plus récent au plus ancien
            </caption>
            <thead className="bg-cp-page sticky top-0">
              <tr className={`border-cp-border border-b ${MICRO}`}>
                <th scope="col" className="py-3 font-black">
                  Date
                </th>
                <th scope="col" className="py-3 font-black">
                  Salarié
                </th>
                <th scope="col" className="py-3 text-right font-black">
                  Montant
                </th>
                <th
                  scope="col"
                  className="hidden py-3 text-right font-black sm:table-cell"
                >
                  Référence
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((receipt) => (
                <tr key={receipt.id} className="border-cp-border border-b">
                  <td className="text-cp-muted py-4 text-[13px] whitespace-nowrap">
                    {DATE.format(new Date(receipt.at))}
                  </td>
                  <td className="text-cp-fg py-4 pr-4 text-[15px] font-black tracking-[-0.02em]">
                    {receipt.label}
                  </td>
                  <td className="text-cp-positive py-4 text-right text-[15px] font-black tabular-nums">
                    +{formatEuros(receipt.amountCents)}
                  </td>
                  <td className="text-cp-muted hidden py-4 text-right text-[13px] tabular-nums sm:table-cell">
                    n° {receipt.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <Pager
          onPrev={() => setPage(current - 1)}
          onNext={() => setPage(current + 1)}
          prevLabel="Page précédente"
          nextLabel="Page suivante"
          position={[current, pages]}
          atStart={current === 1}
          atEnd={current === pages}
          className="mt-6"
        />
      )}
    </Screen>
  );
}
