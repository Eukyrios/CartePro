"use client";

import { useEffect, useState } from "react";
import CreditCard3D from "@/components/home/CreditCard3D";
import {
  balanceCents,
  cancelToken,
  formatEuros,
  issueToken,
  payWithToken,
  tokenState,
} from "@/components/data/ledger";
import { Eyebrow } from "@/components/home/Marks";
import TextField from "@/components/ui/TextField";
import {
  BTN_OUTLINE,
  BTN_SOLID,
  MICRO,
  NOTE_DANGER,
  NOTE_POSITIVE,
  SIMULATION_NOTICE,
} from "@/components/ui/surfaces";
import TokenQr from "./TokenQr";
import { useLedger } from "./useLedger";
import type { Partner } from "@/components/data/partners";

/** "12,50" or "12.5" -> 1250. Null for anything that is not an amount. */
function toCents(typed: string): number | null {
  const cleaned = typed.replace(",", ".").trim();
  if (!/^\d*\.?\d{0,2}$/.test(cleaned) || cleaned === "" || cleaned === ".") {
    return null;
  }
  return Math.round(Number(cleaned) * 100);
}

function mmss(msLeft: number) {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60,
  ).padStart(2, "0")}`;
}

/**
 * Paying a partner: an amount, a single-use QR, and the card in its second
 * state while that QR is live.
 *
 * Opened from a partner rather than living on a screen of its own, because a
 * payment is always to someone: the partner is chosen by the tile that was
 * clicked, so there is no partner picker here.
 *
 * The rules are the ledger's (see data/ledger). This dialog only prints what
 * the ledger refuses, in the ledger's own words — including the two that
 * matter most: nothing above the balance, nothing at or below zero.
 */
export default function PaymentDialog({
  partner,
  onClose,
}: {
  partner: Partner;
  onClose: () => void;
}) {
  const ledger = useLedger();
  const balance = balanceCents(ledger);
  const token = ledger.token;

  const [amount, setAmount] = useState("10,00");
  const [refusal, setRefusal] = useState<string | null>(null);
  const [paid, setPaid] = useState<string | null>(null);
  // The token expiring is a change on screen, so a clock has to drive it.
  const [now, setNow] = useState(() => Date.now());

  const status = tokenState(token, now);

  useEffect(() => {
    if (status !== "active") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  // Escape closes, as it does on every dialog.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function generate() {
    setPaid(null);
    const cents = toCents(amount);
    if (cents === null) {
      setRefusal("Le montant doit être un nombre d'euros et de centimes.");
      return;
    }
    const result = issueToken(cents);
    setRefusal(result.ok ? null : result.reason);
    setNow(Date.now());
  }

  function pay() {
    if (!token) return;
    const result = payWithToken(token.id, {
      id: partner.id,
      name: partner.name,
    });
    if (result.ok) {
      setPaid(
        `${formatEuros(result.transaction.amountCents)} chez ${partner.name}. Solde mis à jour.`,
      );
      setRefusal(null);
    } else {
      setRefusal(result.reason);
      setPaid(null);
    }
  }

  function close() {
    // A live token belongs to the payment being abandoned.
    if (tokenState(token) === "active") cancelToken();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Payer chez ${partner.name}`}
        className="bg-cp-page border-cp-fg relative z-50 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-none border-2 p-7 sm:p-8"
      >
        <button
          type="button"
          onClick={close}
          className="text-cp-muted hover:bg-cp-surface hover:text-cp-fg absolute end-4 top-4 inline-flex size-8 items-center justify-center rounded-none bg-transparent"
        >
          <svg
            className="size-4"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18 17.94 6M18 18 6.06 6"
            />
          </svg>
          <span className="sr-only">Fermer</span>
        </button>

        <Eyebrow>PAYER CHEZ</Eyebrow>
        <h2 className="text-cp-fg mt-3 text-[clamp(24px,3vw,34px)] leading-[0.95] font-black tracking-[-0.05em]">
          {partner.name}
        </h2>
        <p className={`text-cp-muted mt-2 ${MICRO}`}>
          {partner.postcode} {partner.city}
        </p>
        <p className={`${SIMULATION_NOTICE} mt-4`}>
          Simulation — ce QR ne débite rien de réel
        </p>

        <div className="mt-7 grid gap-8 sm:grid-cols-2">
          <div>
            <TextField
              id="paiement-montant"
              label="Montant à payer"
              value={amount}
              onChange={(value) => setAmount(value.replace(/[^\d.,]/g, ""))}
              inputMode="decimal"
              hint={`Disponible : ${formatEuros(balance)}`}
            />

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={generate} className={BTN_SOLID}>
                {status === "active" ? "Nouveau QR" : "Générer le QR"}
              </button>
              {status === "active" && (
                <button type="button" onClick={pay} className={BTN_OUTLINE}>
                  Simuler le scan
                </button>
              )}
            </div>

            {/* The refusal is the point: it says why, in the ledger's words. */}
            {refusal && (
              <p role="alert" className={`${NOTE_DANGER} mt-6`}>
                {refusal}
              </p>
            )}
            {paid && (
              <p role="status" className={`${NOTE_POSITIVE} mt-6`}>
                {paid}
              </p>
            )}

            {/* The card's second state, while a QR is live. */}
            <div className="mt-8">
              <CreditCard3D
                balanceCents={balance}
                state={status === "active" ? "payment" : "rest"}
              />
              <p className={`text-cp-muted mt-3 ${MICRO}`}>
                {status === "active" ? "Au moment du paiement" : "Au repos"}
              </p>
            </div>
          </div>

          <div>
            {status === "none" ? (
              <div className="border-cp-border text-cp-muted flex aspect-square w-full items-center justify-center border border-dashed p-8 text-center text-[13px]">
                Le QR apparaîtra ici, valable cinq minutes et pour un seul
                paiement.
              </div>
            ) : (
              <>
                <TokenQr tokenId={token!.id} dimmed={status !== "active"} />
                <p className={`text-cp-fg mt-4 ${MICRO}`}>
                  {status === "active" && (
                    <>
                      Valable {mmss(token!.expiresAt - now)} ·{" "}
                      {formatEuros(token!.amountCents)}
                    </>
                  )}
                  {status === "used" && "QR déjà utilisé — usage unique"}
                  {status === "expired" && "QR expiré — générez-en un nouveau"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
