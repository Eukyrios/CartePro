"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Arrow } from "@/components/home/Marks";
import PartnerPhoto from "./PartnerPhoto";
import { partnerCategoryLabel } from "@/components/data/partnerCategories";
import {
  categoriesInUse,
  matchingPartnerList,
  partnerById,
  type Partner,
} from "@/components/data/partners";
import { api, type ApiPartner } from "@/lib/api";
import SelectField from "@/components/ui/SelectField";
import TextField from "@/components/ui/TextField";
import { BTN_OUTLINE, MICRO } from "@/components/ui/surfaces";

/** Everything the filters hold. */
type Filters = {
  search: string;
  categoryId: string;
  city: string;
  postcode: string;
};

const NO_FILTERS: Filters = {
  search: "",
  categoryId: "",
  city: "",
  postcode: "",
};

/** Copies of the list laid end to end, so the seam is never on screen. */
const COPIES = 3;

/** Drift speed, px per millisecond — about 40px a second. */
const DRIFT = 0.04;

/**
 * The partner catalogue: search, filters on the three location fields, and a
 * row that drifts through every match.
 *
 * The network comes from /api/partenaires/catalogue, and its ids are slugs —
 * the same ones the payment page resolves, because the seed writes the slug
 * into each partner account and the endpoint returns it instead of the database
 * key. That is what makes a tile lead somewhere: an integer key pre-rendered
 * nowhere gave a 404 on every click.
 *
 * Categories and cities are derived from what the API returns, so nothing here
 * holds a list. Until it answers, the categories fall back to the local data's,
 * which keeps the filter usable rather than empty.
 *
 * Location is address, city and postcode — the fields the space filters on.
 * There is deliberately no map.
 *
 * The row drifts and can be pushed either way by hand. It replaced pages of
 * three: the network is a list one browses, so it may as well come past on its
 * own, and a filter leaving eleven matches reads better as one moving row than
 * as four pages to click through. Drift stops under the pointer or a focused
 * tile — reading should not be a moving target — and never starts at all under
 * `prefers-reduced-motion`.
 *
 * How the loop is seamless: the list is rendered three times end to end and the
 * offset is applied modulo the width of one copy, so the track always shows the
 * middle of an apparently endless row. There is no jump to hide, because the
 * position never actually resets.
 *
 * The offset is a ref mutated inside requestAnimationFrame and written straight
 * to the transform, not React state: sixty renders a second to move a row would
 * re-render every tile in it.
 */
