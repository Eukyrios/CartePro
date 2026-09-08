"use client";

import { useEffect, useMemo, useState } from "react";
import { fold } from "@/lib/text";
import { useFilters } from "@/hooks/useFilters";
import { getComptes, type Compte, type GesteCompte } from "./api";
import { euros } from "./Charts";
import { GESTES, LIBELLE_STATUT, gestesPour, tonDuStatut } from "./mesures";
import MesureDialog from "./MesureDialog";
import Link from "next/link";
import Chip from "@/components/ui/Chip";
import Display from "@/components/ui/Display";
import EmptyState from "@/components/ui/EmptyState";
import FilterGrid from "@/components/ui/FilterGrid";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import Pager from "@/components/ui/Pager";
import ResultCount from "@/components/ui/ResultCount";
import Screen from "@/components/ui/Screen";
import SelectField from "@/components/ui/SelectField";
import Slash from "@/components/ui/Slash";
import TextField from "@/components/ui/TextField";
import { LIST_PER_PAGE, LIST_WINDOW, MICRO } from "@/components/ui/surfaces";

type Filters = { search: string; statut: string; genre: string };
const NO_FILTERS: Filters = { search: "", statut: "", genre: "" };

const GENRES = [
  { value: "salarie", label: "Salariés" },
  { value: "partenaire", label: "Partenaires" },
];

/* Les deux vocabulaires d'état dans une seule liste, groupés par genre : ce
   sont deux énumérations distinctes en base, et « suspendu » est le seul terme
   qu'elles partagent. */
const STATUTS = [
  { value: "actif", label: "Actif — salarié" },
  { value: "clôturé", label: "Clôturé — salarié" },
  { value: "en_attente", label: "En attente — partenaire" },
  { value: "validé", label: "Conventionné — partenaire" },
  { value: "refusé", label: "Refusé — partenaire" },
  { value: "suspendu", label: "Suspendu" },
];

/**
 * La gestion des comptes : activer, suspendre, clôturer.
 *
 * Le pendant, du côté des salariés, de l'écran d'instruction des dossiers — et
 * délibérément la même liste, les mêmes filtres, la même pagination. Un agent
 * qui sait instruire un dossier n'a rien à réapprendre ici.
 *
 * **Le motif est obligatoire, et c'est le serveur qui l'exige** (422 sans lui).
 * L'écran ne fait que le demander tôt : une mesure sans motif est une porte
 * murée, et la personne qui ne peut plus se connecter a le droit de savoir
 * pourquoi. L'historique des mesures s'affiche sous le compte : un compte
 * suspendu puis réactivé puis clôturé garde ses trois lignes.
 *
 * La clôture est traitée à part — bouton `danger`, portée écrite en toutes
 * lettres, et le solde restant rappelé dans le dialogue. Fermer un compte qui
 * porte encore de l'argent public est une décision, pas une formalité ; le
 * motif est l'endroit où l'agent consigne ce qu'il advient du reliquat.
 */
