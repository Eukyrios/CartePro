"use client";

import { useMemo, useState } from "react";
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
import { LIST_PER_PAGE, LIST_WINDOW, MICRO } from "@/components/ui/surfaces";
import type { ReactNode } from "react";

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Ce que les filtres retiennent. Les dates sont des jours ISO, qui se trient comme des chaînes. */
type Filters = {
  search: string;
  from: string;
  to: string;
  min: string;
};

const NO_FILTERS: Filters = { search: "", from: "", to: "", min: "" };

/**
 * Une ligne d'argent encaissé, réduite à ce que l'écran en montre.
 *
 * `label` est le contre-parti principal — le salarié qui a payé — et `partner`
 * le second, chez qui. Un partenaire qui lit ses propres recettes n'a pas
 * besoin du second : c'est lui.
 */
export type TransactionRow = {
  id: string;
  /** ISO 8601, tel que le serveur l'écrit. */
  at: string;
  amountCents: number;
  label: string;
  partner?: string;
};

/**
 * L'écran d'un historique d'encaissements : filtrer, totaliser, lister.
 *
 * Un seul composant pour deux écrans — « Mes recettes » dans l'espace
 * partenaire et « Les recettes » dans celui de l'administration — parce que
 * c'est la même question posée de deux hauteurs : le partenaire regarde ce
 * qu'il a encaissé, l'administration ce que le dispositif a fait circuler. Les
 * filtres, le total et la pagination sont les mêmes ; ce qui change tient dans
 * les libellés et dans la colonne du partenaire, que l'un connaît déjà.
 *
 * Il ne va pas chercher ses lignes : l'appelant les lui donne, avec l'état de
 * sa requête. Les deux écrans interrogent des routes différentes — l'une
 * scopée au jeton, l'autre réservée au rôle — et un composant qui aurait choisi
 * la route aurait dû connaître l'audience.
 *
 * Lecture seule par défaut, et c'est le point : un encaissement est
 * irréversible du côté du comptoir, donc l'espace partenaire n'offre rien pour
 * le défaire. Seule l'administration en a le pouvoir, et elle le demande par
 * `onCancel` — sans quoi la colonne n'existe pas.
 *
 * Le total est posé juste au-dessus des lignes qu'il additionne et porte sur ce
 * qui est listé — un chiffre qui ignorerait le filtre au-dessus de la liste qui
 * l'applique inviterait à mal lire.
 *
 * Le filtrage se fait à l'écran parce que les routes ne prennent pas encore de
 * paramètres ; le jour où elles en prendront, c'est l'appelant qui les passera,
 * et cet écran n'en saura rien.
 */
