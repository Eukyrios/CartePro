"use client";

import { useMemo, useRef, useState } from "react";
import { Arrow } from "@/components/home/Marks";
import PartnerPhoto from "./PartnerPhoto";
import { partnerCategoryLabel } from "@/components/data/partnerCategories";
import {
  categoriesInUse,
  partnerCities,
  searchPartners,
} from "@/components/data/partners";
import SelectField from "@/components/ui/SelectField";
import TextField from "@/components/ui/TextField";
import { BTN_OUTLINE, MICRO } from "@/components/ui/surfaces";
import PaymentDialog from "@/components/espace/PaymentDialog";
import type { Partner } from "@/components/data/partners";

/** Everything the filters hold. Page is reset whenever any of them changes. */
type Filters = {
  search: string;
  categoryId: string;
  city: string;
  postcode: string;
};

/** Past this much horizontal travel a release turns the page. */
const SWIPE_THRESHOLD = 80;

const NO_FILTERS: Filters = {
  search: "",
  categoryId: "",
  city: "",
  postcode: "",
};

/**
 * The partner catalogue: search, filters on the three location fields, and
 * pagination.
 *
 * Categories come from the data (see data/partnerCategories and data/partners),
 * so one can be added, renamed or removed without an edit here, and a category
 * with no partners behind it does not offer itself as a filter that could only
 * return nothing.
 *
 * Location is address, city and postcode — the fields the space filters on.
 * There is deliberately no map.
 */
