"use client";

import { useEffect, useRef, useState } from "react";
import { ministerPicks } from "@/components/data/ministerPicks";
import PartnerPhoto from "@/components/partners/PartnerPhoto";
import { BTN_OUTLINE, CHIP_OFFICIAL, MICRO } from "@/components/ui/surfaces";
import PaymentDialog from "./PaymentDialog";
import type { Partner } from "@/components/data/partners";

/** Copies of the list laid end to end, so the seam is never on screen. */
const COPIES = 3;

/** Drift speed, px per millisecond — about 40px a second. */
const DRIFT = 0.04;

/**
 * « Coup de cœur du Ministre »: the selection, and the Minister's own words on
 * each. The content is the admin's — see data/ministerPicks — so nothing here
 * changes when the selection does, and an empty selection renders the section
 * away rather than leaving a heading over nothing.
 *
 * The row drifts rightward for ever and can be pushed either way by hand.
 *
 * How the loop is seamless: the list is rendered three times end to end and
 * the offset is applied modulo the width of one copy, so the track is always
 * showing the middle of an apparently endless row — there is no jump to hide,
 * because the position never actually resets.
 *
 * The offset is a ref mutated inside requestAnimationFrame and written straight
 * to the transform, not React state: sixty renders a second to move a row would
 * re-render every tile in it.
 */
export default function MinisterPicksSection() {
  const [paying, setPaying] = useState<Partner | null>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const motion = useRef({
    offset: 0,
    /** Where a button press is easing to, or null while drifting. */
    target: null as number | null,
    /** Pointer or focus inside the row: reading should not be a moving target. */
    hovered: false,
    /** A payment dialog is open, so the row behind it holds still. */
    blocked: false,
    drag: null as { pointerX: number; from: number } | null,
    copyWidth: 0,
  });

  const picks = ministerPicks();

  // The dialog's pause belongs in an effect: assigning it while rendering both
  // fires on every render and — as first written — latched on for good.
  useEffect(() => {
    motion.current.blocked = paying !== null;
  }, [paying]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || picks.length === 0) return;

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
        } else if (!m.hovered && !m.blocked && !reduced.matches) {
          m.offset += DRIFT * dt;
        }
      }

      if (m.copyWidth > 0) {
        // Applied modulo one copy: the offset itself keeps growing, so an
        // easing target never has to be wrapped mid-animation.
        const wrapped = ((m.offset % m.copyWidth) + m.copyWidth) % m.copyWidth;
        track!.style.transform = `translateX(${-wrapped}px)`;
      }
      frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [picks.length]);

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

  function handlePointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    motion.current.drag = {
      pointerX: event.clientX,
      from: motion.current.offset,
    };
    motion.current.target = null;
  }

  function handlePointerMove(event: React.PointerEvent) {
    const drag = motion.current.drag;
    if (!drag) return;
    // Dragging left pulls the row left, which means a larger offset.
    motion.current.offset = drag.from - (event.clientX - drag.pointerX);
  }

  function endDrag() {
    motion.current.drag = null;
  }

  if (picks.length === 0) return null;

  return (
    <section
      id="coup-de-coeur"
      className="border-cp-border grid min-h-screen snap-start content-center border-b py-16"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-[clamp(34px,4.4vw,58px)] leading-[0.86] font-black tracking-[-0.07em]">
          Coup de cœur
          <br />
          <em className="text-cp-accent font-serif font-normal">
            du Ministre.
          </em>
        </h2>
        <span className={CHIP_OFFICIAL}>Choisi par le Ministère</span>
      </div>

      {/* Clipped viewport for the track. Hovering or focusing inside it stops
          the drift: reading a card should not be a moving target. */}
      <div
        className="relative mt-10 overflow-hidden"
        onMouseEnter={() => (motion.current.hovered = true)}
        onMouseLeave={() => (motion.current.hovered = false)}
        onFocusCapture={() => (motion.current.hovered = true)}
        onBlurCapture={() => (motion.current.hovered = false)}
      >
        <ul
          ref={trackRef}
          className="flex w-max touch-pan-y gap-5 select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {Array.from({ length: COPIES }).flatMap((_, copy) =>
            picks.map(({ pick, partner }) => (
              <li
                key={`${copy}-${partner.id}`}
                className="w-[min(78vw,320px)] shrink-0"
                /* Only the first copy is real to a screen reader; the others
                   are there to make the row look endless. */
                aria-hidden={copy > 0 ? "true" : undefined}
              >
                <button
                  type="button"
                  tabIndex={copy > 0 ? -1 : undefined}
                  onClick={() => setPaying(partner)}
                  className="border-cp-border group hover:border-cp-fg focus-visible:outline-cp-accent flex h-full w-full cursor-pointer flex-col overflow-hidden border text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <PartnerPhoto partner={partner} />
                  <div className="flex-1 p-4">
                    <p className="text-cp-fg text-[13px] leading-[1.5] italic">
                      «&nbsp;{pick.note}&nbsp;»
                    </p>
                    <address
                      className={`text-cp-muted mt-3 not-italic ${MICRO}`}
                    >
                      {partner.postcode} {partner.city}
                    </address>
                  </div>
                </button>
              </li>
            )),
          )}
        </ul>
      </div>

      <div className="mt-6 flex items-center gap-3">
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
          {picks.length} coup{picks.length > 1 ? "s" : ""} de cœur
        </p>
      </div>

      {paying && (
        <PaymentDialog partner={paying} onClose={() => setPaying(null)} />
      )}
    </section>
  );
}