export default function TransactionsSection({
  id,
  title,
  accent = ".",
  br = false,
  eyebrow,
  rows: entries,
  state,
  totalLabel,
  whoLabel,
  partnerLabel,
  searchLabel,
  searchPlaceholder,
  noun,
  zero,
  caption,
  loadingMessage,
  errorMessage,
  emptyMessage,
  noMatchMessage = "Aucune ligne ne correspond à ces filtres. Élargissez la période ou effacez-les.",
  onCancel,
}: {
  /** L'ancre de l'écran, celle que vise le rail. */
  id: string;
  title: string;
  /**
   * La ligne d'accent, en serif italique — la signature des titres du design.
   *
   * Par défaut le seul point final, sur la même ligne. Un écran qui nomme un
   * établissement passe ce nom ici avec `br`, pour que le nom tombe à la ligne
   * en italique plutôt que d'allonger le titre : « Les recettes de » /
   * *« Le Comptoir du Midi. »*
   */
  accent?: ReactNode;
  /** Vrai pour que l'accent passe à la ligne. */
  br?: boolean;
  /** La ligne de surtitre, quand l'écran en porte une. */
  eyebrow?: ReactNode;
  rows: readonly TransactionRow[];
  state: "loading" | "ready" | "error";
  /** « Total encaissé » — ce que le grand chiffre compte. */
  totalLabel: string;
  /** L'en-tête de la colonne du contre-parti : « Salarié ». */
  whoLabel: string;
  /**
   * L'en-tête de la colonne du partenaire. Absent, la colonne n'est pas
   * dessinée : c'est le cas d'un partenaire qui lit ses propres recettes.
   */
  partnerLabel?: string;
  searchLabel: string;
  searchPlaceholder: string;
  /** Singulier et pluriel, pour le compteur de résultats. */
  noun: readonly [string, string];
  zero: string;
  /** Le résumé du tableau, pour les lecteurs d'écran. */
  caption: string;
  loadingMessage: string;
  errorMessage: string;
  /** Quand il n'y a aucune ligne du tout — pas quand les filtres n'en gardent aucune. */
  emptyMessage: string;
  noMatchMessage?: string;
  /**
   * L'annulation d'un paiement, quand l'appelant en autorise une.
   *
   * Absente, la colonne n'est pas dessinée du tout — et c'est le cas de
   * l'espace partenaire : un encaissement est irréversible de ce côté du
   * comptoir. Seule l'administration peut défaire un paiement, et seul l'écran
   * réservé passe donc ce rappel. Ce composant ne demande rien, n'ouvre rien et
   * ne sait pas ce qu'il advient de la ligne : il signale le clic, l'appelant
   * s'occupe du motif et de la requête.
   */
  onCancel?: (row: TransactionRow) => void;
}) {
  const [page, setPage] = useState(1);
  const { filters, setFilter, reset, dirty } = useFilters<Filters>(
    NO_FILTERS,
    () => setPage(1),
  );

  const matches = useMemo(() => {
    const wanted = fold(filters.search);
    const min = filters.min ? Number(filters.min.replace(",", ".")) * 100 : 0;
    return entries.filter((entry) => {
      /* Les dix premiers caractères d'un horodatage ISO sont son jour, et les
         jours ISO se comparent correctement comme des chaînes — pas de Date à
         analyser, pas de fuseau à rater. */
      const day = entry.at.slice(0, 10);
      if (filters.from && day < filters.from) return false;
      if (filters.to && day > filters.to) return false;
      if (min && entry.amountCents < min) return false;
      if (
        wanted &&
        !fold(entry.label).includes(wanted) &&
        !fold(entry.partner ?? "").includes(wanted) &&
        !entry.id.includes(wanted)
      ) {
        return false;
      }
      return true;
    });
  }, [entries, filters]);

  const total = useMemo(
    () => matches.reduce((sum, entry) => sum + entry.amountCents, 0),
    [matches],
  );
  const grandTotal = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.amountCents, 0),
    [entries],
  );

  const pages = Math.max(1, Math.ceil(matches.length / LIST_PER_PAGE));
  const current = Math.min(page, pages);
  const rows = matches.slice(
    (current - 1) * LIST_PER_PAGE,
    current * LIST_PER_PAGE,
  );

  return (
    /* Dernier écran de son espace : il laisse la place du pied de page. Voir
       HistorySection, même raison.

       `long` parce que la liste peut monter à deux écrans : la page passe alors
       en accrochage de proximité, sans quoi la moitié basse de la section
       serait hors d'atteinte. `align="start"` et `density="offset"` posent le
       départ du titre, qu'un écran plus haut que sa boîte ne peut pas centrer. */
    <Screen
      id={id}
      height="screen-minus-footer"
      rule={false}
      align="start"
      density="offset"
      long
    >
      {eyebrow}
      {/* Le rythme de la fiche d'un partenaire — `espace/PartnerPayment`, le
          haut d'écran le plus aéré du site : 20px entre la rangée de surtitre
          et le titre, autant sous le titre. Collés, le surtitre en
          micro-capitales et le titre en `leading-[0.86]` se touchaient presque,
          leurs deux boîtes serrant leur texte.

          Puis 40px avant la grille, et non 20 : la mention de simulation dit
          quelque chose du titre — de quels montants on parle — alors que les
          filtres sont l'outil qui commence. Le même écart des deux côtés les
          aurait donnés pour un seul bloc. */}
      <Display
        level={2}
        accent={accent}
        br={br}
        className={eyebrow ? "mt-5 mb-5" : "mb-5"}
      >
        {title}
      </Display>
      <SimulationNotice className="mb-10 block">
        Simulation — montants de démonstration
      </SimulationNotice>

      <FilterGrid>
        <TextField
          id={`${id}-recherche`}
          label={searchLabel}
          value={filters.search}
          onChange={(value) => setFilter("search", value)}
          placeholder={searchPlaceholder}
          type="search"
        />
        {/* Sélecteurs de date natifs : ils portent le calendrier de la locale
            et la saisie clavier qui va avec. `max`/`min` tiennent la paire dans
            l'ordre, donc l'intervalle ne peut pas être inversé. */}
        <TextField
          id={`${id}-du`}
          label="Du"
          type="date"
          value={filters.from}
          onChange={(value) => setFilter("from", value)}
          max={filters.to || undefined}
        />
        <TextField
          id={`${id}-au`}
          label="Au"
          type="date"
          value={filters.to}
          onChange={(value) => setFilter("to", value)}
          min={filters.from || undefined}
        />
        <TextField
          id={`${id}-min`}
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
        noun={noun}
        zero={zero}
        onReset={dirty ? reset : undefined}
      />

      {/* Le total, posé juste au-dessus des lignes qu'il additionne, à taille
          d'affichage : c'est le chiffre qu'on vient chercher. En tête d'écran
          il était séparé de sa liste par toute la grille de filtres, si bien
          qu'on lisait le chiffre avant de savoir sur quoi il portait. Ici les
          deux se lisent d'un seul regard, et il reste visible quand les lignes
          défilent — le cadre de défilement commence en dessous.

          Le filet fort est celui qui coiffait le tableau ; le tableau ne le
          porte plus, sinon les deux se doubleraient. */}
      <div className="border-t-cp-fg border-b-cp-border mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2 border-t-2 border-b py-4">
        <Micro as="p" tone="muted">
          {totalLabel}
        </Micro>
        {dirty && (
          <Micro as="p" tone="muted">
            sur {formatEuros(grandTotal)} au total
          </Micro>
        )}
        {/* `ms-auto` : le total se pose au bord droit, donc au-dessus de la
            colonne des montants, qui y est alignée elle aussi. Le libellé et
            le grand chiffre se lisaient côte à côte au milieu de rien, à
            gauche d'un tableau dont la colonne des sommes est à droite —
            l'œil devait faire l'aller-retour pour rapprocher le total de ce
            qu'il totalise. Rien à calculer ici : le bord droit du tableau et
            celui de ce bloc sont le même, puisqu'ils partagent le conteneur
            et que le tableau fait toute sa largeur. */}
        <p
          aria-live="polite"
          className="text-cp-fg ms-auto text-[clamp(28px,4vw,44px)] leading-none font-black tracking-[-0.05em] tabular-nums"
        >
          {formatEuros(total)}
        </p>
      </div>

      {state === "loading" ? (
        <EmptyState>{loadingMessage}</EmptyState>
      ) : state === "error" ? (
        <Note tone="danger" role="alert" className="mt-3">
          {errorMessage}
        </Note>
      ) : matches.length === 0 ? (
        <EmptyState>
          {entries.length === 0 ? emptyMessage : noMatchMessage}
        </EmptyState>
      ) : (
        /* Deux écrans au plus, puis la liste défile — voir `LIST_WINDOW`. En
           dessous du plafond elle prend la hauteur de son contenu, donc une
           liste courte n'a pas de barre intérieure. */
        <div className={LIST_WINDOW}>
          <table className="w-full text-left">
            <caption className="sr-only">{caption}</caption>
            <thead className="bg-cp-page sticky top-0">
              <tr className={`border-cp-border border-b ${MICRO}`}>
                <th scope="col" className="py-3 font-black">
                  Date
                </th>
                <th scope="col" className="py-3 font-black">
                  {whoLabel}
                </th>
                {partnerLabel && (
                  <th scope="col" className="py-3 font-black">
                    {partnerLabel}
                  </th>
                )}
                <th
                  scope="col"
                  className="hidden py-3 text-right font-black sm:table-cell"
                >
                  Référence
                </th>
                {onCancel && (
                  /* L'action passe **avant** le montant, et n'a l'air de rien
                     là où on l'attendrait — en fin de ligne. C'est le montant
                     qui a besoin du bord droit : le total au-dessus s'y aligne
                     (voir le bloc du total), et une colonne d'actions posée
                     après lui décalait tous les chiffres vers l'intérieur
                     tandis que le total restait au bord. Les deux ne se
                     répondaient plus.

                     En-tête vide à l'œil, nommée pour les lecteurs d'écran :
                     « Action » au-dessus d'une colonne de boutons n'apprend
                     rien à qui la voit, et son absence laisse la colonne sans
                     nom à qui l'écoute. */
                  <th scope="col" className="py-3 text-right font-black">
                    <span className="sr-only">Action</span>
                  </th>
                )}
                {/* Le montant ferme la ligne. C'est la colonne qu'on vient
                    lire, et la seule dont les chiffres se comparent d'une
                    ligne à l'autre : au bord droit du tableau, ils forment une
                    colonne que rien ne décale, et le total au-dessus tombe
                    dessus. Coincé entre le nom et la référence, il fallait le
                    chercher à chaque ligne. */}
                <th scope="col" className="py-3 text-right font-black">
                  Montant
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.id} className="border-cp-border border-b">
                  <td className="text-cp-muted py-4 text-[13px] whitespace-nowrap">
                    {DATE.format(new Date(entry.at))}
                  </td>
                  <td className="text-cp-fg py-4 pr-4 text-[15px] font-black tracking-[-0.02em]">
                    {entry.label}
                  </td>
                  {partnerLabel && (
                    <td className="text-cp-muted py-4 pr-4 text-[14px]">
                      {entry.partner}
                    </td>
                  )}
                  <td className="text-cp-muted hidden py-4 pr-4 text-right text-[13px] tabular-nums sm:table-cell">
                    n° {entry.id}
                  </td>
                  {onCancel && (
                    <td className="py-4 pr-6 text-right">
                      <button
                        type="button"
                        onClick={() => onCancel(entry)}
                        className={`text-cp-alert decoration-cp-alert cursor-pointer underline underline-offset-4 hover:decoration-2 ${MICRO}`}
                      >
                        Annuler
                        {/* Le montant et le salarié dans le nom accessible :
                            une colonne de « Annuler » identiques ne dit pas
                            lequel on active. */}
                        <span className="sr-only">
                          {" "}
                          le paiement de {formatEuros(
                            entry.amountCents,
                          )} par {entry.label}
                        </span>
                      </button>
                    </td>
                  )}
                  <td className="text-cp-positive py-4 text-right text-[15px] font-black tabular-nums">
                    +{formatEuros(entry.amountCents)}
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
