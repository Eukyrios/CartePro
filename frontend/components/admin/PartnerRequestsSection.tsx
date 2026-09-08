"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fold } from "@/lib/text";
import { useFilters } from "@/hooks/useFilters";
import { getDemandes, type Dossier } from "./api";
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

/** Ce que les filtres retiennent. */
type Filters = {
  search: string;
  ville: string;
};

const NO_FILTERS: Filters = { search: "", ville: "" };

/**
 * Le premier écran de l'espace d'administration : les dossiers qui attendent
 * une décision, en liste.
 *
 * En liste et non en fiches, pour une raison mesurable : chaque dossier
 * portait sa zone de motif et ses deux boutons, ce qui faisait des cartes de
 * 400 px de haut. Trois dossiers débordaient déjà de l'écran, alors que
 * l'écran est censé les contenir — c'est un tableau de bord, pas un formulaire
 * à dérouler. Le tableau se cale sur celui des recettes : en-tête collante,
 * défilement interne, pagination. La décision, elle, a maintenant son propre
 * écran, où le dossier se lit en entier avant qu'on tranche.
 *
 * Aucune colonne ne distingue une première demande d'un dossier revenu après
 * un refus : les deux attendent la même chose de l'administration, et le rang
 * de la demande ne change pas ce qu'il y a à instruire. Ce qui compte d'un
 * refus précédent, c'est son motif — et il se lit sur le dossier, avec tout
 * l'historique, là où la décision se prend.
 */
