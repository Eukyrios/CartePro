"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Arrow } from "@/components/brand/Marks";
import { categoryLabel, useCategories } from "@/components/data/useCategories";
import {
  citiesOf,
  fromApi,
  matchingPartnerList,
  type Partner,
} from "@/components/data/partners";
import { api, type ApiPartner } from "@/lib/api";
import { useArrowKeys } from "@/hooks/useArrowKeys";
import { MARQUEE_COPIES, useMarquee } from "@/hooks/useMarquee";
import { useFilters } from "@/hooks/useFilters";
import Display from "@/components/ui/Display";
import EmptyState from "@/components/ui/EmptyState";
import FilterGrid from "@/components/ui/FilterGrid";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import Pager from "@/components/ui/Pager";
import PartnerTile from "@/components/ui/PartnerTile";
import ResultCount from "@/components/ui/ResultCount";
import Screen from "@/components/ui/Screen";
import SelectField from "@/components/ui/SelectField";
import TextField from "@/components/ui/TextField";

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
 * The row drifts and can be pushed by hand (see hooks/useMarquee). It replaced
 * pages of three: the network is a list one browses, so it may as well come
 * past on its own, and a filter leaving eleven matches reads better as one
 * moving row than as four pages to click through.
 */
/**
 * Le réseau qu'on parcourt pour dépenser : tout, sauf les écartés.
 *
 * Les établissements refusés ne sont pas dans le catalogue qu'on feuillette —
 * leur candidature a été refusée, et les afficher inviterait à s'y rendre.
 * Leur fiche reste accessible par son adresse, et elle ouvre sur la décision
 * qui les écarte.
 */
export const estAuReseau = (entry: ApiPartner) => entry.statut !== "refusé";

/** Les conventionnés seulement : ce que l'administration appelle officiel. */
export const estConventionne = (entry: ApiPartner) => entry.statut === "validé";

