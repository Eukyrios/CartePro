"use client";

import { useState } from "react";
import BlueprintFrame from "@/components/ui/BlueprintFrame";
import Button from "@/components/ui/Button";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import QrCode from "@/components/ui/QrCode";
import Slash from "@/components/ui/Slash";
import { useQrToken } from "./useQrToken";
import { PANEL } from "@/components/ui/surfaces";
import { cx } from "@/components/ui/cx";

function mmss(msLeft: number) {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60,
  ).padStart(2, "0")}`;
}

/**
 * Panneau de génération du code de paiement — affiché dans l'espace salarié.
 *
 * Reproduit la structure exacte du modal de paiement de la fiche partenaire,
 * mais s'intègre comme panneau latéral sur la page d'accueil de l'espace.
 */
export default function PaymentCodePanel() {
  const { token, state, refusal, remaining, issue } = useQrToken();
  const [copied, setCopied] = useState(false);

  async function copier() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.getElementById("qr-code-raw");
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  const isActive = state === "active";
  const isExpired = state === "expired";

  return (
    <div className={cx(PANEL, "flex flex-col")}>
      <div>
        <h3 className="text-cp-fg text-[24px] font-black leading-[0.95] tracking-[-0.05em]">
          Votre QR <span className="text-cp-accent font-serif font-normal">de paiement.</span>
        </h3>
        <Micro as="p" tone="muted" className="mt-2">
          Générez un code <Slash /> À présenter au partenaire
        </Micro>
      </div>

      {/* Centré et contraint en largeur pour ne pas exploser la hauteur de la colonne */}
      <BlueprintFrame pitch="fine" className="mx-auto mt-6 w-full max-w-[220px]">
        {token ? (
          <div className="grid aspect-square h-full w-full place-items-center p-[7%]">
            <QrCode
              seed={token.id}
              motion="materialise"
              dimmed={!isActive}
            />
          </div>
        ) : (
          <Micro tone="muted" className="px-8 text-center">
            {refusal ? "QR non émis" : "En attente du QR"}
          </Micro>
        )}
      </BlueprintFrame>

      {token && (
        <div className="border-cp-border mt-4 border-t pt-4">
          <Micro as="p" tone="muted">
            Code à présenter au partenaire
          </Micro>
          <div className="mt-2 flex flex-wrap items-start gap-3">
            <code 
              id="qr-code-raw"
              className="text-cp-fg bg-cp-surface min-w-0 flex-1 px-3 py-2 font-mono text-[11px] leading-[1.5] break-all select-all"
            >
              {token.raw}
            </code>
            <Button
              onClick={copier}
              className="shrink-0"
              aria-live="polite"
            >
              {copied ? "Copié ✓" : "Copier"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Micro as="p">
          {isActive && <>Valable {mmss(remaining)} — usage unique</>}
          {isExpired && "QR expiré"}
          {state === "none" && "Code non généré"}
        </Micro>
        {!isActive && (
          <Button variant="solid" onClick={issue} className="ms-auto">
            {isExpired ? "Nouveau QR" : "Générer le QR"}
          </Button>
        )}
      </div>

      {refusal && (
        <Note tone="danger" role="alert" className="mt-4">
          {refusal}
        </Note>
      )}

      <Micro as="p" tone="muted" className="mt-4">
        Aucun débit à ce stade
        <Slash />
        Valable chez tout partenaire
      </Micro>
    </div>
  );
}
