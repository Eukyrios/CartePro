"use client";

import { useRef, useState } from "react";
import Display from "@/components/ui/Display";
import Pager from "@/components/ui/Pager";
import { PANEL_BOX } from "@/components/ui/surfaces";

export type Step = {
  index: string;
  title: string;
  body: string;
};

/** Past this much horizontal travel a release counts as a swipe, not a nudge. */
const SWIPE_THRESHOLD = 92;

/** How long the pile takes to settle: a slow drag lands soft, a flick snaps. */
const SETTLE_MS = { min: 240, max: 520 } as const;

/**
 * The three steps as a pile of cards you swipe through: swiping left throws the
 * front card onto the pile behind and to the left, swiping right pulls it back
 * off — the pile grows and shrinks with the direction.
 *
 * Everything is driven from one `active` index and the live drag offset, and
 * every card is always mounted: a card's place in the fan is a pure function
 * of how far it sits from `active`, so no card ever animates in or out and the
 * whole deck stays one CSS transition.
 */
export default function StepsDeck({ steps }: { steps: readonly Step[] }) {
  const [active, setActive] = useState(0);
  /** Live pointer travel in px, or null when no drag is in progress. */
  const [drag, setDrag] = useState<number | null>(null);
  /** Settle duration of the last release, so a flick lands faster than a drag. */
  const [settleMs, setSettleMs] = useState<number>(SETTLE_MS.max);
  const startX = useRef(0);
  /** Last move, for the release velocity. */
  const lastMove = useRef({ x: 0, t: 0 });

  const last = steps.length - 1;

  /** Move the pile, settling over `ms` — buttons and keys always land soft. */
  function go(delta: number, ms: number = SETTLE_MS.max) {
    setSettleMs(ms);
    setActive((current) => Math.min(Math.max(current + delta, 0), last));
  }

  function handlePointerDown(event: React.PointerEvent) {
    /* Left button only: a right-click drag would otherwise strand the card
       mid-swipe, since no pointerup follows on the card. */
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    startX.current = event.clientX;
    lastMove.current = { x: event.clientX, t: event.timeStamp };
    setDrag(0);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (drag === null) return;
    const travel = event.clientX - startX.current;
    lastMove.current = { x: event.clientX, t: event.timeStamp };
    /* At either end there is nothing to swipe to, so the card rubber-bands
       instead of following the pointer — and the damped travel cannot reach
       the threshold, so the release commits nothing. */
    const blocked =
      (travel < 0 && active === last) || (travel > 0 && active === 0);
    setDrag(blocked ? travel * 0.28 : travel);
  }

  function handlePointerUp(event: React.PointerEvent) {
    if (drag === null) return;

    /* px/ms over the last move. A hard flick should not crawl to a stop, so
       the faster the release the shorter the settle. */
    const elapsed = Math.max(event.timeStamp - lastMove.current.t, 1);
    const speed = Math.abs(event.clientX - lastMove.current.x) / elapsed;
    const ms = Math.round(
      Math.min(
        Math.max(SETTLE_MS.max - speed * 220, SETTLE_MS.min),
        SETTLE_MS.max,
      ),
    );

    if (drag <= -SWIPE_THRESHOLD) go(1, ms);
    else if (drag >= SWIPE_THRESHOLD) go(-1, ms);
    else setSettleMs(ms);
    setDrag(null);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    /* The page scroll-snaps between sections; arrow keys here belong to the
       deck, not to the scroll. */
    event.preventDefault();
    go(event.key === "ArrowRight" ? 1 : -1);
  }

  return (
    <div className="w-full max-w-[720px]">
      {/* tabIndex on the wrapper rather than on a card: the cards move, so the
          stable element is the stage around them. The settle duration rides
          down as a variable so the whole pile keeps one tempo. */}
      <div
        role="group"
        aria-label="Les trois étapes, à parcourir par glissement"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ "--deck-ms": `${settleMs}ms` } as React.CSSProperties}
        className="deck-stage focus-visible:outline-cp-accent relative h-[400px] w-full touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-[14px] sm:h-[min(58vh,540px)] lg:h-[min(62vh,600px)]"
      >
        {steps.map((step, position) => {
          const delta = position - active;
          const isFront = delta === 0;
          const offset = drag ?? 0;

          /* Depth is real perspective rather than a flat scale(): the stage
             carries a perspective, so pushing a card back on Z shrinks it and
             tilting it on Y turns its edge towards you.

             Front card follows the pointer, dipping and lifting off the pile as
             it is pulled aside. Behind it the cards fan right-and-back for the
             ones still to come, and thrown left-and-up for the ones already
             dealt, which also fade as they stack deeper. */
          const transform = isFront
            ? `translate3d(${offset}px, ${Math.abs(offset) * 0.05}px, 40px) rotate(${offset / 22}deg)`
            : delta > 0
              ? `translate3d(${delta * 26}px, ${delta * 16}px, ${-delta * 55}px) rotateY(${-delta * 3}deg) rotate(${delta * 1.6}deg)`
              : `translate3d(calc(-8% + ${delta * 34}px), ${delta * 15}px, ${delta * 45}px) rotateY(${-delta * 3}deg) rotate(${delta * 4.5}deg)`;

          return (
            <article
              key={step.index}
              /* Dragging turns the transition off so the card tracks the
                 pointer exactly; releasing turns it back on to animate home. */
              data-dragging={isFront && drag !== null ? "true" : undefined}
              style={{
                transform,
                /* The pile cascades rather than moving as a block — but only
                   on release: mid-drag a delay would lag the finger. */
                transitionDelay:
                  drag !== null ? "0ms" : `${Math.abs(delta) * 30}ms`,
                /* Front card above everything, then the discard pile with the
                   most recent on top, then the cards still to come. A card
                   being dealt therefore flies over the pile, not under it. */
                zIndex: isFront ? 100 : delta < 0 ? 90 + delta : 50 - delta,
              }}
              /* overflow-hidden keeps the oversized index inside the card. */
              className={`deck-card ${PANEL_BOX} absolute inset-0 overflow-hidden p-9 select-none sm:p-12 lg:p-14 ${
                isFront
                  ? "cursor-grab active:cursor-grabbing"
                  : "pointer-events-none"
              }`}
              onPointerDown={isFront ? handlePointerDown : undefined}
              onPointerMove={isFront ? handlePointerMove : undefined}
              onPointerUp={isFront ? handlePointerUp : undefined}
              onPointerCancel={isFront ? () => setDrag(null) : undefined}
            >
              {/* The fade belongs to what is printed on the card, not to the
                  card: an opacity on the article itself made the whole thing
                  translucent — background included — so the cards underneath
                  showed through the pile. The card stays opaque and only its
                  contents dim with depth.

                  `justify-center` depuis que le bandeau du haut — la pastille,
                  le numéro et la flèche — a été retiré : `justify-between`
                  n'avait plus qu'un enfant en flux, et le titre se retrouvait
                  collé en haut ou en bas d'une carte à moitié vide. */}
              <div
                style={{ opacity: delta < 0 ? 1 + delta * 0.3 : 1 }}
                className="relative flex h-full flex-col justify-center"
              >
                {/* The step number again, oversized and nearly transparent:
                    the card is tall enough that the middle was a void between
                    the meta row and the title. */}
                <span
                  aria-hidden="true"
                  className="text-cp-fg pointer-events-none absolute inset-y-0 right-0 flex items-center text-[clamp(150px,22vw,290px)] leading-none font-black tracking-[-0.09em] opacity-[0.055]"
                >
                  {step.index}
                </span>

                <div className="relative">
                  <Display level={3} scale="card" className="mb-4">
                    {step.title}
                  </Display>
                  <p className="text-cp-muted m-0 max-w-[540px] text-[17px] leading-[1.55]">
                    {step.body}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* La position est annoncée au changement : la pile visuelle ne la porte
          pas à elle seule. */}
      <Pager
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        prevLabel="Étape précédente"
        nextLabel="Étape suivante"
        atStart={active === 0}
        atEnd={active === last}
        position={[Number(steps[active].index), Number(steps[last].index)]}
        className="mt-9"
      />
    </div>
  );
}