export default function PartnerCatalogue() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const trackRef = useRef<HTMLUListElement>(null);
  const motion = useRef({
    offset: 0,
    /** Where a button press is easing to, or null while drifting. */
    target: null as number | null,
    /** Pointer or focus inside the row: reading should not be a moving target. */
    hovered: false,
    drag: null as { pointerX: number; from: number } | null,
    copyWidth: 0,
  });
  /** Set while a drag is in progress, read by the tiles' click handler. */
  const dragged = useRef(false);

  useEffect(() => {
    api<ApiPartner[]>("/api/partenaires/catalogue")
      .then((items) =>
        setPartners(
          items.map((item) => ({
            id: item.id,
            name: item.nom,
            categoryId: item.secteur,
            address: item.adresse || "Adresse non renseignée",
            city: item.ville || "",
            postcode: item.codePostal || "",
            /* La photographie du partenaire si la base en donne une, sinon
               celle que les données locales portent pour ce slug : un compte
               partenaire créé depuis l'interface n'a pas encore d'image. */
            photo:
              item.photo ||
              partnerById(item.id)?.photo ||
              "/partenaires/glaces-correze.svg",
            amountCents: item.amountCents,
            /* Le conventionnement vient de la base, et de nulle part ailleurs :
               `featured` est le coup de cœur du Ministre, une sélection de
               goût, et l'employer ici apposerait un tampon administratif
               dessus. Un badge absent se corrige, un badge faux se croit. */
            official: item.officiel,
          })),
        ),
      )
      .finally(() => setLoaded(true));
  }, []);

  const categories = useMemo(
    () =>
      (partners.length
        ? [...new Set(partners.map((partner) => partner.categoryId))]
        : categoriesInUse().map((category) => category.id)
      ).map((categoryId) => ({
        value: categoryId,
        label: partnerCategoryLabel(categoryId),
      })),
    [partners],
  );
  const cities = useMemo(
    () =>
      [...new Set(partners.map((partner) => partner.city))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "fr")),
    [partners],
  );

  // Every match, not a page of them: the row shows the whole result, and the
  // predicate is the data module's — the same one a page would use.
  const matches = useMemo(
    () => matchingPartnerList(partners, filters),
    [partners, filters],
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track || matches.length === 0) return;

    /* A filter that changes the row's contents changes its width too, so the
       old offset would land anywhere. The new row starts at its beginning. */
    motion.current.offset = 0;
    motion.current.target = null;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = performance.now();

    function step(now: number) {
      const dt = Math.min(now - last, 64); // a backgrounded tab must not lurch
      last = now;
      const m = motion.current;
      m.copyWidth = track!.scrollWidth / COPIES;

      if (!m.drag) {
        if (m.target !== null) {
          // Ease towards the button's target, then hand back to the drift.
          const remaining = m.target - m.offset;
          if (Math.abs(remaining) < 0.5) {
            m.offset = m.target;
            m.target = null;
          } else {
            m.offset += remaining * Math.min(1, dt / 110);
          }
        } else if (!m.hovered && !reduced.matches) {
          m.offset += DRIFT * dt;
        }
      }

      if (m.copyWidth > 0) {
        /* Applied modulo one copy: the offset itself keeps growing, so an
           easing target never has to be wrapped mid-animation. */
        const wrapped = ((m.offset % m.copyWidth) + m.copyWidth) % m.copyWidth;
        track!.style.transform = `translateX(${-wrapped}px)`;
      }
      frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [matches]);

  /** One tile plus its gap, so a press advances by exactly one card. */
  function stride() {
    const track = trackRef.current;
    if (!track || !track.firstElementChild) return 320;
    const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    return (track.firstElementChild as HTMLElement).offsetWidth + gap;
  }

  function nudge(direction: 1 | -1) {
    const m = motion.current;
    m.target = (m.target ?? m.offset) + direction * stride();
  }

  function setFilter<K extends keyof Filters>(field: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    /* No setPointerCapture here, deliberately. A container that captures the
       pointer on pointerdown becomes the target of the click that follows, so
       the tile's link never received it and clicking a partner did nothing.
       Capture is taken in handlePointerMove instead, once the gesture has
       proved itself a drag — a plain click then never involves capture at all. */
    motion.current.drag = {
      pointerX: event.clientX,
      from: motion.current.offset,
    };
    motion.current.target = null;
    dragged.current = false;
  }

  function handlePointerMove(event: React.PointerEvent) {
    const drag = motion.current.drag;
    if (!drag) return;
    if (Math.abs(event.clientX - drag.pointerX) > 6) {
      dragged.current = true;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
    // Dragging left pulls the row left, which means a larger offset.
    motion.current.offset = drag.from - (event.clientX - drag.pointerX);
  }

  function endDrag() {
    motion.current.drag = null;
    // After the click that follows this release, so the guard above still sees
    // it, but never outliving the gesture.
    window.setTimeout(() => (dragged.current = false), 0);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    nudge(event.key === "ArrowRight" ? 1 : -1);
  }

  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

  return (
    <section
      id="reseau"
      aria-labelledby="reseau-titre"
      className="grid min-h-screen snap-start content-center py-16"
    >
      {/* Titled like the other screens of the space. */}
      <h2
        id="reseau-titre"
        className="mb-8 text-[clamp(34px,4.4vw,58px)] leading-[0.86] font-black tracking-[-0.07em]"
      >
        Le réseau
        <em className="text-cp-accent font-serif font-normal">.</em>
      </h2>

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
          {matches.length === 0
            ? "Aucun partenaire"
            : `${matches.length} partenaire${matches.length > 1 ? "s" : ""}`}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={() => setFilters(NO_FILTERS)}
            className={`text-cp-accent ms-auto underline underline-offset-4 ${MICRO}`}
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {!loaded ? (
        <p className="text-cp-muted border-cp-border border-b py-10 text-sm">
          Chargement du réseau…
        </p>
      ) : matches.length === 0 ? (
        <p className="text-cp-muted border-cp-border border-b py-10 text-sm">
          Aucun partenaire ne correspond à cette recherche. Essayez un autre
          nom, une autre ville, ou effacez les filtres.
        </p>
      ) : (
        <>
          {/* Clipped viewport for the track. Hovering or focusing inside it
              stops the drift. */}
          <div
            className="relative mt-5 overflow-hidden"
            onMouseEnter={() => (motion.current.hovered = true)}
            onMouseLeave={() => (motion.current.hovered = false)}
            onFocusCapture={() => (motion.current.hovered = true)}
            onBlurCapture={() => (motion.current.hovered = false)}
          >
            <ul
              ref={trackRef}
              role="group"
              aria-label="Partenaires — le rang défile, glissez pour le pousser"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="focus-visible:outline-cp-accent flex w-max touch-pan-y gap-5 select-none focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {Array.from({ length: COPIES }).flatMap((_, copy) =>
                matches.map((partner) => (
                  <li
                    key={`${copy}-${partner.id}`}
                    className="w-[min(78vw,320px)] shrink-0"
                    /* Only the first copy is real to a screen reader; the
                       others are there to make the row look endless. */
                    aria-hidden={copy > 0 ? "true" : undefined}
                  >
                    {/* A tile is the way to pay: it links to that partner's
                        payment page. A real link, so it opens in a new tab, is
                        shareable, and the keyboard reaches it. */}
                    <Link
                      href={`/espace/partenaire/${partner.id}`}
                      tabIndex={copy > 0 ? -1 : undefined}
                      onClick={(event) => {
                        /* Pushing the row along is not choosing a partner.
                           `detail === 0` is a keyboard activation, which no
                           drag precedes: without that check a stale flag from
                           an earlier gesture would block Enter on the tile. */
                        if (event.detail !== 0 && dragged.current) {
                          event.preventDefault();
                        }
                      }}
                      className="border-cp-border group hover:border-cp-fg focus-visible:outline-cp-accent flex h-full w-full cursor-pointer flex-col overflow-hidden border text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <PartnerPhoto partner={partner} />

                      <div className="flex flex-1 flex-wrap items-baseline gap-x-4 gap-y-2 p-4">
                        <span className={`text-cp-accent ${MICRO}`}>
                          {partnerCategoryLabel(partner.categoryId)}
                        </span>
                        <Arrow className="text-cp-accent ms-auto" />
                        {/* Address, city and postcode: the location, in full,
                            with no map to open. */}
                        <address className="text-cp-muted basis-full text-[13px] leading-[1.5] not-italic">
                          {partner.address}
                          <br />
                          {partner.postcode} {partner.city}
                        </address>
                      </div>
                    </Link>
                  </li>
                )),
              )}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label="Partenaire précédent"
              className={`${BTN_OUTLINE} px-4`}
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label="Partenaire suivant"
              className={`${BTN_OUTLINE} px-4`}
            >
              <span aria-hidden="true">→</span>
            </button>
            <p className={`text-cp-muted ${MICRO}`}>
              Le rang défile
              <span className="text-cp-accent px-1.5">/</span>
              glissez-le ou utilisez les flèches
            </p>
          </div>
        </>
      )}
    </section>
  );
}
