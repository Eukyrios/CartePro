"use client";

import { useArrowKeys } from "@/hooks/useArrowKeys";
import { MARQUEE_COPIES, useMarquee } from "@/hooks/useMarquee";
import Pager from "./Pager";
import type { ReactNode } from "react";

/**
 * Le rang qui défile : sa fenêtre rognée, ses copies, et les deux flèches.
 *
 * `useMarquee` tient le mouvement ; ce composant tient tout ce qui l'entoure et
 * qui se recopiait avec lui — la fenêtre en `overflow-hidden`, la piste large
 * de son contenu, les trois copies bout à bout dont une seule existe pour un
 * lecteur d'écran, le clavier sur la piste, et le duo de flèches en dessous.
 * Le commentaire de `useMarquee` dit que la boucle a vécu deux fois dans deux
 * composants ; c'est cette enveloppe qui allait la cloner une troisième.
 *
 * Un rang par sujet : les établissements du réseau, les comptes salariés.
 * L'élément est rendu par l'appelant — une tuile de partenaire n'est pas une
 * tuile de compte — et reçoit de quoi se comporter correctement dans un rang
 * qu'on pousse : `tabIndex` pour ne pas piéger le clavier dans les copies, et
 * `onClick` pour qu'un glissement qui finit sur une tuile reste un glissement
 * et non un choix.
 */
export default function MarqueeRow<T>({
  items,
  keyOf,
  render,
  label,
  prevLabel,
  nextLabel,
  hint = "Le rang défile, glissez-le ou utilisez les flèches",
  className = "mt-5",
}: {
  items: readonly T[];
  /** L'identité de l'élément, pour la clé de rendu. */
  keyOf: (item: T) => string;
  render: (
    item: T,
    chrome: {
      /** -1 sur les copies décoratives. */
      tabIndex?: number;
      onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
    },
  ) => ReactNode;
  /** Ce que le rang est, pour qui ne le voit pas défiler. */
  label: string;
  prevLabel: string;
  nextLabel: string;
  hint?: string;
  className?: string;
}) {
  const { trackRef, nudge, dragHandlers, hoverHandlers, dragged } =
    useMarquee(items);
  const handleKeyDown = useArrowKeys(nudge);

  /* Pousser le rang n'est pas choisir un élément. `detail === 0` est une
     activation au clavier, que nul glissement ne précède : sans ce test, un
     drapeau resté d'un geste plus ancien bloquerait la touche Entrée. */
  const annuleLeGlissement = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.detail !== 0 && dragged.current) event.preventDefault();
  };

  return (
    <>
      {/* La fenêtre rognée. Le survol ou le focus à l'intérieur arrête la
          dérive : on ne lit pas une cible qui bouge. */}
      <div
        className={`relative overflow-hidden ${className}`}
        {...hoverHandlers}
      >
        <ul
          ref={trackRef}
          role="group"
          aria-label={label}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          {...dragHandlers}
          className="focus-visible:outline-cp-accent flex w-max touch-pan-y gap-5 select-none focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {Array.from({ length: MARQUEE_COPIES }).flatMap((_, copy) =>
            items.map((item) => (
              <li
                key={`${copy}-${keyOf(item)}`}
                className="w-[min(78vw,320px)] shrink-0"
                /* Seule la première copie existe pour un lecteur d'écran ; les
                   autres ne sont là que pour rendre le rang sans fin. */
                aria-hidden={copy > 0 ? "true" : undefined}
              >
                {render(item, {
                  tabIndex: copy > 0 ? -1 : undefined,
                  onClick: annuleLeGlissement,
                })}
              </li>
            )),
          )}
        </ul>
      </div>

      <Pager
        onPrev={() => nudge(-1)}
        onNext={() => nudge(1)}
        prevLabel={prevLabel}
        nextLabel={nextLabel}
        hint={hint}
        className="mt-6"
      />
    </>
  );
}
