"use client";

import { useEffect, useMemo, useState } from "react";
import { MICRO } from "@/components/ui/surfaces";

/**
 * The screens of the landing page, in order. The first entry is the top of the
 * document rather than the hero element, because the header belongs to that
 * first screen — and it carries no index, matching the design where only the
 * content sections are numbered.
 */
export type RailSection = {
  id: string;
  /** Two digits, or empty for a screen the design leaves unnumbered. */
  index: string;
  label: string;
};

const LANDING_SECTIONS: readonly RailSection[] = [
  { id: "accueil", index: "", label: "Accueil" },
  { id: "fonctionnement", index: "01", label: "Fonctionnement" },
  { id: "coup-de-coeur", index: "02", label: "Coup de cœur" },
  { id: "confiance", index: "03", label: "Confiance" },
];

/**
 * A slim timeline pinned to the side: one rule per screen, the current one
 * drawn longer, and each clickable to travel there. The section title slides in
 * on hover — these replaced the anchors that used to sit in the header.
 *
 * `mix-blend-difference` keeps it legible over every screen without tracking
 * which one is behind it: the rules invert against the white sections and
 * against the blue closing panel alike.
 *
 * Hidden below lg, where a fixed side rail would sit on top of the content.
 */
export default function SectionNav({
  sections = LANDING_SECTIONS,
}: {
  /** Which screens the rail lists. The salarié space passes its own. */
  sections?: readonly RailSection[];
}) {
  const [active, setActive] = useState<string>(sections[0].id);
  /* Les écrans réellement dans le document, dans l'ordre du rail.
     Tous au départ : c'est ce que le serveur a rendu, donc l'hydratation
     retrouve le même balisage, et la liste se resserre ensuite. */
  const [presents, setPresents] = useState<readonly string[]>(() =>
    sections.map((section) => section.id),
  );

  useEffect(() => {
    let intersection: IntersectionObserver | null = null;
    let cibles: HTMLElement[] = [];

    /* Rebranche l'observateur sur les écrans présents, si la liste a changé.
       Appelé au montage **et** à chaque modification du document, et c'est
       tout l'objet de cette fonction : la version précédente relevait les
       cibles une seule fois, après le premier rendu, et un écran monté plus
       tard n'était jamais observé. Mesuré sur la page d'accueil :
       l'observateur se branchait à 338 ms sur « accueil », « fonctionnement »
       et « confiance », tandis que « Coup de cœur » — dont le contenu vient
       d'un appel au serveur, et qui ne rend rien avant la réponse —
       apparaissait à 371 ms. Trente-trois millisecondes de retard, et son
       entrée du rail ne s'allumait plus jamais. */
    const brancher = () => {
      const trouves = sections
        .map(({ id }) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);

      const identique =
        trouves.length === cibles.length &&
        trouves.every((el, rang) => el === cibles[rang]);
      if (identique) return;

      cibles = trouves;
      setPresents(trouves.map((el) => el.id));
      intersection?.disconnect();
      intersection = null;
      if (trouves.length === 0) return;

      // Collapsing the root to the viewport's middle line means exactly one
      // full-height section intersects at a time: the one you are looking at.
      intersection = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setActive(entry.target.id);
          }
        },
        { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
      );
      trouves.forEach((el) => intersection?.observe(el));
    };

    brancher();
    /* `brancher` sort immédiatement quand rien n'a bougé — quelques
       `getElementById` et une comparaison d'identité — donc surveiller tout le
       document coûte peu, et les mutations arrivent par lots. */
    const arrivees = new MutationObserver(brancher);
    arrivees.observe(document.body, { childList: true, subtree: true });

    return () => {
      arrivees.disconnect();
      intersection?.disconnect();
    };
  }, [sections]);

  /* Le rail ne liste que ce qui existe, et renumérote ce qu'il liste.
     Deux raisons distinctes. Une entrée vers un écran absent est un bouton qui
     ne fait rien : sans coup de cœur actif, `Coup de cœur` restait dans le
     rail et le clic ne menait nulle part. Et un « 02 » manquant entre 01 et 03
     se lit comme une erreur — c'est déjà la règle de l'espace partenaire, dont
     le nombre d'écrans dépend du statut du compte. */
  const entrees = useMemo(() => {
    let rang = 0;
    return sections
      .filter((section) => presents.includes(section.id))
      .map((section) => ({
        ...section,
        index: section.index ? String(++rang).padStart(2, "0") : "",
      }));
  }, [sections, presents]);

  function goTo(id: string) {
    // Scrolling to 0 rather than to the hero keeps the header in view, which is
    // what the first snap position shows. Smoothness comes from
    // `scroll-behavior` in globals.css.
    if (id === sections[0].id) {
      window.scrollTo({ top: 0 });
      return;
    }
    document.getElementById(id)?.scrollIntoView();
  }

  return (
    <nav
      aria-label="Sections de la page"
      className="fixed top-1/2 right-5 z-40 hidden -translate-y-1/2 flex-col items-end gap-3.5 mix-blend-difference lg:flex"
    >
      {entrees.map(({ id, index, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => goTo(id)}
          aria-current={active === id ? "true" : undefined}
          className="rail-item group relative flex h-4 cursor-pointer items-center justify-end"
        >
          {/* Absolute and click-through so the label neither widens the hit
                area nor sits over the page content it overhangs. */}
          <span
            aria-hidden="true"
            className={`rail-label pointer-events-none absolute right-full mr-3 whitespace-nowrap text-white ${MICRO}`}
          >
            {index && <span className="mr-[7px]">{index}</span>}
            {label}
          </span>
          <span className="sr-only">{label}</span>
          <span className="rail-bar block h-px bg-white" />
        </button>
      ))}
    </nav>
  );
}