export default function PartnerCatalogue() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  /** Live pointer travel in px, or null when no swipe is in progress. */
  const [drag, setDrag] = useState<number | null>(null);
  const startX = useRef(0);
  /** How far the last gesture travelled, so a swipe is not read as a tap. */
  const travelled = useRef(0);
  const [paying, setPaying] = useState<Partner | null>(null);

  const categories = useMemo(
    () =>
      categoriesInUse().map((category) => ({
        value: category.id,
        label: category.label,
      })),
    [],
  );
  const cities = useMemo(() => partnerCities(), []);

  // searchPartners clamps the page itself, so a filter change that shortens the
  // list can never leave the view on a page that no longer exists.
  const result = useMemo(
    () => searchPartners({ ...filters, page }),
    [filters, page],
  );

  function setFilter<K extends keyof Filters>(field: K, value: Filters[K]) {
    setPage(1);
    setFilters((current) => ({ ...current, [field]: value }));
  }

  /* Swiping the row is the primary way through the pages; the buttons below
     are the same two moves for a pointer that does not drag, and the arrow
     keys for one that has no pointer at all. The mechanics are the deck's:
     capture the pointer, follow it, and rubber-band at the ends so a swipe
     that cannot go anywhere says so instead of doing nothing. */
  function handlePointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    startX.current = event.clientX;
    travelled.current = 0;
    setDrag(0);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (drag === null) return;
    const travel = event.clientX - startX.current;
    travelled.current = Math.abs(travel);
    const blocked =
      (travel < 0 && result.page === result.pages) ||
      (travel > 0 && result.page === 1);
    setDrag(blocked ? travel * 0.28 : travel);
  }

  function handlePointerUp() {
    if (drag === null) return;
    if (drag <= -SWIPE_THRESHOLD)
      setPage(Math.min(result.page + 1, result.pages));
    else if (drag >= SWIPE_THRESHOLD) setPage(Math.max(result.page - 1, 1));
    setDrag(null);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setPage(
      event.key === "ArrowRight"
        ? Math.min(result.page + 1, result.pages)
        : Math.max(result.page - 1, 1),
    );
  }

  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

  return (
    /* No heading of its own: the space's own heading already introduces the
       page, and the filters say what this section is. The label keeps the
       landmark named for assistive technology. */
    <section
      id="reseau"
      aria-label="Catalogue des partenaires"
      className="grid min-h-screen snap-start content-center py-16"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          id="catalogue-search"
          label="Nom ou adresse"
          value={filters.search}
          onChange={(value) => setFilter("search", value)}
          placeholder="Crêperie, rue Sainte…"
          type="search"
        />
        <SelectField
          id="catalogue-categorie"
          label="Catégorie"
          value={filters.categoryId}
          onChange={(value) => setFilter("categoryId", value)}
          options={categories}
          placeholder="Toutes les catégories"
          emptyLabel="Aucune catégorie disponible"
        />
        <TextField
          id="catalogue-ville"
          label="Ville"
          value={filters.city}
          onChange={(value) => setFilter("city", value)}
          placeholder={cities[0] ?? "Ville"}
          list="catalogue-villes"
        />
        {/* Suggestions rather than a closed list: the field filters on a
            fragment, so "Pari" and "Paris" both work. */}
        <datalist id="catalogue-villes">
          {cities.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
        <TextField
          id="catalogue-code-postal"
          label="Code postal"
          value={filters.postcode}
          onChange={(value) => setFilter("postcode", value)}
          sanitise={(raw) => raw.replace(/\D/g, "").slice(0, 5)}
          inputMode="numeric"
          maxLength={5}
          placeholder="75002"
          hint="Un préfixe suffit : 75 pour Paris."
        />
      </div>

      <div className="border-t-cp-fg mt-9 flex flex-wrap items-baseline gap-4 border-t-2 pt-4">
        <p aria-live="polite" className={`text-cp-fg ${MICRO}`}>
          {result.total === 0
            ? "Aucun partenaire"
            : `${result.total} partenaire${result.total > 1 ? "s" : ""}`}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setFilters(NO_FILTERS);
              setPage(1);
            }}
            className={`text-cp-accent ms-auto underline underline-offset-4 ${MICRO}`}
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {result.total === 0 ? (
        <p className="text-cp-muted border-cp-border border-b py-10 text-sm">
          Aucun partenaire ne correspond à cette recherche. Essayez un autre
          nom, une autre ville, ou effacez les filtres.
        </p>
      ) : (
        <ul
          role="group"
          aria-label="Partenaires, trois par page — glissez pour parcourir"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDrag(null)}
          data-dragging={drag !== null ? "true" : undefined}
          style={{ transform: `translateX(${drag ?? 0}px)` }}
          className="partner-row focus-visible:outline-cp-accent mt-5 grid touch-pan-y gap-5 select-none focus-visible:outline-2 focus-visible:outline-offset-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {result.items.map((partner) => (
            <li key={partner.id}>
              {/* A tile is the way to pay: clicking one opens the payment
                  dialog for that partner. A button, so the keyboard reaches it
                  and it announces itself as an action. */}
              <button
                type="button"
                onClick={() => {
                  // A drag that happens to end on a tile is a swipe, not a
                  // choice of partner.
                  if (travelled.current > 6) return;
                  setPaying(partner);
                }}
                className="border-cp-border group hover:border-cp-fg focus-visible:outline-cp-accent h-full w-full cursor-pointer border text-left focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <PartnerPhoto partner={partner} />

                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 p-4">
                  <span className={`text-cp-accent ${MICRO}`}>
                    {partnerCategoryLabel(partner.categoryId)}
                  </span>
                  <Arrow className="text-cp-accent ms-auto" />
                  {/* Address, city and postcode: the location, in full, with no
                      map to open. */}
                  <address className="text-cp-muted basis-full text-[13px] leading-[1.5] not-italic">
                    {partner.address}
                    <br />
                    {partner.postcode} {partner.city}
                  </address>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {paying && (
        <PaymentDialog partner={paying} onClose={() => setPaying(null)} />
      )}

      {result.pages > 1 && (
        <nav
          aria-label="Pages du catalogue"
          className="mt-7 flex items-center gap-4"
        >
          <button
            type="button"
            onClick={() => setPage(result.page - 1)}
            disabled={result.page === 1}
            className={`${BTN_OUTLINE} px-4`}
          >
            <span aria-hidden="true">←</span>
            <span className="sr-only">Page précédente</span>
          </button>
          <button
            type="button"
            onClick={() => setPage(result.page + 1)}
            disabled={result.page === result.pages}
            className={`${BTN_OUTLINE} px-4`}
          >
            <span aria-hidden="true">→</span>
            <span className="sr-only">Page suivante</span>
          </button>
          <p aria-live="polite" className={`text-cp-fg ${MICRO}`}>
            Page {String(result.page).padStart(2, "0")}
            <span className="text-cp-accent px-1.5">/</span>
            {String(result.pages).padStart(2, "0")}
          </p>
        </nav>
      )}
    </section>
  );
}
