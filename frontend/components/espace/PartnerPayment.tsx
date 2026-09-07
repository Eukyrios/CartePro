"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CardStage, { CardTag } from "@/components/card/CardStage";
import CreditCard3D from "@/components/card/CreditCard3D";
import { formatEuros } from "@/components/data/ledger";
import { useAccount } from "@/components/account/AccountProvider";
import SignInButton from "@/components/auth/SignInButton";
import { useBalance } from "@/components/account/useBalance";
import { categoryLabel, useCategories } from "@/components/data/useCategories";
import PartnerPhoto from "@/components/ui/PartnerPhoto";
import BlueprintFrame from "@/components/ui/BlueprintFrame";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Display from "@/components/ui/Display";
import HatchedPanel from "@/components/ui/HatchedPanel";
import IconButton from "@/components/ui/IconButton";
import Micro from "@/components/ui/Micro";
import Modal from "@/components/ui/Modal";
import Note from "@/components/ui/Note";
import QrCode from "@/components/ui/QrCode";
import Screen from "@/components/ui/Screen";
import SimulationNotice from "@/components/ui/SimulationNotice";
import Slash from "@/components/ui/Slash";
import { useQrToken } from "./useQrToken";
import type { Partner } from "@/components/data/partners";

function mmss(msLeft: number) {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60,
  ).padStart(2, "0")}`;
}

/**
 * The payment screen for one partner: what the partner is asking, and a
 * single-use QR for it.
 *
 * The amount is the partner's, not the employé's — there is no field to type
 * one into, because a merchant sets the price. It comes from the partner data
 * for now; in production the terminal sends it.
 *
 * The card is the trigger: it presents, and presenting it is what raises the
 * code. So the card holds the whole right-hand side, and the QR lives in a
 * modal over the middle of the screen rather than in a panel that has to be
 * kept square beside it. Nothing in the section moves when it opens — a modal
 * is out of flow, which is the point.
 *
 * Trois publics, un seul écran : le salarié paie, le partenaire et le visiteur
 * voient la même carte barrée (voir `mode` plus bas). La fiche est prérendue et
 * publique — c'est ce qui permet de la partager, et ce qui oblige la carte à
 * dire elle-même à qui elle appartient.
 *
 * Le jeton est émis par le serveur (voir useQrToken) et **rien n'est débité à
 * ce stade** : la validation, /api/transactions/valider, n'est pas appelée ici.
 * Elle l'était (voir l'historique git de ce fichier) et le sera de nouveau
 * quand l'encaissement sera au programme ; en attendant, cet écran émet,
 * affiche, laisse expirer et réémet, sans toucher au solde.
 */
export default function PartnerPayment({ partner }: { partner: Partner }) {
  const router = useRouter();
  const { profile, ready } = useAccount();
  const { categories } = useCategories();
  const balance = useBalance();

  /* Qui regarde cette fiche, et ce qu'il a le droit d'en faire.
     — "pay"     : un salarié connecté, le seul à pouvoir émettre un QR ;
     — "partner" : un partenaire, qui regarde un confrère du réseau ;
     — "visitor" : personne — la page est prérendue et publique, on y arrive
                   depuis le coup de cœur de l'accueil sans être connecté.
     Dans les deux derniers cas la carte s'affiche barrée et le QR reste hors
     d'atteinte : c'est la même page, avec une porte fermée, plutôt que deux
     autres pages à maintenir en parallèle.

     `!ready` compte comme visiteur, et pas l'inverse : c'est exactement ce que
     le serveur a rendu, la session vivant dans localStorage. Rendre l'écran
     payable en attendant montrerait une carte utilisable à quelqu'un qui ne
     l'est peut-être pas. */
  const mode =
    !ready || !profile
      ? "visitor"
      : profile.audience === "partner"
        ? "partner"
        : "pay";
  const canPay = mode === "pay";
  const [open, setOpen] = useState(false);
  const { token, state, refusal, remaining, issue } = useQrToken();

  /* Présenter la carte, c'est demander le code : le clic ouvre la boîte et
     n'émet que s'il n'y a rien de valable à montrer. Un jeton encore vivant est
     donc réaffiché tel quel, avec son compte à rebours — rouvrir la boîte ne
     gaspille pas un jeton. */
  async function present() {
    setOpen(true);
    if (state !== "active") await issue();
  }

  return (
    /* Un écran, et calibré pour le rester. `density="tight"` parce que sous la
       barre de 76px, 4rem de marge verticale sortent la carte de l'écran.

       `id` pour le rail, mais pas de point d'accroche : quand le partenaire
       a écrit une présentation, la fiche compte deux écrans et `PartnerFiche` y
       met le rail. S'accrocher au bord de cette section ferait sortir la barre
       haute de l'écran, alors qu'elle appartient à ce premier écran. */
    <Screen
      id="paiement"
      height="below-bar"
      snap={false}
      rule={false}
      density="tight"
    >
      <div className="mb-5 flex items-center gap-4">
        {/* Back to wherever you came from — the catalogue, or the Minister's
            selection. A fresh tab has no history to go back through, so that
            case lands on the space instead of doing nothing. */}
        <IconButton
          label="Retour à la page précédente"
          /* Un onglet neuf n'a pas d'historique à remonter : on retombe alors
             sur l'espace, ou sur l'accueil quand personne n'est connecté —
             l'espace renverrait un visiteur vers une invitation à se
             connecter, ce qui n'est pas un retour. */
          onClick={() =>
            window.history.length > 1
              ? router.back()
              : router.push(mode === "visitor" ? "/" : "/espace")
          }
        >
          ←
        </IconButton>

        {/* Le fil d'Ariane suit le chemin qu'on a réellement pu prendre : sans
            compte, ni « Mon espace » ni « Le réseau » ne s'ouvrent. */}
        <Breadcrumb
          trail={
            mode === "visitor"
              ? [
                  { label: "Accueil", href: "/" },
                  { label: "Coup de cœur", href: "/#coup-de-coeur" },
                  { label: "Fiche" },
                ]
              : [
                  { label: "Mon espace", href: "/espace" },
                  { label: "Le réseau", href: "/espace#reseau" },
                  { label: canPay ? "Payer" : "Fiche" },
                ]
          }
        />
      </div>

      {/* Le titre tient les deux colonnes ; le lieu est redescendu sous la
          photographie, où il se lit avec elle. */}
      <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-5">
        <Display level={1} accent={`${partner.name}.`}>
          {canPay ? "Payer chez" : "La fiche de"}
        </Display>

        {/* Statut administratif porté par les données : affiché seulement pour
            les partenaires conventionnés, et en haut de colonne parce que c'est
            ce que le porteur doit voir avant de payer. */}
        {/* Deux pastilles, deux faits distincts : le conventionnement est une
            décision du Ministère, la provenance des données est un constat sur
            le démonstrateur. Les confondre reviendrait à laisser croire qu'une
            fiche de remplissage n'est pas conventionnée, ou l'inverse. */}
        <div className="mt-2 flex flex-wrap items-start gap-2 self-start">
          {partner.official && (
            <Chip tone="official" as="p">
              Partenaire Officiel du Ministère
            </Chip>
          )}
          <Chip as="p" tone={partner.real ? "plain" : "muted"}>
            {partner.real ? "Fiche renseignée" : "Fiche de démonstration"}
          </Chip>
        </div>
      </div>

      <div className="mt-5 grid items-stretch gap-8 lg:grid-cols-2 lg:gap-14">
        {/* Gauche : la photographie, ce qu'elle montre, et la devise. */}
        <div className="flex flex-col">
          <PartnerPhoto
            partner={partner}
            withName={false}
            className="aspect-[3/2] max-h-[40vh] min-h-[180px] w-full shrink-0"
          />

          <Micro tone="accent" as="p" className="mt-5">
            {categoryLabel(partner.categoryId, categories)}
          </Micro>
          <address className="text-cp-fg mt-3 text-[19px] leading-[1.55] not-italic">
            {partner.address}
            <br />
            <span className="text-cp-muted">
              {partner.postcode} {partner.city}
            </span>
          </address>
        </div>

        {/* Droite : la carte, et rien d'autre. Le panneau prend toute la
            colonne, la carte garde sa taille au milieu. */}
        <div className="flex flex-col">
          <SimulationNotice>
            {mode === "pay"
              ? "Simulation — aucun débit réel à ce stade"
              : mode === "partner"
                ? "Fiche consultée depuis un compte partenaire"
                : "Fiche publique — la carte demande une connexion"}
          </SimulationNotice>

          {/* La carte est le déclencheur : on la présente, le code apparaît.
              Un vrai bouton, donc le clavier l'atteint et l'annonce. */}
          {canPay ? (
            <>
              <button
                type="button"
                onClick={present}
                aria-haspopup="dialog"
                className="focus-visible:outline-cp-accent mt-4 flex-1 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                <CardStage
                  className="h-full w-full"
                  insetClassName="grid h-full place-items-center p-[6%]"
                  tagClassName="hidden"
                >
                  {/* Taille inchangée : la carte ne grandit pas avec le panneau,
                      elle se centre dedans. Le repère se place par rapport à
                      elle, pas au panneau, sans quoi il flotterait dans le
                      vide. */}
                  <div className="relative w-[min(100%,430px)]">
                    <CreditCard3D balanceCents={balance} />
                    <CardTag className="top-[-13%] right-[-4%] rotate-[4deg]" />
                  </div>
                </CardStage>
              </button>

              <Micro as="p" tone="muted" className="mt-3">
                Cliquez la carte
                <Slash />
                {state === "active"
                  ? `QR valable ${mmss(remaining)}`
                  : "le QR s'affiche par-dessus"}
              </Micro>
            </>
          ) : (
            <>
              {/* Pas de `flex-1` ici, contrairement à la version cliquable : le
                  panneau du salarié remplit la colonne parce qu'il est le
                  bouton, celui-ci n'a qu'à tenir la carte. L'étirer produisait
                  une grande zone hachurée vide sous elle, et une page qui
                  débordait de l'écran. */}
              <HatchedPanel
                className="mt-4"
                reason={
                  mode === "partner" ? (
                    <>
                      Cette carte appartient aux salariés. En tant que
                      partenaire, vous{" "}
                      <strong className="font-black">encaissez</strong> leurs
                      paiements — vous n&apos;en émettez pas.
                    </>
                  ) : (
                    <>
                      Cette carte est celle des salariés. Connectez-vous avec un
                      compte salarié pour{" "}
                      <strong className="font-black">payer</strong> chez ce
                      partenaire.
                    </>
                  )
                }
                action={
                  mode === "partner" ? (
                    <Button href="/espace#encaissement" arrow>
                      Encaisser un paiement
                    </Button>
                  ) : (
                    <SignInButton arrow>Se connecter</SignInButton>
                  )
                }
              >
                <CardStage
                  className="w-full"
                  insetClassName="grid place-items-center p-[6%]"
                  tagClassName="hidden"
                >
                  <div className="relative w-[min(100%,430px)]">
                    <CreditCard3D balanceCents={balance} />
                    <CardTag className="top-[-13%] right-[-4%] rotate-[4deg]" />
                  </div>
                </CardStage>
              </HatchedPanel>

              <Micro as="p" tone="muted" className="mt-3">
                {mode === "partner" ? "Fiche partenaire" : "Fiche publique"}
                <Slash />
                {mode === "partner"
                  ? "aucun paiement depuis ce compte"
                  : "le paiement demande un compte salarié"}
              </Micro>
            </>
          )}
        </div>
      </div>

      {/* Hors flux, au centre de l'écran : la boîte du code. */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Votre QR"
        accent="de paiement."
        meta={
          <>
            {partner.name}
            <Slash />
            {formatEuros(partner.amountCents)}
          </>
        }
      >
        {/* Le cadre garde sa place quoi qu'il arrive : le code s'y matérialise
            ou le refus s'y affiche, sans que la boîte change de taille. */}
        <BlueprintFrame pitch="fine" className="mt-6">
          {token ? (
            <div className="grid aspect-square h-full w-full place-items-center p-[7%]">
              <QrCode
                seed={token.id}
                motion="materialise"
                dimmed={state !== "active"}
              />
            </div>
          ) : (
            <Micro tone="muted" className="px-8 text-center">
              {refusal ? "QR non émis" : "Émission…"}
            </Micro>
          )}
        </BlueprintFrame>

        {/* Le code en clair, sous le dessin : la caméra du partenaire n'est pas
            branchée dans ce démonstrateur, donc le code se copie et se colle
            d'un espace à l'autre. C'est aussi ce qu'une vraie caméra lirait. */}
        {token && (
          <div className="border-cp-border mt-4 border-t pt-4">
            <Micro as="p" tone="muted">
              Code à présenter au partenaire
            </Micro>
            <div className="mt-2 flex flex-wrap items-start gap-3">
              <code className="text-cp-fg bg-cp-surface min-w-0 flex-1 px-3 py-2 font-mono text-[11px] leading-[1.5] break-all">
                {token.raw}
              </code>
              <Button
                onClick={() => navigator.clipboard?.writeText(token.raw)}
                className="shrink-0"
              >
                Copier
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Micro as="p">
            {state === "active" && (
              <>Valable {mmss(remaining)} — usage unique</>
            )}
            {state === "expired" && "QR expiré"}
            {state === "none" && "En attente du QR"}
          </Micro>
          {/* Réémission une fois les cinq minutes passées : le serveur en donne
              un neuf, et rien n'est débité. */}
          {state !== "active" && (
            <Button variant="solid" onClick={issue} className="ms-auto">
              {state === "expired" ? "Nouveau QR" : "Générer le QR"}
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
          <Link
            href="/espace#historique"
            className="text-cp-fg underline underline-offset-4"
          >
            Voir l&apos;historique
          </Link>
        </Micro>
      </Modal>
    </Screen>
  );
}
