/**
 * The type half of the CartePro identity, and the diagonal arrow that trails
 * every call to action.
 *
 * The wordmark *is* the logotype — `Logotype` is this and nothing else. It is
 * set in the brand face rather than vectorised, because real type stays crisp
 * at every size, follows the theme's ink, and lets `backend/theme.json` rename
 * the product without anyone redrawing a letter.
 *
 * Marks and type only. Two helpers used to live here — `Eyebrow`, which was
 * `MICRO` minus `font-sans` and `uppercase`, and `SectionRail` — and they
 * belonged to the interface library, not to the marks: the first is now
 * `<Micro tone="accent">`, and the second went with the two landing sections
 * that were its only callers and were rendered nowhere.
 *
 * Two drawn monograms used to live alongside it and neither survived contact
 * with the navbar: `LogoMark`, three skewed bars in a skewed square from the
 * previous brand, and `VectorMark`, a payment card with a C and a chip cut out
 * of it. The second was tried in four proportions and two apertures before the
 * verdict was that the name alone reads better than the name plus a picture of
 * a card. Both are kept as artwork in `public/logo/legacy`, so the decision is
 * reversible without redrawing anything.
 */

/**
 * Coupe un nom de marque sur sa capitale intérieure : « CartePro » donne
 * ["Carte", "Pro"], « Carte Pro » ou « cartepro » ne se coupent pas et
 * reviennent d'un seul morceau.
 *
 * C'est ce qui permet au logotype de suivre `brand.name` : la graisse du
 * logotype se pose sur la coupure, quel que soit le nom, sans qu'une seconde
 * clé du thème ait à la déclarer.
 */
export function splitBrandName(name: string): [string, string] {
  const i = name.slice(1).search(/[A-Z]/);
  return i < 0 ? [name, ""] : [name.slice(0, i + 1), name.slice(i + 1)];
}

type WordMarkProps = {
  /** Wrapper classes. Tout est en em : la taille se règle par `text-*`. */
  className?: string;
  /** Le nom à composer. Par défaut celui de la marque livrée. */
  name?: string;
  /** Pour une encre qui n'est pas connue à la compilation, comme celle de la carte. */
  style?: React.CSSProperties;
};

/**
 * The "CartePro" wordmark: one word, one ink, two weights — `Carte` bold and
 * `Pro` regular.
 *
 * Two weights rather than two colours, which is what the previous wordmark
 * used. A colour pairing needs a second value that holds on white and on
 * near-black alike, and the pale step it landed on came out at 2.29:1; a weight
 * pairing articulates the compound name with no contrast cost at all, and it
 * survives being printed in a single ink — the footer's white, or whatever
 * colour the salarié has chosen for their card.
 *
 * Both weights are real faces: `globals.css` serves Archivo 400 and Archivo 700
 * (declared `700 900`, so `font-bold` and `font-black` both resolve to the same
 * file), so nothing here is synthesised by the browser.
 *
 * The two spans sit in one inline flow, so assistive technology reads
 * "CartePro" straight through — no `sr-only` copy is needed, unlike the
 * previous lockup whose oversized shared T would have been read as three words.
 */
export function WordMark({
  className = "",
  name = "CartePro",
  style,
}: WordMarkProps) {
  const [tete, queue] = splitBrandName(name);
  return (
    <span
      style={style}
      className={`font-sans leading-none font-bold tracking-[-0.02em] whitespace-nowrap ${className}`}
    >
      {tete}
      {queue && <span className="font-normal">{queue}</span>}
    </span>
  );
}

/** The ↗ that follows links and buttons, nudged on hover by the parent group. */
export function Arrow({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`ml-2.5 inline-block text-[15px] leading-none transition-transform duration-200 group-hover:translate-x-[3px] group-hover:-translate-y-[3px] ${className}`}
    >
      ↗
    </span>
  );
}
