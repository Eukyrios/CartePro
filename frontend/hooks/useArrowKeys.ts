"use client";

import type { KeyboardEvent } from "react";

/**
 * Left and right arrows move something by one, and the page does not scroll.
 *
 * The `preventDefault` is the point: the pages here scroll-snap between
 * sections, so without it an arrow press inside a row would move the row *and*
 * jump the page. Two components had written this out identically, differing
 * only in the name of the function they called.
 */
export function useArrowKeys(move: (direction: 1 | -1) => void) {
  return function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    move(event.key === "ArrowRight" ? 1 : -1);
  };
}