export default function AccountsSection() {
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [page, setPage] = useState(1);
  const { filters, setFilter, reset, dirty } = useFilters<Filters>(
    NO_FILTERS,
    () => setPage(1),
  );

  /* Le dialogue : le compte visé et le geste, ou rien. Un seul état pour les
     deux — il n'y a pas de dialogue sans geste ni de geste sans compte. */
  const [visee, setVisee] = useState<{
    compte: Compte;
    geste: GesteCompte | "retablir";
  } | null>(null);
  const [avis, setAvis] = useState("");

  const charger = () => {
    setState("loading");
    return getComptes()
      .then((rows) => {
        setComptes(rows);
        setState("ready");
      })
      .catch(() => setState("error"));
  };

  useEffect(() => {
    let cancelled = false;
    getComptes()
      .then((rows) => {
        if (cancelled) return;
        setComptes(rows);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    const wanted = fold(filters.search);
    return comptes.filter((compte) => {
      if (filters.genre && compte.genre !== filters.genre) return false;
      if (filters.statut && compte.statut !== filters.statut) return false;
      if (
        wanted &&
        !fold(compte.nom).includes(wanted) &&
        !fold(compte.email).includes(wanted)
      ) {
        return false;
      }
      return true;
    });
  }, [comptes, filters]);

  const pages = Math.max(1, Math.ceil(matches.length / LIST_PER_PAGE));
  const current = Math.min(page, pages);
  const rows = matches.slice(
    (current - 1) * LIST_PER_PAGE,
    current * LIST_PER_PAGE,
  );

  const ouvrir = (compte: Compte, geste: GesteCompte | "retablir") => {
    setVisee({ compte, geste });
  };

  return (
    <Screen
      id="comptes"
      /* Dernier écran de la page : il laisse la place du pied, et les deux
         ensemble font exactement une fenêtre. */
      height="screen-minus-footer"
      /* `long` : dix-huit lignes plus les filtres montent à ~1600px dans une
         fenêtre de 900. Sans ce second point d'accroche, collé au bas de
         l'écran, l'accrochage obligatoire rendait la moitié basse du tableau
         inatteignable. */
      long
      align="start"
      density="offset"
      aria-labelledby="comptes-titre"
    >
      <div>
        <Micro as="p" tone="accent">
          Administration
          <Slash />
          Gestion des comptes
        </Micro>

        <Display
          level={2}
          id="comptes-titre"
          accent="du dispositif."
          className="mt-4 mb-6"
        >
          Comptes
        </Display>

        <FilterGrid>
          <TextField
            id="comptes-recherche"
            label="Nom ou adresse électronique"
            value={filters.search}
            onChange={(value) => setFilter("search", value)}
            placeholder="Camille Durand, salarie12@…"
            type="search"
          />
          <SelectField
            id="comptes-genre"
            label="Genre de compte"
            value={filters.genre}
            onChange={(value) => setFilter("genre", value)}
            options={GENRES}
            placeholder="Tous les comptes"
          />
          <SelectField
            id="comptes-statut"
            label="État du compte"
            value={filters.statut}
            onChange={(value) => setFilter("statut", value)}
            options={STATUTS}
            placeholder="Tous les états"
          />
        </FilterGrid>

        <ResultCount
          count={matches.length}
          noun={["compte", "comptes"]}
          zero="Aucun compte"
          onReset={dirty ? reset : undefined}
        />

        {avis && (
          <Note tone="positive" role="status" className="mt-3">
            {avis}
          </Note>
        )}

        {state === "loading" ? (
          <EmptyState>Chargement des comptes…</EmptyState>
        ) : state === "error" ? (
          <Note tone="danger" role="alert" className="mt-3">
            Les comptes n&apos;ont pas pu être chargés. Rechargez la page ; si
            cela persiste, le serveur ne répond pas.
          </Note>
        ) : matches.length === 0 ? (
          <EmptyState>
            {comptes.length === 0
              ? "Aucun compte n'existe encore."
              : "Aucun compte ne correspond à ces filtres. Élargissez la recherche ou effacez-les."}
          </EmptyState>
        ) : (
          <div className={`mt-3 ${LIST_WINDOW}`}>
            <table className="border-t-cp-fg w-full border-t-2 text-left">
              <caption className="sr-only">
                Comptes salariés, leur état, leur solde et les mesures prises.
              </caption>
              <thead className="bg-cp-page sticky top-0">
                <tr className={`border-cp-border border-b ${MICRO}`}>
                  <th scope="col" className="py-3 font-black">
                    Titulaire
                  </th>
                  <th scope="col" className="py-3 font-black">
                    Genre
                  </th>
                  <th scope="col" className="py-3 font-black">
                    État
                  </th>
                  <th
                    scope="col"
                    className="hidden py-3 text-right font-black sm:table-cell"
                  >
                    {/* Les deux sens dans un seul en-tête : un salarié
                        détient un solde, un partenaire a encaissé. La ligne
                        dit lequel elle montre. */}
                    Solde / encaissé
                  </th>
                  <th scope="col" className="py-3 text-right font-black">
                    Mesure
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((compte) => {
                  const gestes = gestesPour(compte);
                  return (
                    <tr
                      /* Le genre entre dans la clé : les identifiants sont des
                         clés primaires par table, donc le salarié 3 et le
                         partenaire 3 partageraient la même sans lui. */
                      key={`${compte.genre}-${compte.id}`}
                      className="border-cp-border hover:bg-cp-surface border-b"
                    >
                      <td className="text-cp-fg py-4 pr-4 text-[15px] font-black tracking-[-0.02em]">
                        {compte.nom}
                        <span className="text-cp-muted mt-1 block text-[12px] font-normal tracking-normal">
                          {compte.email}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <Micro
                          tone={
                            compte.genre === "partenaire" ? "accent" : "muted"
                          }
                        >
                          {compte.genre === "partenaire"
                            ? "Partenaire"
                            : "Salarié"}
                        </Micro>
                        <span className="text-cp-muted mt-1 block max-w-[24ch] text-[12px]">
                          {compte.employeur}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <Chip tone={tonDuStatut(compte.statut)}>
                          {LIBELLE_STATUT[compte.statut] ?? compte.statut}
                        </Chip>
                        {/* Le motif de la dernière mesure, sous l'état : ce
                            qu'un agent vient lire en premier quand un compte
                            n'est pas actif. */}
                        {compte.derniereMesure &&
                          compte.statut !== "actif" &&
                          compte.statut !== "validé" && (
                            <span className="text-cp-muted mt-1.5 block max-w-[38ch] text-[12px]">
                              {compte.derniereMesure.motif}
                            </span>
                          )}
                      </td>
                      <td className="text-cp-fg hidden py-4 pr-4 text-right text-[13px] tabular-nums sm:table-cell">
                        {euros(compte.soldeCents)} €
                        <span className="text-cp-muted mt-1 block text-[12px]">
                          {/* Le sens du chiffre, dit sur la ligne : un salarié
                              détient, un partenaire a reçu. */}
                          {compte.genre === "partenaire"
                            ? "encaissé"
                            : "de solde"}
                          {" · "}
                          {compte.nbPaiements} paiement
                          {compte.nbPaiements > 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {gestes.length === 0 ? (
                          compte.genre === "partenaire" ? (
                            /* Un dossier en attente ou refusé ne se tranche
                               pas d'ici : les pièces se lisent d'abord. */
                            <Link
                              href={`/dossier/${compte.slug}`}
                              className={`text-cp-accent decoration-cp-accent underline underline-offset-4 hover:decoration-2 ${MICRO}`}
                            >
                              Instruire
                            </Link>
                          ) : (
                            <span className={`${MICRO} text-cp-muted`}>
                              Clôturé
                            </span>
                          )
                        ) : (
                          <div className="flex flex-wrap justify-end gap-2">
                            {gestes.map((id) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => ouvrir(compte, id)}
                                className={`${MICRO} ${
                                  GESTES[id].ton === "danger"
                                    ? "text-fg-danger decoration-fg-danger"
                                    : "text-cp-accent decoration-cp-accent"
                                } underline underline-offset-4 hover:decoration-2`}
                              >
                                {GESTES[id].verbe}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
      </div>

      <MesureDialog
        visee={visee}
        onClose={() => setVisee(null)}
        onDone={(message) => {
          setVisee(null);
          setAvis(message);
          charger();
        }}
      />
    </Screen>
  );
}
