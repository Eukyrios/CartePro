import { LogoMark } from "./Marks";

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
 * The source snippet used daisyUI's `card` / `card-body`, which this project
 * does not have (it is on Flowbite), so those two are spelled out as utilities
 * here instead.
 */
export default function CreditCard3D() {
  return (
    <div className="hover-3d w-full">
      {/* content */}
      <div className="hover-3d-card bg-primary-700 flex aspect-[1.6] w-full flex-col justify-between rounded-3xl bg-[radial-gradient(circle_at_bottom_left,#ffffff0a_35%,transparent_36%),radial-gradient(circle_at_top_right,#ffffff0a_35%,transparent_36%)] bg-size-[4.95em_4.95em] p-[6%] text-white shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark
              className="size-7 bg-white"
              barClassName="bg-primary-700"
            />
            <span className="text-[11px] font-black tracking-[0.14em]">
              CARTEPRO
            </span>
          </div>
          <div className="text-5xl leading-none opacity-10">❁</div>
        </div>

        <div>
          <small className="mb-1 block text-[8px] font-black tracking-[0.15em] opacity-70">
            SIMULATION
          </small>
          <strong className="block text-[clamp(34px,4.4vw,68px)] leading-[0.9] tracking-[-0.08em]">
            32,50 €
          </strong>
        </div>

        <div>
          <div className="mb-3 text-[clamp(12px,1.1vw,17px)] tracking-[0.1em] opacity-40">
            0210 8820 1150 0222
          </div>
          <div className="flex items-end justify-between text-[clamp(10px,0.9vw,14px)]">
            <div>
              <div className="text-[8px] font-black tracking-[0.14em] opacity-40">
                TITULAIRE
              </div>
              <div>ALEX MARTIN</div>
            </div>
            <div className="flex items-end gap-6 sm:gap-8">
              <div className="text-right">
                <div className="text-[8px] font-black tracking-[0.14em] opacity-40">
                  EXPIRE LE
                </div>
                <div>29/08</div>
              </div>
              <div className="text-right">
                <div className="text-[8px] font-black tracking-[0.14em] opacity-40">
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
  );
}