export default function PartnerCatalogue({
  id = "reseau",
  heading = "Le réseau",
  eyebrow,
  keep = estAuReseau,
  last = false,
  hrefOf,
}: {
  /** L'ancre de l'écran et l'entrée du rail qui y mène. */
  id?: string;
  /** Le titre de l'écran. Le point final est ajouté par `Display`. */
  heading?: string;
  /** Une sur-ligne au-dessus du titre, pour un écran qui a besoin d'un cadre. */
  eyebrow?: ReactNode;
  /**
   * Quels partenaires garder, sur la réponse brute du catalogue.
   *
   * Par défaut, tout le réseau sauf les établissements écartés. L'espace
   * d'administration passe un prédicat plus étroit — les conventionnés
   * seulement — plutôt que d'appeler une autre route : c'est la même liste,
   * lue avec une exigence différente.
   */
  keep?: (entry: ApiPartner) => boolean;
  /**
   * Dernier écran de la page, donc celui à qui appartient le pied de page.
   *
   * Les deux ensemble font une fenêtre : voir `Screen`, `screen-minus-footer`.
   */
  last?: boolean;
  /**
   * Où mène une tuile. Par défaut la fiche du partenaire.
   *
   * L'espace d'administration l'envoie sur les recettes de l'établissement :
   * c'est la même liste d'établissements, mais on ne vient pas y chercher la
   * même chose — un salarié cherche où dépenser, l'administration ce qui a été
   * encaissé.
   */
  hrefOf?: (partner: Partner) => string;
} = {}) {
  const [partners, setPartners] = useState<Partner[]>([]);
  /* Trois états et non deux : « en cours », « chargé », « en panne ». Avec un
     seul booléen, un serveur qui ne répond pas donnait exactement la même
     image qu'un réseau vide — un écran qui dit « aucun partenaire » alors que
     la question n'a jamais reçu de réponse. */
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  /* Le référentiel des catégories, pour leurs libellés. Il vient du serveur
     comme le reste : la liste écrite en dur ici pouvait ignorer une catégorie
     ajoutée en base, et l'afficher telle quelle. */
  const { categories: referentiel } = useCategories();
  const { filters, setFilter, reset, dirty } = useFilters<Filters>(NO_FILTERS);

  useEffect(() => {
    /* Une seule traduction, dans `data/partners` : ce composant la faisait à
       la main, avec un repli sur les données locales pour la photographie —
       repli qui n'a plus lieu d'être puisque la base porte l'image. */
    api<ApiPartner[]>("/api/partenaires/catalogue")
      .then((items) => {
        /* Le tri est celui que l'appelant demande — voir `keep`, dont la
           valeur par défaut écarte les établissements refusés. */
        setPartners(items.filter(keep).map(fromApi));
        setState("ready");
      })
      .catch(() => setState("error"));
    /* `keep` est dans les dépendances, donc il doit être stable : les deux
       prédicats fournis sont des constantes de module (`estAuReseau`,
       `estConventionne`). Une fonction écrite en ligne dans le JSX serait
       recréée à chaque rendu et relancerait la requête indéfiniment. */
  }, [keep]);

  const categories = useMemo(
    () =>
      [...new Set(partners.map((partner) => partner.categoryId))].map(
        (categoryId) => ({
          value: categoryId,
          label: categoryLabel(categoryId, referentiel),
        }),
      ),
    [partners, referentiel],
  );
  const cities = useMemo(() => citiesOf(partners).filter(Boolean), [partners]);

  // Every match, not a page of them: the row shows the whole result, and the
  // predicate is the data module's — the same one a page would use.
  const matches = useMemo(
    () => matchingPartnerList(partners, filters),
    [partners, filters],
  );

  const { trackRef, nudge, dragHandlers, hoverHandlers, dragged } =
    useMarquee(matches);
  const handleKeyDown = useArrowKeys(nudge);

  return (
    <Screen
      id={id}
      height={last ? "screen-minus-footer" : "screen"}
      aria-labelledby={`${id}-titre`}
    >
      {eyebrow}
      {/* Titled like the other screens of the space. */}
      <Display
        level={2}
        id={`${id}-titre`}
        accent="."
        br={false}
        className={eyebrow ? "mt-4" : undefined}
      >
        {heading}
      </Display>

      <FilterGrid className="mt-8">
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
      </FilterGrid>

      <ResultCount
        count={matches.length}
        noun={["partenaire", "partenaires"]}
        zero="Aucun partenaire"
        onReset={dirty ? reset : undefined}
      />

      {state === "loading" ? (
        <EmptyState>Chargement du réseau…</EmptyState>
      ) : state === "error" ? (
        <Note tone="danger" role="alert" className="mt-3">
          <strong className="font-black">
            Le réseau n&apos;a pas pu être chargé.
          </strong>{" "}
          Le serveur ne répond pas. Rechargez la page ; si cela persiste,
          vérifiez que le backend tourne —{" "}
          <code className="font-mono">make dev</code> lance les deux.
        </Note>
      ) : matches.length === 0 ? (
        <EmptyState>
          Aucun partenaire ne correspond à cette recherche. Essayez un autre
          nom, une autre ville, ou effacez les filtres.
        </EmptyState>
      ) : (
        <>
          {/* Clipped viewport for the track. Hovering or focusing inside it
              stops the drift. */}
          <div className="relative mt-5 overflow-hidden" {...hoverHandlers}>
            <ul
              ref={trackRef}
              role="group"
              aria-label="Partenaires — le rang défile, glissez pour le pousser"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              {...dragHandlers}
              className="focus-visible:outline-cp-accent flex w-max touch-pan-y gap-5 select-none focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {Array.from({ length: MARQUEE_COPIES }).flatMap((_, copy) =>
                matches.map((partner) => (
                  <li
                    key={`${copy}-${partner.id}`}
                    className="w-[min(78vw,320px)] shrink-0"
                    /* Only the first copy is real to a screen reader; the
                       others are there to make the row look endless. */
                    aria-hidden={copy > 0 ? "true" : undefined}
                  >
                    <PartnerTile
                      partner={partner}
                      href={hrefOf?.(partner)}
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
                    >
                      <div className="flex flex-1 flex-wrap items-baseline gap-x-4 gap-y-2 p-4">
                        <Micro tone="accent">
                          {categoryLabel(partner.categoryId, referentiel)}
                        </Micro>
                        <Arrow className="text-cp-accent ms-auto" />
                        {/* Address, city and postcode: the location, in full,
                            with no map to open. */}
                        <address className="text-cp-muted basis-full text-[13px] leading-[1.5] not-italic">
                          {partner.address}
                          <br />
                          {partner.postcode} {partner.city}
                        </address>
                      </div>
                    </PartnerTile>
                  </li>
                )),
              )}
            </ul>
          </div>

          <Pager
            onPrev={() => nudge(-1)}
            onNext={() => nudge(1)}
            prevLabel="Partenaire précédent"
            nextLabel="Partenaire suivant"
            hint="Le rang défile, glissez-le ou utilisez les flèches"
            className="mt-6"
          />
        </>
      )}
    </Screen>
  );
}