export default function PartnerRequestsSection({
  refreshKey = 0,
}: {
  /** Change après une décision prise ailleurs : la liste se refait. */
  refreshKey?: number;
}) {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  /* Trois états et non deux : « en cours », « chargé », « en panne ». Avec un
     seul booléen, un serveur muet et une pile vide donnent la même image —
     « aucun dossier » alors que la question n'a pas reçu de réponse. */
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [page, setPage] = useState(1);
  const { filters, setFilter, reset, dirty } = useFilters<Filters>(
    NO_FILTERS,
    () => setPage(1),
  );

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    getDemandes()
      .then((rows) => {
        if (cancelled) return;
        setDossiers(rows);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const villes = useMemo(
    () =>
      [...new Set(dossiers.map((d) => d.ville).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "fr"))
        .map((ville) => ({ value: ville, label: ville })),
    [dossiers],
  );

  const matches = useMemo(() => {
    const wanted = fold(filters.search);
    return dossiers.filter((dossier) => {
      if (filters.ville && dossier.ville !== filters.ville) return false;
      if (
        wanted &&
        !fold(dossier.nom).includes(wanted) &&
        !fold(dossier.email).includes(wanted) &&
        !dossier.siren.includes(wanted)
      ) {
        return false;
      }
      return true;
    });
  }, [dossiers, filters]);

  const pages = Math.max(1, Math.ceil(matches.length / LIST_PER_PAGE));
  const current = Math.min(page, pages);
  const rows = matches.slice(
    (current - 1) * LIST_PER_PAGE,
    current * LIST_PER_PAGE,
  );

  return (
    /* Le premier écran de la page : il commence sous la barre haute et il ne
       s'accroche pas — l'en-tête lui appartient, donc le rail y ramène en haut
       du document plutôt que sur une ancre. Même réglage que l'accueil et que
       le premier écran de l'espace partenaire.

       Rien ici ne peut le faire déborder, et c'est pourquoi cet écran n'est
       **pas** `long` : le tableau défile dans sa propre fenêtre, la pagination
       borne le reste, et la section mesure exactement la fenêtre moins la
       barre haute — 824px dans une fenêtre de 900. Un écran `long` reçoit un
       point d'accroche de plus, collé à son bas ; celui-ci n'en a pas besoin,
       son sommet suffit. */
    <Screen
      id="demandes"
      align="start"
      density="offset"
      aria-labelledby="demandes-titre"
    >
      <div>
        <Micro as="p" tone="accent">
          Administration
          <Slash />
          Instruction des dossiers
        </Micro>

        {/* `level={2}` : le titre de page est celui du tableau de bord, qui
            ouvre l'espace. Deux `h1` sur un même document ne disent plus
            lequel le nomme. */}
        <Display
          level={2}
          id="demandes-titre"
          accent="en attente."
          className="mt-4 mb-6"
        >
          Demandes
        </Display>

        <FilterGrid>
          <TextField
            id="demandes-recherche"
            label="Établissement, contact ou SIREN"
            value={filters.search}
            onChange={(value) => setFilter("search", value)}
            placeholder="Sport Loisirs Aubagne, 900000005…"
            type="search"
          />
          <SelectField
            id="demandes-ville"
            label="Ville"
            value={filters.ville}
            onChange={(value) => setFilter("ville", value)}
            options={villes}
            placeholder="Toutes les villes"
          />
        </FilterGrid>

        <ResultCount
          count={matches.length}
          noun={["dossier", "dossiers"]}
          zero="Aucun dossier"
          onReset={dirty ? reset : undefined}
        />

        {state === "loading" ? (
          <EmptyState>Chargement des dossiers…</EmptyState>
        ) : state === "error" ? (
          <Note tone="danger" role="alert" className="mt-3">
            Les dossiers n&apos;ont pas pu être chargés. Rechargez la page ; si
            cela persiste, le serveur ne répond pas.
          </Note>
        ) : matches.length === 0 ? (
          <EmptyState>
            {dossiers.length === 0
              ? "Aucun dossier n'attend de décision."
              : "Aucun dossier ne correspond à ces filtres. Élargissez la recherche ou effacez-les."}
          </EmptyState>
        ) : (
          /* Défile dans l'écran plutôt que de l'étirer : c'est ce qui garantit
             que la section reste une fenêtre, quel que soit le nombre de
             dossiers. Même fenêtre que le tableau des recettes. */
          <div className={`mt-3 ${LIST_WINDOW}`}>
            <table className="border-t-cp-fg w-full border-t-2 text-left">
              <caption className="sr-only">
                Dossiers en attente d’instruction. Chaque ligne ouvre le
                dossier, où la décision se prend.
              </caption>
              <thead className="bg-cp-page sticky top-0">
                <tr className={`border-cp-border border-b ${MICRO}`}>
                  <th scope="col" className="py-3 font-black">
                    Établissement
                  </th>
                  <th
                    scope="col"
                    className="hidden py-3 font-black sm:table-cell"
                  >
                    Secteur
                  </th>
                  <th scope="col" className="py-3 font-black">
                    Ville
                  </th>
                  <th scope="col" className="py-3 text-right font-black">
                    Dossier
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((dossier) => (
                  <tr
                    key={dossier.id}
                    className="border-cp-border hover:bg-cp-surface border-b"
                  >
                    <td className="text-cp-fg py-4 pr-4 text-[15px] font-black tracking-[-0.02em]">
                      {/* Un vrai lien, et non une ligne rendue cliquable par
                            un gestionnaire : il s'ouvre dans un onglet, se
                            copie, et le clavier l'atteint dans l'ordre. Une
                            `<tr onClick>` ne fait aucun des trois. */}
                      <Link
                        href={`/dossier/${dossier.id}`}
                        className="focus-visible:outline-cp-accent block underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        {dossier.nom}
                      </Link>
                      <span className="text-cp-muted mt-1 block text-[12px] font-normal tracking-normal">
                        {dossier.email}
                      </span>
                    </td>
                    <td className="text-cp-muted hidden py-4 pr-4 text-[13px] sm:table-cell">
                      {dossier.secteur}
                    </td>
                    <td className="text-cp-muted py-4 pr-4 text-[13px]">
                      {dossier.codePostal} {dossier.ville}
                    </td>
                    <td className="py-4 text-right">
                      <Link
                        href={`/dossier/${dossier.id}`}
                        className={`text-cp-accent decoration-cp-accent underline underline-offset-4 hover:decoration-2 ${MICRO}`}
                      >
                        Instruire
                      </Link>
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
      </div>
    </Screen>
  );
}
