"use client";

import { useEffect, useMemo, useState } from "react";
import { Arrow } from "@/components/brand/Marks";
import { fold } from "@/lib/text";
import { useFilters } from "@/hooks/useFilters";
import { getComptes, type Compte } from "./api";
import { euros } from "./Charts";
import { LIBELLE_STATUT, tonDuStatut } from "./mesures";
import CompteTile from "./CompteTile";
import Chip from "@/components/ui/Chip";
import EmptyState from "@/components/ui/EmptyState";
import FilterGrid from "@/components/ui/FilterGrid";
import MarqueeRow from "@/components/ui/MarqueeRow";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import ResultCount from "@/components/ui/ResultCount";
import SelectField from "@/components/ui/SelectField";
import TextField from "@/components/ui/TextField";

/** Ce que les filtres retiennent. */
type Filters = { search: string; statut: string; solde: string };
const NO_FILTERS: Filters = { search: "", statut: "", solde: "" };

/** Les trois états d'un compte salarié, dits en français. */
const STATUTS = [
  { value: "actif", label: "Actif" },
  { value: "suspendu", label: "Suspendu" },
  { value: "clôturé", label: "Clôturé" },
];

/**
 * Ce que le filtre du solde demande.
 *
 * « À zéro » et « sous cinq euros » parce que ce sont les cas limites que le
 * jeu de démonstration porte exprès, et ceux qu'un agent vient chercher : un
 * compte vide n'achète plus rien, et un compte sous le prix d'un déjeuner est
 * celui dont le titulaire va appeler.
 */
const SOLDES = [
  { value: "zero", label: "À zéro" },
  { value: "faible", label: "Sous cinq euros" },
  { value: "positif", label: "Avec du solde" },
];

/**
 * Le rang des comptes salariés : chercher, filtrer, et ouvrir un historique.
 *
 * Le pendant exact du catalogue du réseau, de l'autre côté du comptoir, et
 * délibérément le même geste : on parcourt un rang qui dérive, on pousse, on
 * clique une tuile. Un agent qui sait lire les recettes d'un établissement n'a
 * rien à réapprendre pour lire les dépenses d'un salarié.
 *
 * Les tuiles viennent de `GET /api/admin/comptes`, qui rend les deux genres
 * avec l'état de chaque compte et ce qu'il porte ; ce rang n'en garde que les
 * salariés — les établissements sont dans le rang au-dessus, et le même compte
 * ne se lit pas deux fois dans le même écran.
 *
 * Ni les mesures ni le motif de la dernière ne sont ici. Une tuile est une
 * porte : elle nomme un compte, son état et son solde, et suspendre se décide
 * derrière, à côté des chiffres — voir `CompteMesures` sur `/depenses/<id>`.
 */
export default function AccountsCatalogue({
  id = "comptes-salaries",
  heading = "Salariés",
}: {
  id?: string;
  heading?: string;
} = {}) {
  const [comptes, setComptes] = useState<Compte[]>([]);
  /* Trois états et non deux : sans « en cours », un serveur muet donnerait la
     même image qu'un dispositif sans aucun compte. */
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const { filters, setFilter, reset, dirty } = useFilters<Filters>(NO_FILTERS);

  useEffect(() => {
    let cancelled = false;
    getComptes()
      .then((rows) => {
        if (cancelled) return;
        setComptes(rows.filter((compte) => compte.genre === "salarie"));
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    const voulu = fold(filters.search);
    return comptes.filter((compte) => {
      if (filters.statut && compte.statut !== filters.statut) return false;
      if (filters.solde === "zero" && compte.soldeCents !== 0) return false;
      if (filters.solde === "faible" && compte.soldeCents >= 500) return false;
      if (filters.solde === "positif" && compte.soldeCents <= 0) return false;
      if (
        voulu &&
        !fold(compte.nom).includes(voulu) &&
        !fold(compte.email).includes(voulu)
      ) {
        return false;
      }
      return true;
    });
  }, [comptes, filters]);

  return (
    <section aria-labelledby={`${id}-titre`} className="min-w-0">
      <h3
        id={`${id}-titre`}
        className="text-cp-fg text-[20px] font-black tracking-[-0.04em]"
      >
        {heading}
      </h3>

      <FilterGrid className="mt-8">
        <TextField
          id="comptes-recherche"
          label="Nom ou adresse électronique"
          value={filters.search}
          onChange={(value) => setFilter("search", value)}
          placeholder="Camille Durand, salarie12@…"
          type="search"
        />
        <SelectField
          id="comptes-statut"
          label="État du compte"
          value={filters.statut}
          onChange={(value) => setFilter("statut", value)}
          options={STATUTS}
          placeholder="Tous les états"
        />
        <SelectField
          id="comptes-solde"
          label="Solde"
          value={filters.solde}
          onChange={(value) => setFilter("solde", value)}
          options={SOLDES}
          placeholder="Tous les soldes"
        />
      </FilterGrid>

      <ResultCount
        count={matches.length}
        noun={["compte", "comptes"]}
        zero="Aucun compte"
        onReset={dirty ? reset : undefined}
      />

      {state === "loading" ? (
        <EmptyState>Chargement des comptes…</EmptyState>
      ) : state === "error" ? (
        <Note tone="danger" role="alert" className="mt-3">
          <strong className="font-black">
            Les comptes n&apos;ont pas pu être chargés.
          </strong>{" "}
          Le serveur ne répond pas. Rechargez la page ; si cela persiste,
          vérifiez que le backend tourne —{" "}
          <code className="font-mono">make dev</code> lance les deux.
        </Note>
      ) : matches.length === 0 ? (
        <EmptyState>
          {comptes.length === 0
            ? "Aucun compte salarié n'existe encore."
            : "Aucun compte ne correspond à cette recherche. Essayez un autre nom, un autre état, ou effacez les filtres."}
        </EmptyState>
      ) : (
        <MarqueeRow
          items={matches}
          keyOf={(compte) => String(compte.id)}
          label="Comptes salariés — le rang défile, glissez pour le pousser"
          prevLabel="Compte précédent"
          nextLabel="Compte suivant"
          render={(compte, chrome) => (
            <CompteTile
              compte={compte}
              href={`/depenses/${compte.id}`}
              tabIndex={chrome.tabIndex}
              onClick={chrome.onClick}
            >
              <div className="flex flex-1 flex-wrap items-baseline gap-x-4 gap-y-2 p-4">
                <Chip tone={tonDuStatut(compte.statut)}>
                  {LIBELLE_STATUT[compte.statut] ?? compte.statut}
                </Chip>
                <Arrow className="text-cp-accent ms-auto" />
                {/* Le solde et ce qu'il a servi : les deux chiffres qu'un agent
                    lit avant d'ouvrir l'historique. */}
                <p className="text-cp-fg basis-full text-[15px] font-black tracking-[-0.02em] tabular-nums">
                  {euros(compte.soldeCents)} €
                  <Micro tone="muted" className="mt-1 block font-black">
                    de solde · {compte.nbPaiements} paiement
                    {compte.nbPaiements > 1 ? "s" : ""}
                  </Micro>
                </p>
              </div>
            </CompteTile>
          )}
        />
      )}
    </section>
  );
}
