"use client";

import { useEffect, useState } from "react";
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
  { id: "confiance", index: "02", label: "Confiance" },
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

  useEffect(() => {
    const elements = sections
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // Collapsing the root to the viewport's middle line means exactly one
    // full-height section intersects at a time: the one you are looking at.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

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
      {sections.map(({ id, index, label }) => (
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
