import QrCode from "@/components/ui/QrCode";

/**
 * A mock QR code that dissolves into a payment confirmation on hover, and
 * re-forms when the pointer leaves. The animation itself lives in globals.css
 * under `.qr-dissolve`; the ticket and its module grid are `QrCode`.
 *
 * The confirmation is real text in the DOM, so it reaches assistive technology
 * whether or not the dissolve ever plays, and the ticket is focusable so the
 * effect is reachable from the keyboard. Only keyboard focus reveals it: the
 * CSS keys off `:focus-visible`, so clicking the code does not leave it
 * dissolved once the pointer moves away.
 *
 * One width and an aspect ratio, not `size-*` plus a `max-w`: that pair caps
 * the width while leaving the height on min(74vw,42vh), so the ticket stretched
 * into a portrait rectangle on any viewport where that expression came out
 * above the cap. Folding the cap into the min() keeps it square everywhere.
 */
export default function PaymentQr() {
  return (
    <QrCode
      motion="dissolve"
      label="QR de paiement de démonstration : 10,00 € payés via ce QR"
      className="w-[min(74vw,42vh,460px)]"
    >
      <div className="qr-reveal pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="text-[clamp(8px,1vw,12px)] font-black tracking-[0.14em] text-gray-500">
          SIMULATION
        </span>
        <strong className="text-primary-700 mt-2 block text-[clamp(30px,4.4vw,66px)] leading-none tracking-[-0.05em]">
          10,00 €
        </strong>
        <span className="mt-3 text-[clamp(10px,1.1vw,15px)] leading-[1.4] text-gray-500">
          payés via ce QR chez le partenaire
        </span>
      </div>
    </QrCode>
  );
}
