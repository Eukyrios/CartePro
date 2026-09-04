"use client";

import { useState } from "react";

/**
 * A set of text filters, and whether any of them is set.
 *
 * The catalogue and the history screen each had this, byte-identical down to
 * the `JSON.stringify` comparison, differing by one line: the history resets
 * its page on every change. That line is `onChange`.
 *
 * The comparison stays as it was — a shallow record of strings, compared as
 * JSON. It is honest about what it is: cheap, and correct for this shape.
 */
export function useFilters<T extends Record<string, string>>(
  empty: T,
  /** Run before every change and before a reset — paging, usually. */
  onChange?: () => void,
) {
  const [filters, setFilters] = useState<T>(empty);

  function setFilter<K extends keyof T>(field: K, value: T[K]) {
    onChange?.();
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function reset() {
    onChange?.();
    setFilters(empty);
  }

  return {
    filters,
    setFilter,
    reset,
    /** True when at least one filter is set, so the reset has something to do. */
    dirty: JSON.stringify(filters) !== JSON.stringify(empty),
  };
}
