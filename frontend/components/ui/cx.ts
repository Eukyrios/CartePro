/**
 * Joins class names and drops anything falsy. That is all it does.
 *
 * It does **not** merge: `cx("py-16", "py-3")` emits both, and Tailwind's
 * output order decides the winner (`.py-3` is emitted before `.py-16`, so the
 * base wins whatever the caller passes). That is deliberate and it is why
 * `clsx` + `tailwind-merge` are not here — neither is a declared dependency,
 * and this project has to build from a clone with no account anywhere.
 *
 * The consequence shapes every component in this folder: a `className` prop is
 * an **additive** slot for properties the base does not set. Anything a caller
 * legitimately needs to vary is a prop instead, and no component sets an outer
 * margin — margin is the one axis every caller varies, so leaving it to them
 * removes the conflict rather than arbitrating it.
 *
 * If you find yourself wanting a merge, the component's prop surface is wrong.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
