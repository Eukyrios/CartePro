"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatEuros } from "@/components/data/ledger";
import BlueprintFrame from "@/components/ui/BlueprintFrame";
import Button from "@/components/ui/Button";
import Display from "@/components/ui/Display";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import Screen from "@/components/ui/Screen";
import SimulationNotice from "@/components/ui/SimulationNotice";
import Slash from "@/components/ui/Slash";
import TextField from "@/components/ui/TextField";
import { validateEncaissement } from "./api";
import type { EncaissementOutcome } from "./api";

/** Des centimes vers ce qui s'écrit dans un champ : « 25,00 ». */
function enEuros(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

const DATE = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

/**
 * L'écran où le partenaire encaisse le code présenté par un salarié.
 *
 * Le QR appartient au salarié : le partenaire est du côté réception, et n'a
 * donc aucun bouton pour émettre un code. Il en lit un, le serveur tranche.
 *
 * Viser à gauche, le code à droite, et les deux à l'écran en même temps : ce
 * n'étaient pas deux modes entre lesquels choisir, mais un geste et son
 * résultat. Un scan **remplit le champ**, exactement comme une frappe — c'est
 * le même champ, la même vérification, le même bouton ensuite. Le jour où une
 * vraie caméra lira le QR, elle écrira au même endroit et rien d'autre ne
 * bougera.
 *
 * La caméra n'est pas branchée dans ce démonstrateur et l'écran le dit : le
 * scan simulé relit ce que le salarié vient de copier depuis sa propre fenêtre
 * de paiement. C'est ce qu'une caméra aurait lu sur son écran.
 *
 * Aucun bouton d'annulation : l'encaissement est irréversible de ce côté. Et
 * rien ici ne réécrit les refus du serveur — code expiré, solde insuffisant,
 * partenaire non autorisé s'affichent dans les mots de la règle qui les a
 * produits.
 */
export default function EncaissementSection({
  partnerId,
  defaultAmountCents,
  onEncaisse,
}: {
  /**
   * Le slug du partenaire connecté, tel que le catalogue l'expose. `null` tant
   * que sa fiche n'a pas été trouvée : sans elle, il n'y a ni identifiant à
   * envoyer ni tarif à proposer.
   */
  partnerId: string | null;
  /** Le tarif inscrit dans sa fiche : un point de départ, pas une contrainte. */
  defaultAmountCents: number;
  /**
   * Appelé quand une recette vient d'être écrite, pour que l'écran des
   * recettes se rafraîchisse : un tableau de bord qui ignore l'encaissement
   * fait juste au-dessus se lit comme une erreur de comptage.
   */
  onEncaisse?: () => void;
}) {
  const [code, setCode] = useState("");
  const [euros, setEuros] = useState(() => enEuros(defaultAmountCents));
  /* Vrai dès que le partenaire a touché au montant : le tarif de sa fiche est
     une proposition, pas une valeur qui revient l'écraser. */
  const saisi = useRef(false);
  const [scan, setScan] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<EncaissementOutcome | null>(null);
  const [at, setAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  /* La fiche arrive après le premier rendu — elle vient du catalogue — donc le
     tarif proposé arrive après lui aussi. Sans cette reprise, le champ restait
     à 0,00 € et le bouton « Encaisser » à jamais désactivé. */
  useEffect(() => {
    if (!saisi.current) setEuros(enEuros(defaultAmountCents));
  }, [defaultAmountCents]);

  const amountCents = Math.round(Number(euros.replace(",", ".")) * 100);
  const amountValid = Number.isFinite(amountCents) && amountCents > 0;
  const ready =
    Boolean(partnerId) && code.trim().length > 0 && amountValid && !busy;

  /**
   * Le scan : ce que la caméra aurait lu sur l'écran du salarié, c'est-à-dire
   * le code qu'il vient de copier. Le presse-papiers est refusable — par le
   * navigateur ou par la personne — donc l'échec se dit, et la frappe reste
   * toujours possible juste à côté.
   */
  async function simulerUnScan() {
    setScan(null);
    try {
      const lu = (await navigator.clipboard.readText()).trim();
      if (!lu) {
        setScan("Rien à lire : le salarié doit d'abord copier son code.");
        return;
      }
      setCode(lu);
      setOutcome(null);
      setScan("Code lu.");
    } catch {
      setScan("Lecture impossible : collez le code dans le champ, à droite.");
    }
  }

  async function encaisser() {
    if (!ready || !partnerId) return;
    setBusy(true);
    setOutcome(null);
    const result = await validateEncaissement({ code, amountCents, partnerId });
    setAt(new Date());
    setOutcome(result);
    setBusy(false);
    // Le code est consommé : le laisser dans le champ inviterait à le rejouer.
    if (result.kind !== "refus") {
      setCode("");
      setScan(null);
    }
    if (result.kind === "encaisse") onEncaisse?.();
  }

  return (
    <Screen id="encaissement" gap={9}>
      <div>
        <Display level={1} accent="un paiement.">
          Encaisser
        </Display>
        <SimulationNotice className="mt-5 block">
          Simulation — aucun encaissement réel
        </SimulationNotice>
      </div>

      {!partnerId && (
        <Note tone="danger" role="alert">
          <strong className="font-black">
            Fiche introuvable au catalogue.
          </strong>{" "}
          Votre établissement n&apos;y figure pas encore, et l&apos;encaissement
          a besoin de son identifiant. Vérifiez la raison sociale dans vos{" "}
          <Link
            href="/parametres"
            className="font-black underline underline-offset-4"
          >
            paramètres
          </Link>{" "}
          : elle doit être exactement celle du réseau.
        </Note>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,42%)_minmax(0,1fr)] lg:gap-14">
        {/* À gauche : viser. */}
        <div>
          <BlueprintFrame pitch="fine" className="max-w-[min(100%,42vh)]">
            {/* Le cadre de visée : quatre équerres, rien au milieu. Chacune est
                un coin avec deux bords — un `clip-path` sur un carré donnait
                quatre traits détachés au lieu d'équerres. */}
            <div aria-hidden="true" className="relative size-[62%]">
              {[
                "top-0 left-0 border-t-2 border-l-2",
                "top-0 right-0 border-t-2 border-r-2",
                "bottom-0 left-0 border-b-2 border-l-2",
                "bottom-0 right-0 border-b-2 border-r-2",
              ].map((corner) => (
                <span
                  key={corner}
                  className={`border-cp-fg absolute size-[22%] opacity-70 ${corner}`}
                />
              ))}
            </div>
          </BlueprintFrame>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={simulerUnScan}>Simuler un scan</Button>
            <Micro as="p" tone="muted" aria-live="polite">
              {scan ?? "Caméra non branchée"}
            </Micro>
          </div>
        </div>

        {/* À droite : le code, le montant, et ce que le serveur en dit. */}
        <div className="grid gap-5">
          <TextField
            id="encaissement-code"
            label="Code présenté par le salarié"
            value={code}
            onChange={(value) => {
              setCode(value);
              setScan(null);
            }}
            placeholder="Scannez, ou collez le code affiché sous son QR"
            autoComplete="off"
            spellCheck={false}
            hint="Un scan remplit ce champ ; la frappe fait la même chose."
          />
          <TextField
            id="encaissement-montant"
            label="Montant à encaisser"
            value={euros}
            onChange={(value) => {
              saisi.current = true;
              setEuros(value);
            }}
            inputMode="decimal"
            error={
              amountValid
                ? undefined
                : "Montant invalide : un nombre supérieur à zéro."
            }
            hint="Le tarif de votre fiche, modifiable pour cette opération."
          />

          <div>
            <Button variant="solid" onClick={encaisser} disabled={!ready}>
              {busy ? "Encaissement…" : "Encaisser"}
            </Button>
          </div>

          <div aria-live="polite">
            {outcome === null ? (
              <Note as="div">
                <strong className="font-black">
                  En attente d&apos;un code.
                </strong>{" "}
                Le résultat de la lecture s&apos;affichera ici : encaissé, déjà
                encaissé, ou refusé.
              </Note>
            ) : outcome.kind === "encaisse" ? (
              <Note tone="positive" as="div" role="status">
                <strong className="font-black">Encaissement validé.</strong>
                <p className="mt-2 text-[15px] leading-[1.5]">
                  {formatEuros(amountCents)} encaissés
                  {at && <> le {DATE.format(at)}</>}.
                </p>
                <Micro as="p" tone="muted" className="mt-3">
                  Transaction n° {outcome.transactionId}
                  <Slash />
                  nouveau solde du salarié{" "}
                  {formatEuros(outcome.soldeSalarieCents)}
                </Micro>
              </Note>
            ) : outcome.kind === "deja-encaisse" ? (
              <Note tone="danger" as="div" role="alert">
                <strong className="font-black">
                  Ce code a déjà été encaissé.
                </strong>
                <p className="mt-2 text-[15px] leading-[1.5]">
                  Il correspond à la transaction n° {outcome.transactionId},
                  déjà enregistrée. Rien n&apos;a été débité une seconde fois.
                </p>
              </Note>
            ) : (
              <Note tone="danger" as="div" role="alert">
                <strong className="font-black">Encaissement refusé.</strong>
                <p className="mt-2 text-[15px] leading-[1.5]">
                  {outcome.reason}
                </p>
                <Micro as="p" tone="muted" className="mt-3">
                  Demandez au salarié un nouveau code, puis recommencez.
                </Micro>
              </Note>
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}
