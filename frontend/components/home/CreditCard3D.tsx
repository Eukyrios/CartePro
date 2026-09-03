"use client";

import { LogoMark, WordMark } from "./Marks";
import {
  DEFAULT_CARD_STYLE,
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
    case "waves":
    default:
      return {
        backgroundImage: `radial-gradient(circle at bottom left, ${ink("0.10")} 35%, transparent 36%), radial-gradient(circle at top right, ${ink("0.10")} 35%, transparent 36%)`,
        backgroundSize: "4.95em 4.95em",
      };
  }
}

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
export default function CreditCard3D({ style }: { style?: CardStyle }) {
  const { profile } = useAccount();
  const card = style ?? profile?.cardStyle ?? DEFAULT_CARD_STYLE;

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
          {/* Metallic sheen: a diagonal highlight whose strength is the
            metalness setting. Click-through so it never eats the hover. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: card.metalness / 100,
              backgroundImage: `linear-gradient(105deg, transparent 28%, ${hexToRgba(card.text, "0.45")} 45%, transparent 62%)`,
            }}
          />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <LogoMark
                className="size-[7cqw]"
                barClassName="h-[3.8cqw] w-[0.8cqw]"
                style={{ backgroundColor: card.text }}
                barStyle={{ backgroundColor: card.color }}
              />
              {/* The card's ink is chosen by the employé, so the shared T
                  follows it rather than the brand accent. */}
              <WordMark className="text-[2.9cqw]" tClassName="text-inherit" />
            </div>
            <div className="text-[12cqw] leading-none opacity-10">❁</div>
          </div>

          <div>
            <small className="mb-[1cqw] block text-[2.2cqw] font-black tracking-[0.15em] opacity-70">
              SIMULATION
            </small>
            <strong className="block text-[12cqw] leading-[0.9] tracking-[-0.08em]">
              32,50 €
            </strong>
          </div>

          <div>
            <div className="mb-[3cqw] text-[3.4cqw] tracking-[0.1em] opacity-40">
              0210 8820 1150 0222
            </div>
            <div className="flex items-end justify-between text-[3cqw]">
              <div>
                <div className="text-[2.1cqw] font-black tracking-[0.14em] opacity-40">
                  TITULAIRE
                </div>
                <div>ALEX MARTIN</div>
              </div>
              <div className="flex items-end gap-[6cqw]">
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
