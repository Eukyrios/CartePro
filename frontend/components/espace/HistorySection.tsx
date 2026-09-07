"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEuros } from "@/components/data/ledger";
import { categoryLabel, useCategories } from "@/components/data/useCategories";
import { getMovements, type Movement } from "./movements";
import { fold } from "@/lib/text";
import { useFilters } from "@/hooks/useFilters";
import Display from "@/components/ui/Display";
import EmptyState from "@/components/ui/EmptyState";
import FilterGrid from "@/components/ui/FilterGrid";
import Micro from "@/components/ui/Micro";
import Pager from "@/components/ui/Pager";
import ResultCount from "@/components/ui/ResultCount";
import Screen from "@/components/ui/Screen";
import SelectField from "@/components/ui/SelectField";
import SimulationNotice from "@/components/ui/SimulationNotice";
import TextField from "@/components/ui/TextField";
import Note from "@/components/ui/Note";
import { MICRO } from "@/components/ui/surfaces";

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Rows per page. The list also scrolls, so a short window is not a cage. */
const PER_PAGE = 8;

const KINDS = [
  { value: "credit", label: "Crédits" },
  { value: "debit", label: "Paiements" },
];

/**
 * Every movement, newest first, with the balance as it stood after each one —
 * a history of amounts alone leaves the reader adding up in their head.
 *
 * Filtered by kind and by name, paged, and scrollable inside its own screen:
 * the section snaps as one screen, so the list cannot be allowed to grow the
 * page indefinitely. The running balance is computed over every transaction,
 * not over the filtered set, or filtering would rewrite history.
 *
 * Debits are printed with a minus because a movement has a direction; the card
 * is the surface that only ever shows the balance itself.
 */
/** Everything the filters hold. Dates are ISO days, which sort as strings. */
type Filters = {
  search: string;
  kind: string;
  categoryId: string;
  from: string;
  to: string;
};

const NO_FILTERS: Filters = {
  search: "",
  kind: "",
  categoryId: "",
  from: "",
  to: "",
};

/**
 * La catégorie d'une opération : celle du partenaire, portée par la ligne
 * elle-même.
 *
 * Elle était résolue dans une liste de partenaires écrite en dur ; le serveur
 * la donne maintenant avec chaque mouvement. Un crédit de l'employeur n'a pas
 * de partenaire, donc pas de catégorie — c'est pourquoi en choisir une exclut
 * les crédits au lieu de les afficher sans étiquette.
 */
function categoryOf(entry: Movement) {
  return entry.partnerCategorie || undefined;
}

