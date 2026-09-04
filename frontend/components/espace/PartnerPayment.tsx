"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CardStage from "@/components/home/CardStage";
import CreditCard3D from "@/components/home/CreditCard3D";
import {
  balanceCents,
  cancelToken,
  formatEuros,
  issueToken,
  payWithToken,
  tokenState,
} from "@/components/data/ledger";
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
import { useLedger } from "./useLedger";
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
  const ledger = useLedger();
  const balance = balanceCents(ledger);
  const token = ledger.token;

  const [refusal, setRefusal] = useState<string | null>(null);
  const [paid, setPaid] = useState<string | null>(null);
  // The token expiring is a change on screen, so a clock has to drive it.
  const [now, setNow] = useState(() => Date.now());

  const status = tokenState(token, now);
  // Un jeton émis pour un autre partenaire ne concerne pas cette page.
  const mine = token?.partnerId === partner.id ? status : "none";

  useEffect(() => {
    if (status !== "active") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  // A token belongs to the visit that issued it: leaving must not leave a
  // valid code behind.
  useEffect(
    () => () => {
      if (tokenState(ledger.token) === "active") cancelToken();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function generate() {
    setPaid(null);
    const result = issueToken(partner.amountCents, partner.id);
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

  return (
    /* One screen, and sized to stay one: the header, the two columns and the
       payment block are each capped in vh so the whole thing fits under the
       76px bar without scrolling. 100dvh rather than 100vh so a mobile
       browser's collapsing toolbar does not cut the bottom off. */
    <section className="grid min-h-[calc(100dvh-76px)] content-center py-3">
      <div className="mb-5 flex items-center gap-4">
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
      <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-5">
        <div className="flex flex-wrap items-start gap-x-12 gap-y-4">
          <h1 className="text-[clamp(28px,3.4vw,48px)] leading-[0.88] font-black tracking-[-0.055em]">
            Payer chez
            <br />
            <em className="text-cp-accent font-serif font-normal">
              {partner.name}.
            </em>
          </h1>

          {/* La catégorie et le lieu tiennent au nom : ils se lisent avec lui,
              pas sous la photo. */}
          <div className="pt-1">
            <p className="text-cp-accent text-[12px] font-black tracking-[0.16em] uppercase">
              {partnerCategoryLabel(partner.categoryId)}
            </p>
            <address className="text-cp-fg mt-3 text-[19px] leading-[1.55] not-italic">
              {partner.address}
              <br />
              <span className="text-cp-muted">
                {partner.postcode} {partner.city}
              </span>
            </address>
          </div>
        </div>

        {/* Statut administratif porté par les données : affiché seulement pour
            les partenaires conventionnés, et à hauteur de titre parce que c'est
            ce que le porteur doit voir avant de payer. */}
        {partner.official && (
          <p className="border-cp-official text-cp-official w-[17rem] shrink-0 border-2 px-6 py-5 text-[15px] leading-[1.3] font-black tracking-[0.08em] uppercase">
            Partenaire Officiel du Ministère
          </p>
        )}
      </div>

      <div className="mt-5 grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
        {/* Gauche : le partenaire, puis la carte sous son adresse. */}
        <div>
          <PartnerPhoto
            partner={partner}
            withName={false}
            className="aspect-[9/4] max-h-[32vh] min-h-[140px] w-full"
          />

          <CardStage className="mt-5 w-full max-w-[min(100%,70vh)]">
            <CreditCard3D balanceCents={balance} />
          </CardStage>
        </div>

        {/* Droite : l'emplacement du QR, et rien d'autre. Le bouton attend au
            centre ; le code se matérialise par-dessus, à la place qu'il occupe
            déjà, de sorte que rien ne bouge autour de lui. */}
        <div className="flex flex-col lg:items-end">
          <p className={SIMULATION_NOTICE}>
            Simulation — ce QR ne débite rien de réel
          </p>

          <div className="border-cp-border bg-cp-page relative mt-4 grid aspect-square w-full max-w-[min(100%,62vh)] place-items-center overflow-hidden rounded-2xl border bg-[linear-gradient(to_right,rgba(27,58,107,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(27,58,107,0.10)_1px,transparent_1px)] bg-[length:18px_18px] dark:bg-[linear-gradient(to_right,rgba(234,240,251,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(234,240,251,0.12)_1px,transparent_1px)]">
            <button type="button" onClick={generate} className={BTN_SOLID}>
              {mine === "none" ? "Générer le QR" : "Nouveau QR"}
            </button>

            {mine !== "none" && (
              <div className="bg-cp-page absolute inset-0 grid place-items-center p-[5%]">
                <div className="aspect-square h-full max-h-full w-auto max-w-full">
                  <TokenQr tokenId={token!.id} dimmed={mine !== "active"} />
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className={`text-cp-fg ${MICRO}`}>
              {mine === "none" && "En attente du QR"}
              {mine === "active" && (
                <>Valable {mmss(token!.expiresAt - now)} — usage unique</>
              )}
              {mine === "used" && "QR déjà utilisé"}
              {mine === "expired" && "QR expiré"}
            </p>
            {mine === "active" && (
              <button
                type="button"
                onClick={pay}
                className={`${BTN_OUTLINE} ms-auto`}
              >
                Simuler le scan
              </button>
            )}
          </div>

          {/* Le refus n'a plus de bloc permanent : il apparaît quand le registre
              refuse, ce que la règle demande — un débit supérieur au solde est
              refusé et dit pourquoi. */}
          {refusal && (
            <p role="alert" className={`${NOTE_DANGER} mt-4`}>
              {refusal}
            </p>
          )}
          {paid && (
            <div className={`${NOTE_POSITIVE} mt-4`}>
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
      </div>
    </section>
  );
}
