"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CardStage from "@/components/home/CardStage";
import CreditCard3D from "@/components/home/CreditCard3D";
import { formatEuros } from "@/components/data/ledger";
import { api } from "@/lib/api";
import { useAccount } from "@/components/account/AccountProvider";
import { partnerCategoryLabel } from "@/components/data/partnerCategories";
import PartnerPhoto from "@/components/partners/PartnerPhoto";
import {
  BTN_OUTLINE,
  BTN_SOLID,
  MICRO,
  NOTE_DANGER,
  NOTE_POSITIVE,
  SIMULATION_NOTICE,
} from "@/components/ui/surfaces";
import TokenQr from "./TokenQr";
import type { Partner } from "@/components/data/partners";

function mmss(msLeft: number) {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60,
  ).padStart(2, "0")}`;
}

/**
 * The payment screen for one partner: the amount the partner is asking, and a
 * single-use QR for it.
 *
 * The amount is the partner's, not the employé's — there is no field to type
 * one into, because a merchant sets the price. It comes from the partner data
 * for now; in production the terminal sends it.
 *
 * Everything sits in one screen and nothing moves as the QR is issued: the
 * code's frame is always there, holding the same square, so generating swaps
 * the frame's contents rather than growing the page. The card stays at rest
 * throughout — it is the same card either way, and swapping its state under
 * the reader's eyes was noise.
 *
 * The rules are the ledger's (data/ledger). This screen only prints what the
 * ledger refuses, in the ledger's own words.
 */
export default function PartnerPayment({ partner }: { partner: Partner }) {
  const router = useRouter();
  const { profile, refreshAccount } = useAccount();
  const balance = profile?.balanceCents ?? 0;
  const [token, setToken] = useState<{ id: string; raw: string; expiresAt: number } | null>(null);

  const [refusal, setRefusal] = useState<string | null>(null);
  const [paid, setPaid] = useState<string | null>(null);
  // The token expiring is a change on screen, so a clock has to drive it.
  const [now, setNow] = useState(() => Date.now());

  const status = !token ? "none" : now >= token.expiresAt ? "expired" : "active";
  /* Judged before the press as well as inside the ledger: a button that can
     only ever be refused should say so rather than look broken when nothing
     happens. The ledger still has the last word — the balance can change
     between this render and the click. */
  const affordable = partner.amountCents <= balance;
  // A token issued for another partner is not this page's business.
  const mine = token ? status : "none";

  useEffect(() => {
    if (status !== "active") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  async function generate() {
    setPaid(null);
    try {
      const result = await api<{ raw_token_for_testing: string; expiration: string }>("/api/salaries/paiement/qr", { method: "POST" });
      setToken({ id: result.raw_token_for_testing.slice(-16), raw: result.raw_token_for_testing, expiresAt: Date.parse(result.expiration) });
      setRefusal(null);
      setNow(Date.now());
    } catch (error) {
      setRefusal(error instanceof Error ? error.message : "Impossible de générer le QR.");
    }
  }

  async function pay() {
    if (!token) return;
    try {
      await api<{ details: { nouveau_solde_salarie: number } }>("/api/transactions/valider", {
        method: "POST",
        body: JSON.stringify({ qr_token: token.raw, montant: partner.amountCents / 100, partenaire_id: partner.id }),
      });
      await refreshAccount();
      setToken(null);
      setPaid(
        `${formatEuros(partner.amountCents)} chez ${partner.name}. Solde mis à jour.`,
      );
      setRefusal(null);
    } catch (error) {
      setRefusal(error instanceof Error ? error.message : "Le paiement a échoué.");
      setPaid(null);
    }
  }

  return (
    /* One screen, and sized to stay one: the header, the two columns and the
       payment block are each capped in vh so the whole thing fits under the
       76px bar without scrolling. 100dvh rather than 100vh so a mobile
       browser's collapsing toolbar does not cut the bottom off. */
    <section className="grid min-h-[calc(100dvh-76px)] content-center py-6">
      <div className="mb-8 flex items-center gap-4">
        {/* Back to wherever you came from — the catalogue, or the Minister's
            selection. A fresh tab has no history to go back through, so that
            case lands on the space instead of doing nothing. */}
        <button
          type="button"
          aria-label="Retour à la page précédente"
          onClick={() =>
            window.history.length > 1 ? router.back() : router.push("/espace")
          }
          className="border-cp-fg text-cp-fg hover:bg-cp-fg hover:text-cp-page flex size-9 shrink-0 items-center justify-center border text-base leading-none"
        >
          <span aria-hidden="true">←</span>
        </button>

        <nav aria-label="Fil d'Ariane" className={`flex gap-2 ${MICRO}`}>
          <Link href="/espace" className="text-cp-muted hover:text-cp-fg">
            Mon espace
          </Link>
          <span className="text-cp-accent" aria-hidden="true">
            /
          </span>
          <Link
            href="/espace#reseau"
            className="text-cp-muted hover:text-cp-fg"
          >
            Le réseau
          </Link>
          <span className="text-cp-accent" aria-hidden="true">
            /
          </span>
          <span className="text-cp-fg">Payer</span>
        </nav>
      </div>

      {/* The heading spans both columns, so the photo and the card start on the
          same line below it. */}
      <h1 className="text-[clamp(26px,3.4vw,44px)] leading-[0.88] font-black tracking-[-0.06em]">
        Payer chez
        <br />
        <em className="text-cp-accent font-serif font-normal">
          {partner.name}.
        </em>
      </h1>

      <div className="mt-7 grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          {/* Tall enough to reach the rule that opens the payment block in the
              other column: that rule sits at the panel's height plus its top
              margin, which is about 36vh on a full-height window. */}
          <PartnerPhoto
            partner={partner}
            withName={false}
            className="aspect-[4/3] max-h-[36vh] min-h-[180px] w-full"
          />
          {/* Bigger than the micro-type used elsewhere: with only a category
              and three lines of address under a large photo, the column read
              as empty. */}
          <p className="text-cp-accent mt-7 text-[11px] font-black tracking-[0.16em] uppercase">
            {partnerCategoryLabel(partner.categoryId)}
          </p>
          <address className="text-cp-fg mt-5 text-[19px] leading-[1.55] not-italic">
            {partner.address}
            <br />
            <span className="text-cp-muted">
              {partner.postcode} {partner.city}
            </span>
          </address>
        </div>

        <div>
          {/* The same panel the hero presents the card on: blueprint grid and
              the tilted tag. */}
          <CardStage className="w-full">
            {/* The card is sized off the height budget: 44vh of width is about
                27vh of card, since the card is 1.6:1. */}
            <div className="mx-auto w-full max-w-[min(100%,44vh)]">
              <CreditCard3D balanceCents={balance} />
            </div>
          </CardStage>

          <div className="border-t-cp-fg mt-6 grid items-start gap-6 border-t-2 pt-5 sm:grid-cols-[minmax(0,1fr)_170px]">
            <div>
              <p className={SIMULATION_NOTICE}>
                Paiement réel enregistré en base de données
              </p>

              {/* The partner's price, stated rather than asked for. */}
              <p className={`text-cp-muted mt-4 ${MICRO}`}>Montant demandé</p>
              <p className="mt-1 text-[clamp(26px,3vw,36px)] leading-[0.9] font-black tracking-[-0.05em]">
                {formatEuros(partner.amountCents)}
              </p>
              <p className="text-cp-muted mt-2 text-[13px]">
                Votre solde : {formatEuros(balance)}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={generate}
                  disabled={!affordable}
                  className={BTN_SOLID}
                >
                  {mine === "active" ? "Nouveau QR" : "Générer le QR"}
                </button>
                {mine === "active" && (
                  <button type="button" onClick={pay} className={BTN_OUTLINE}>
                    Simuler le scan
                  </button>
                )}
              </div>

              {!affordable && (
                <p className={`${NOTE_DANGER} mt-5`}>
                  Ce partenaire demande{" "}
                  {formatEuros(partner.amountCents - balance)} de plus que votre
                  solde. Aucun QR ne peut être émis pour ce montant.
                </p>
              )}

              {/* The refusal is the point: it says why, in the ledger's words. */}
              {refusal && affordable && (
                <p role="alert" className={`${NOTE_DANGER} mt-5`}>
                  {refusal}
                </p>
              )}
              {paid && (
                <div className={`${NOTE_POSITIVE} mt-5`}>
                  <p role="status">{paid}</p>
                  <Link
                    href="/espace#historique"
                    className="mt-2 inline-block font-black underline underline-offset-4"
                  >
                    Voir dans l&apos;historique
                  </Link>
                </div>
              )}
            </div>

            {/* The QR's frame is always here, at one fixed size: an empty
                blueprint square before, the code itself after. Swapping the
                contents of a frame moves nothing below it. */}
            <div className="w-full max-w-[170px]">
              {mine === "none" ? (
                <div
                  aria-hidden="true"
                  className="border-cp-border bg-cp-page aspect-square w-full rounded-2xl border bg-[linear-gradient(to_right,rgba(27,58,107,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(27,58,107,0.10)_1px,transparent_1px)] bg-[length:14px_14px] dark:bg-[linear-gradient(to_right,rgba(234,240,251,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(234,240,251,0.12)_1px,transparent_1px)]"
                />
              ) : (
                    <TokenQr tokenId={token!.id} dimmed={mine !== "active"} />
              )}
              <p className={`text-cp-fg mt-3 min-h-[2.4em] ${MICRO}`}>
                {mine === "none" && "En attente du QR"}
                {mine === "active" && (
                  <>Valable {mmss(token!.expiresAt - now)} — usage unique</>
                )}
                {mine === "expired" && "QR expiré"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
