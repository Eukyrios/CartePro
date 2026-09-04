"use client";

import { formatEuros } from "@/components/data/ledger";
import VectorMark from "./VectorMark";
import {
  DEFAULT_CARD_STYLE,
  displayNameOf,
  useAccount,
} from "@/components/account/AccountProvider";
import type {
  CardPattern,
  CardStyle,
} from "@/components/account/AccountProvider";

/**
 * The pattern printed behind the card's text. Built from the text colour so it
 * reads on both a light and a dark card, at the low alpha the design uses.
 */
export function patternLayer(pattern: CardPattern, text: string) {
  const ink = (alpha: string) => hexToRgba(text, alpha);
  switch (pattern) {
    case "none":
      return { backgroundImage: "none" };
    case "dots":
      return {
        backgroundImage: `radial-gradient(circle, ${ink("0.18")} 1.5px, transparent 1.6px)`,
        backgroundSize: "1.6em 1.6em",
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(to right, ${ink("0.10")} 1px, transparent 1px), linear-gradient(to bottom, ${ink("0.10")} 1px, transparent 1px)`,
        backgroundSize: "2.4em 2.4em",
      };
    case "stripes":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${ink("0.12")} 0 0.32em, transparent 0.32em 1.1em)`,
      };
    case "crosshatch":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${ink("0.10")} 0 1px, transparent 1px 0.85em), repeating-linear-gradient(-45deg, ${ink("0.10")} 0 1px, transparent 1px 0.85em)`,
      };
    case "rings":
      return {
        backgroundImage: `repeating-radial-gradient(circle at 12% 88%, transparent 0 1.15em, ${ink("0.11")} 1.15em 1.28em)`,
      };
    case "checker":
      return {
        backgroundImage: `conic-gradient(${ink("0.10")} 0 25%, transparent 0 50%, ${ink("0.10")} 0 75%, transparent 0)`,
        backgroundSize: "2.2em 2.2em",
      };
    case "waves":
    default:
      return {
        backgroundImage: `radial-gradient(circle at bottom left, ${ink("0.10")} 35%, transparent 36%), radial-gradient(circle at top right, ${ink("0.10")} 35%, transparent 36%)`,
        backgroundSize: "4.95em 4.95em",
      };
  }
}

/**
 * The specular sweep across the card.
 *
 * Fixed white and black stops, with no reference to the card's ink: a highlight
 * is the light source reflecting off the surface, so tinting it with the text
 * colour — as this did — made the sheen turn orange or blue with the font, which
 * reads as a coloured wash rather than a reflection.
 *
 * Quality comes from the stop list, not from one soft band: a bright narrow
 * core with a wide falloff, a second dimmer streak trailing it, and dark bands
 * on the shoulders. Plain alpha rather than mix-blend-mode `overlay`, which
 * looks richer on the dark presets but cancels itself out entirely on a light
 * card, where screen-blending white over white leaves nothing.
 */
const SHEEN_GRADIENT = `linear-gradient(105deg,
  rgba(0,0,0,0.10) 10%,
  rgba(255,255,255,0.04) 24%,
  rgba(255,255,255,0.30) 38%,
  rgba(255,255,255,0.68) 45%,
  rgba(255,255,255,0.30) 52%,
  rgba(255,255,255,0.03) 61%,
  rgba(0,0,0,0.13) 67%,
  rgba(255,255,255,0.04) 73%,
  rgba(255,255,255,0.24) 79%,
  rgba(255,255,255,0.04) 85%,
  rgba(0,0,0,0.08) 95%)`;

/** #rrggbb -> rgba(), so a picked hex can be used at partial alpha. */
export function hexToRgba(hex: string, alpha: string) {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return `rgba(255,255,255,${alpha})`;
  return `rgba(${(int >> 16) & 255},${(int >> 8) & 255},${int & 255},${alpha})`;
}

/**
 * The hero's credit card, tilting towards the pointer on hover.
 *
 * The eight empty divs after the card are the hover zones — see `.hover-3d` in
 * globals.css for how they drive the tilt. They must stay, and stay after the
 * card, for the effect to work.
 *
 * Sizing is fluid: the card fills whatever width its container gives it, so it
 * keeps its proportions on a wide screen instead of sitting small in the panel.
 *
 * Every size inside is in `cqw` against the card's own inline size, not `vw`.
 * Viewport units made the small settings preview render the same 63px balance
 * as the full-width hero card, overflowing it.
 *
 * The source snippet used daisyUI's `card` / `card-body`, which this project
 * does not have (it is on Flowbite), so those two are spelled out as utilities
 * here instead.
 *
 * Colours come from the signed-in employé's saved card style. Pass `style` to
 * override that — the settings page does, so its preview follows the unsaved
 * draft rather than what is stored.
 */
export default function CreditCard3D({
  style,
  state = "rest",
  balanceCents = 3250,
}: {
  style?: CardStyle;
  /**
   * The balance to print, in cents. Defaults to the landing page's figure,
   * which has no ledger behind it; the salarié space passes the live one, so
   * the card is one of the surfaces a payment updates immediately.
   */
  balanceCents?: number;
  /**
   * "rest" is the card as carried; "payment" is the instant it is used — the
   * two states the salarié space has to show.
   */
  state?: "rest" | "payment";
}) {
  const { profile } = useAccount();
  const card = style ?? profile?.cardStyle ?? DEFAULT_CARD_STYLE;
  const paying = state === "payment";
  /* Le titulaire est celui qui est connecté — une carte porte le nom de son
     porteur. Hors connexion, sur la page d'accueil, personne n'est titulaire
     de rien : la ligne annonce la place plutôt que d'inventer un nom. */
  const holder = profile ? displayNameOf(profile) : "Votre nom";

  return (
    // The query container every cqw below resolves against. It has to be an
    // ancestor of the card, not the card itself: `container-type` applies to an
    // element's descendants, so a card sizing its own padding in cqw fell back
    // to the viewport and blew out to 6% of the window.
    <div className="w-full" style={{ containerType: "inline-size" }}>
      <div className="hover-3d w-full">
        {/* content */}
        <div
          className="hover-3d-card relative flex aspect-[1.6] w-full flex-col justify-between overflow-hidden rounded-[4cqw] p-[6cqw] shadow-2xl"
          style={{
            backgroundColor: card.color,
            color: card.text,
            ...patternLayer(card.pattern, card.text),
          }}
        >
          {/* Metallic sheen: the strength is the metalness setting, the sweep
              itself is fixed (see SHEEN_GRADIENT). Click-through so it never
              eats the hover, and `.card-sheen` is what slides it across the
              card as the card tilts — see globals.css. */}
          <div
            aria-hidden="true"
            className="card-sheen pointer-events-none absolute inset-0"
            style={{
              opacity: card.metalness / 100,
              backgroundImage: SHEEN_GRADIENT,
            }}
          />
          <div className="flex items-start justify-between">
            {/* In the card's own ink: VectorMark draws in currentColor, and
                the card sets `color` to the employé's chosen text colour, so
                the mark follows every restyle without a second asset. Sized in
                cqw like everything else on the card. */}
            <VectorMark className="h-[9cqw] w-auto" />
            {paying ? (
              /* A token QR, drawn from the card's own ink: the card at the
                 moment of payment is presenting something. */
              <div
                aria-hidden="true"
                className="size-[13cqw] shrink-0"
                style={{
                  backgroundColor: card.text,
                  backgroundImage: `linear-gradient(to right, ${hexToRgba(card.color, "1")} 1px, transparent 1px), linear-gradient(to bottom, ${hexToRgba(card.color, "1")} 1px, transparent 1px)`,
                  backgroundSize: "18% 18%",
                }}
              />
            ) : (
              <div className="text-[12cqw] leading-none opacity-10">❁</div>
            )}
          </div>

          <div>
            {/* The card shows one number: the balance it currently carries.
                Never a debit, never a negative — the amount is the same in both
                states, and only the notice beside it says which state this is.
                Any wording around the balance belongs to the page holding the
                card, not to the card. The simulation notice stays visible here
                because a monetary value is on show. */}
            <small className="mb-[1cqw] block text-[2.2cqw] font-black tracking-[0.15em] opacity-70">
              {paying ? "Paiement · Simulation" : "Simulation"}
            </small>
            <strong className="block text-[12cqw] leading-[0.9] tracking-[-0.08em]">
              {formatEuros(balanceCents)}
            </strong>
          </div>

          <div>
            <div className="mb-[3cqw] text-[3.4cqw] tracking-[0.1em] opacity-40">
              0210 8820 1150 0222
            </div>
            <div className="flex items-end justify-between gap-[4cqw] text-[3cqw]">
              {/* Le nom vient du compte : il peut être une raison sociale
                  longue. Il se coupe plutôt que de pousser la date et le CVV
                  hors de la carte. */}
              <div className="min-w-0">
                <div className="text-[2.1cqw] font-black tracking-[0.14em] opacity-40">
                  TITULAIRE
                </div>
                <div className="truncate uppercase">{holder}</div>
              </div>
              <div className="flex shrink-0 items-end gap-[6cqw]">
                <div className="text-right">
                  <div className="text-[2.1cqw] font-black tracking-[0.14em] opacity-40">
                    EXPIRE LE
                  </div>
                  <div>29/08</div>
                </div>
                <div className="text-right">
                  <div className="text-[2.1cqw] font-black tracking-[0.14em] opacity-40">
                    CVV
                  </div>
                  <div>482</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 8 empty divs needed for the 3D effect */}
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );
}