export default function HistorySection() {
  const [entries, setEntries] = useState<readonly Movement[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const { categories: referentiel } = useCategories();
  const [page, setPage] = useState(1);
  // Toute retouche de filtre ramène à la première page : rester en page 4 d'un
  // résultat qui n'en compte plus qu'une afficherait un vide.
  const { filters, setFilter, reset, dirty } = useFilters<Filters>(
    NO_FILTERS,
    () => setPage(1),
  );
  const { search, kind, categoryId, from, to } = filters;

  /* L'historique vient du serveur — crédits de l'employeur et paiements dans
     la même liste. Il venait d'un registre tenu dans le navigateur, qui
     racontait sa propre histoire à côté de la vraie : le solde affiché sur la
     carte était celui du compte, et l'historique en dessous celui du
     localStorage. Deux vérités pour un même argent. */
  useEffect(() => {
    let cancelled = false;
    getMovements()
      .then((rows) => {
        if (cancelled) return;
        setEntries(rows);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Oldest first for the running total, then keyed by id for lookup.
  const running = useMemo(() => {
    const totals = new Map<string, number>();
    let total = 0;
    for (const entry of [...entries].reverse()) {
      total += entry.kind === "credit" ? entry.amountCents : -entry.amountCents;
      totals.set(entry.id, total);
    }
    return totals;
  }, [entries]);

  const matches = useMemo(() => {
    const wanted = fold(search);
    return entries.filter((entry) => {
      // An ISO timestamp's first ten characters are its calendar day, and ISO
      // days compare correctly as plain strings — no Date parsing needed, and
      // no timezone to get wrong.
      const day = entry.at.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (kind && entry.kind !== kind) return false;
      if (categoryId && categoryOf(entry) !== categoryId) {
        return false;
      }
      if (wanted && !fold(entry.label).includes(wanted)) return false;
      return true;
    });
  }, [entries, kind, categoryId, search, from, to]);

  // Only the categories this history actually contains, in the order the
  // category data declares them: a filter that could only ever return nothing
  // is not worth offering.
  const categories = useMemo(() => {
    const present = new Set(entries.map(categoryOf).filter(Boolean));
    return referentiel
      .filter((category) => present.has(category.id))
      .map((category) => ({ value: category.id, label: category.label }));
  }, [entries, referentiel]);

  const pages = Math.max(1, Math.ceil(matches.length / PER_PAGE));
  const current = Math.min(page, pages);
  const rows = matches.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    /* Dernier écran de l'espace : il laisse la place du pied de page, pour
       que les deux ensemble fassent un écran. Et pas de filet bas — le pied
       de page est déjà une frontière. */
    <Screen id="historique" height="screen-minus-footer" rule={false}>
      <Display level={2} accent="." br={false} className="mb-4">
        Historique
      </Display>
      {/* Plus de « Réinitialiser la démonstration » : ce bouton effaçait un
          registre tenu dans le navigateur, qui n'existe plus. Le solde et les
          opérations sont ceux du serveur, et les remettre à zéro est un
          `make seed` — pas un clic dans l'interface d'un salarié. */}
      <div className="mb-8">
        <SimulationNotice>Simulation — montants fictifs</SimulationNotice>
      </div>

      <FilterGrid>
        <TextField
          id="historique-recherche"
          label="Rechercher"
          value={search}
          onChange={(value) => setFilter("search", value)}
          placeholder="Chapelier, employeur…"
          type="search"
        />
        <SelectField
          id="historique-type"
          label="Type d'opération"
          value={kind}
          onChange={(value) => setFilter("kind", value)}
          options={KINDS}
          placeholder="Toutes les opérations"
        />
        <SelectField
          id="historique-categorie"
          label="Catégorie"
          value={categoryId}
          onChange={(value) => setFilter("categoryId", value)}
          options={categories}
          placeholder="Toutes les catégories"
          emptyLabel="Aucune catégorie dans l'historique"
        />
        {/* Native date pickers: they carry the locale's own calendar, and the
            keyboard entry that comes with it. `max`/`min` keep the pair in
            order, so the range cannot be inverted into an empty result. */}
        <TextField
          id="historique-du"
          label="Du"
          type="date"
          value={from}
          onChange={(value) => setFilter("from", value)}
          max={to || undefined}
        />
        <TextField
          id="historique-au"
          label="Au"
          type="date"
          value={to}
          onChange={(value) => setFilter("to", value)}
          min={from || undefined}
        />
      </FilterGrid>

      <ResultCount
        count={matches.length}
        noun={["opération", "opérations"]}
        zero="Aucune opération"
        onReset={dirty ? reset : undefined}
      />

      {state === "loading" ? (
        <EmptyState>Chargement de vos opérations…</EmptyState>
      ) : state === "error" ? (
        <Note tone="danger" role="alert" className="mt-3">
          Vos opérations n&apos;ont pas pu être chargées. Rechargez la page ; si
          cela persiste, le serveur ne répond pas.
        </Note>
      ) : matches.length === 0 ? (
        <EmptyState>
          {entries.length === 0
            ? "Aucune opération pour l'instant. Votre premier crédit et vos paiements apparaîtront ici."
            : "Aucune opération ne correspond à ces filtres. Élargissez la période ou effacez les filtres."}
        </EmptyState>
      ) : (
        /* Scrolls inside the screen rather than stretching it. */
        <div className="mt-3 max-h-[46vh] overflow-y-auto">
          <table className="border-t-cp-fg w-full border-t-2 text-left">
            <caption className="sr-only">
              Opérations du compte, de la plus récente à la plus ancienne
            </caption>
            <thead className="bg-cp-page sticky top-0">
              <tr className={`border-cp-border border-b ${MICRO}`}>
                <th scope="col" className="py-3 font-black">
                  Date
                </th>
                <th scope="col" className="py-3 font-black">
                  Opération
                </th>
                <th scope="col" className="py-3 text-right font-black">
                  Montant
                </th>
                <th
                  scope="col"
                  className="hidden py-3 text-right font-black sm:table-cell"
                >
                  Solde après
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.id} className="border-cp-border border-b">
                  <td className="text-cp-muted py-4 text-[13px] whitespace-nowrap">
                    {DATE.format(new Date(entry.at))}
                  </td>
                  <td className="py-4 pr-4">
                    <span className="text-cp-fg text-[15px] font-black tracking-[-0.02em]">
                      {entry.label}
                    </span>
                    <Micro tone="muted" className="mt-1 block">
                      {entry.kind === "credit"
                        ? "Crédit"
                        : categoryOf(entry)
                          ? `Paiement · ${categoryLabel(categoryOf(entry)!, referentiel)}`
                          : "Paiement"}
                    </Micro>
                  </td>
                  <td
                    className={`py-4 text-right text-[15px] font-black tabular-nums ${
                      entry.kind === "credit"
                        ? "text-cp-positive"
                        : "text-cp-fg"
                    }`}
                  >
                    {entry.kind === "credit" ? "+" : "−"}
                    {formatEuros(entry.amountCents)}
                  </td>
                  <td className="text-cp-muted hidden py-4 text-right text-[13px] tabular-nums sm:table-cell">
                    {formatEuros(running.get(entry.id) ?? 0)}
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
