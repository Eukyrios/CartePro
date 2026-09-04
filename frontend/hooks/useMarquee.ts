"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * An endless row that drifts on its own and can be pushed by hand.
 *
 * How the loop is seamless: the caller renders its list `COPIES` times end to
 * end and this applies the offset modulo the width of one copy, so the track is
 * always showing the middle of an apparently endless row. There is no jump to
 * hide, because the position never actually resets.
 *
 * The offset lives in a ref and is written straight to the transform, never in
 * React state: sixty renders a second to move a row would re-render every tile
 * in it.
 *
 * This exact loop lived in two components at once for two commits, character
 * for character, and was resolved by deleting one of the call sites rather than
 * extracting it. Extracting it is what stops the next row from cloning it
 * again.
 *
 * The drag here is a *free offset* — press, follow, release, and the drift
 * takes over. It is not the step deck's drag, which commits to a discrete card
 * past a threshold and rubber-bands at the ends; those two look alike and share
 * almost nothing, so they stay apart.
 */

/** Copies of the list laid end to end, so the seam is never on screen. */
export const MARQUEE_COPIES = 3;

/** Drift speed, px per millisecond — about 40px a second. */
const DRIFT = 0.04;

export function useMarquee(
  /**
   * Anything that changes the row's contents, and therefore its width: the
   * offset restarts, since the old one would land anywhere.
   */
  contents: unknown,
) {
  const trackRef = useRef<HTMLUListElement>(null);
  const motion = useRef({
    offset: 0,
    /** Where a button press is easing to, or null while drifting. */
    target: null as number | null,
    /** Pointer or focus inside the row: reading should not be a moving target. */
    hovered: false,
    drag: null as { pointerX: number; from: number } | null,
    copyWidth: 0,
  });
  /** Set while a drag is in progress, read by the tiles' click handler. */
  const dragged = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    motion.current.offset = 0;
    motion.current.target = null;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = performance.now();

    function step(now: number) {
      const dt = Math.min(now - last, 64); // a backgrounded tab must not lurch
      last = now;
      const m = motion.current;
      m.copyWidth = track!.scrollWidth / MARQUEE_COPIES;

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
        } else if (!m.hovered && !reduced.matches) {
          m.offset += DRIFT * dt;
        }
      }

      if (m.copyWidth > 0) {
        /* Applied modulo one copy: the offset itself keeps growing, so an
           easing target never has to be wrapped mid-animation. */
        const wrapped = ((m.offset % m.copyWidth) + m.copyWidth) % m.copyWidth;
        track!.style.transform = `translateX(${-wrapped}px)`;
      }
      frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [contents]);

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

  function onPointerDown(event: ReactPointerEvent) {
    if (event.button !== 0) return;
    /* No setPointerCapture here, deliberately. A container that captures the
       pointer on pointerdown becomes the target of the click that follows, so
       the tile's link never received it and clicking a partner did nothing.
       Capture is taken on the first real movement instead — a plain click then
       never involves capture at all. */
    motion.current.drag = {
      pointerX: event.clientX,
      from: motion.current.offset,
    };
    motion.current.target = null;
    dragged.current = false;
  }

  function onPointerMove(event: ReactPointerEvent) {
    const drag = motion.current.drag;
    if (!drag) return;
    if (Math.abs(event.clientX - drag.pointerX) > 6) {
      dragged.current = true;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
    // Dragging left pulls the row left, which means a larger offset.
    motion.current.offset = drag.from - (event.clientX - drag.pointerX);
  }

  function onPointerUp() {
    motion.current.drag = null;
    // After the click that follows this release, so the tile's guard still sees
    // it, but never outliving the gesture.
    window.setTimeout(() => (dragged.current = false), 0);
  }

  /** Stops the drift while a pointer or the keyboard focus is inside the row. */
  const hoverHandlers = {
    onMouseEnter: () => (motion.current.hovered = true),
    onMouseLeave: () => (motion.current.hovered = false),
    onFocusCapture: () => (motion.current.hovered = true),
    onBlurCapture: () => (motion.current.hovered = false),
  };

  return {
    trackRef,
    nudge,
    /** Spread onto the track element. */
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
    /** Spread onto the clipping viewport around the track. */
    hoverHandlers,
    /** True if the gesture that just ended moved the row: not a tap. */
    dragged,
  };
}
