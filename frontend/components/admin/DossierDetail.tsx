"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount } from "@/components/account/AccountProvider";
import { formatEuros } from "@/components/data/ledger";
import {
  JOURS,
  formatPlage,
  toPlage,
  type Horaires,
} from "@/components/forms/partnerFields";
import { getDossier, instruire, type Dossier } from "./api";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Display from "@/components/ui/Display";
import EmptyState from "@/components/ui/EmptyState";
import Markdown from "@/components/ui/Markdown";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import PageMain from "@/components/ui/PageMain";
import Panel from "@/components/ui/Panel";
import Slash from "@/components/ui/Slash";
import TextArea from "@/components/ui/TextArea";

const DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

/** Le motif proposé pour une acceptation, que l'agent peut réécrire. */
const MOTIF_PAR_DEFAUT =
  "Dossier complet et recevable : conventionnement accordé.";

/**
 * Comment chaque statut s'annonce, et de quelle couleur.
 *
 * `en_attente` n'y figure pas, et c'est voulu : une pastille « En attente
 * d'instruction » sur un écran d'instruction n'apprend rien — on n'y arrive
 * que par la liste des dossiers en attente, et le bloc « Décision » en bas de
 * page dit déjà ce qu'il reste à faire. Un dossier sans pastille est un
 * dossier sur lequel personne ne s'est encore prononcé.
 */
const STATUTS: Record<
  string,
  { label: string; tone: "official" | "plain" | "muted" }
> = {
  validé: { label: "Partenaire Officiel", tone: "official" },
  refusé: { label: "Conventionnement refusé", tone: "muted" },
  suspendu: { label: "Suspendu", tone: "muted" },
};

/** Une ligne de la fiche : l'intitulé en micro-typo, la valeur en dessous. */
function Champ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-cp-border border-t pt-3">
      <Micro as="dt" tone="muted">
        {label}
      </Micro>
      <dd className="text-cp-fg mt-1.5 text-[15px] leading-[1.5]">
        {children || <span className="text-cp-muted">—</span>}
      </dd>
    </div>
  );
}

/**
 * L'écran d'un dossier : tout ce que le serveur en sait, et la décision.
 *
 * C'est ici qu'on tranche, et non dans la liste — la liste en portait les
 * boutons, ce qui obligeait à décider sans avoir lu autre chose qu'un nom et
 * une adresse. Un conventionnement se refuse ou s'accorde sur des pièces : le
 * SIREN, l'objet social, le représentant, la présentation rédigée, les horaires
 * déclarés. Ils sont tous là.
 *
 * Une page à part entière, pas un écran de la page qui défile : un dossier se
 * lit de haut en bas d'une traite. Même gabarit que les conditions
 * d'utilisation, pour la même raison.
 *
 * Le garde n'est qu'un confort d'affichage — `@admin_required` côté serveur
 * est ce qui protège réellement `/api/admin/*`.
 */
export default function DossierDetail({ slug }: { slug: string }) {
  const { profile, ready } = useAccount();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState<"approuver" | "refuser" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const admin = ready && profile?.role === "admin";

  const charger = useCallback(() => {
    if (!admin) return;
    setState("loading");
    getDossier(slug)
      .then((entree) => {
        setDossier(entree);
        setState("ready");
      })
      .catch((cause) => {
        setErreurChargement(
          cause instanceof Error ? cause.message : "Dossier introuvable.",
        );
        setState("error");
      });
  }, [slug, admin]);

  useEffect(charger, [charger]);

  async function decider(geste: "approuver" | "refuser") {
    const propre = motif.trim();
    /* Un refus se motive, toujours : pas de repli par défaut ici, à la
       différence d'une acceptation. Un établissement écarté par « Dossier
       refusé. » n'apprend rien de la décision qui le concerne. */
    if (geste === "refuser" && !propre) {
      setErreur(
        "Écrire le motif du refus est obligatoire : c’est ce que l’établissement lira.",
      );
      return;
    }

    setBusy(geste);
    setErreur(null);
    setFait(null);
    try {
      const message = await instruire(slug, geste, propre || MOTIF_PAR_DEFAUT);
      setFait(message);
      setMotif("");
      /* Le dossier est relu plutôt que rafistolé de mémoire : son statut a
         changé, et son historique porte une ligne de plus. */
      charger();
    } catch (cause) {
      setErreur(
        cause instanceof Error
          ? cause.message
          : "La décision n’a pas pu être enregistrée.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (!ready) {
    return <EmptyState variant="page">Chargement…</EmptyState>;
  }

  if (!profile || profile.role !== "admin") {
    return (
      <PageMain pad="y">
        <Note
          as="div"
          tone="danger"
          role="alert"
          className="mx-auto max-w-[680px]"
        >
          <strong className="font-black">Accès refusé.</strong> Cet écran est
          réservé aux comptes de l’administration.{" "}
          <Link href="/" className="font-black underline underline-offset-4">
            Retour à l’accueil
          </Link>
        </Note>
      </PageMain>
    );
  }

  if (state === "loading") {
    return <EmptyState variant="page">Chargement du dossier…</EmptyState>;
  }

  if (state === "error" || !dossier) {
    return (
      <PageMain pad="y">
        <div className="mx-auto max-w-[680px]">
          <Note tone="danger" role="alert" as="div">
            <strong className="font-black">Dossier introuvable.</strong>{" "}
            {erreurChargement}
          </Note>
          <Micro as="p" className="mt-6">
            <Link href="/" className="text-cp-fg underline underline-offset-4">
              Retour aux demandes
            </Link>
          </Micro>
        </div>
      </PageMain>
    );
  }

  /* Absent pour un dossier en attente : pas de pastille du tout, plutôt
     qu'une pastille qui répète le titre de l'écran d'où l'on vient. */
  const statut = STATUTS[dossier.statut] ?? null;
  /* Les horaires arrivent en JSON libre : `toPlage` accepte aussi bien la
     paire { ouvre, ferme } que l'ancien texte libre d'une fiche jamais
     remise à jour. */
  const horaires = dossier.horaires as Horaires;
  const aDesHoraires = JOURS.some(
    (jour) => formatPlage(toPlage(horaires?.[jour])) !== "Fermé",
  );
  /* Le dossier est-il en état d'être instruit ? On peut toujours refuser un
     conventionné ou accepter un refusé — c'est le sens même du réexamen — mais
     répéter le geste déjà en place n'a pas d'objet, et le serveur répond 409. */
  const dejaValide = dossier.statut === "validé";
  const dejaRefuse = dossier.statut === "refusé";

  return (
    <PageMain pad="y">
      <article className="mx-auto max-w-[860px]">
        <Breadcrumb
          trail={[{ label: "Administration", href: "/" }, { label: "Dossier" }]}
        />

        {/* `br` par défaut, donc la raison sociale passe à la ligne sous
            « Dossier » : accolées, les deux se lisaient comme une seule
            expression, et un nom long poussait la pastille hors de la ligne.
            La pastille se pose donc au-dessus du titre, pas à côté. */}
        {statut && (
          <Chip tone={statut.tone} className="mt-5 inline-block">
            {statut.label}
          </Chip>
        )}
        <Display level={1} accent={`${dossier.nom}.`} className="mt-4">
          Dossier
        </Display>

        {/* La photographie de la fiche : une pièce du dossier comme une autre,
            et c'est ce que verront les salariés si le dossier passe.

            `PartnerPhoto` n'est pas réutilisé ici : il attend un `Partner` du
            catalogue et pose le nom par-dessus l'image, alors que le nom est
            déjà le titre de cette page. Une image nue, sans texte dessus.
            `unoptimized` parce que les visuels du réseau sont des SVG, que
            l'optimiseur refuse. */}
        {dossier.photo && (
          <div className="border-cp-border relative mt-8 aspect-[16/6] overflow-hidden border">
            <Image
              src={dossier.photo}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 860px) 860px, 100vw"
              className="object-cover"
            />
          </div>
        )}

        <section className="mt-10" aria-labelledby="identite">
          <Micro as="h2" id="identite" tone="accent">
            Identité de l’établissement
          </Micro>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Champ label="Raison sociale">{dossier.nom}</Champ>
            <Champ label="SIREN">{dossier.siren}</Champ>
            <Champ label="Catégorie">{dossier.secteur}</Champ>
            <Champ label="Objet social">{dossier.objetSocial}</Champ>
            <Champ label="Représentant">{dossier.representant}</Champ>
            <Champ label="Contact">
              <a
                href={`mailto:${dossier.email}`}
                className="underline underline-offset-4"
              >
                {dossier.email}
              </a>
            </Champ>
            <Champ label="Adresse">
              {dossier.adresse}
              <br />
              {dossier.codePostal} {dossier.ville}
            </Champ>
            <Champ label="Tarif proposé">
              {dossier.amountCents > 0 ? formatEuros(dossier.amountCents) : ""}
            </Champ>
            <Champ label="Site web">
              {dossier.siteWeb && (
                <a
                  href={
                    dossier.siteWeb.startsWith("http")
                      ? dossier.siteWeb
                      : `https://${dossier.siteWeb}`
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-4"
                >
                  {dossier.siteWeb}
                </a>
              )}
            </Champ>
            <Champ label="Nature des données">
              {dossier.donneesReelles
                ? "Fiche renseignée"
                : "Fiche de démonstration"}
            </Champ>
          </dl>
        </section>

        {aDesHoraires && (
          <section className="mt-10" aria-labelledby="horaires">
            <Micro as="h2" id="horaires" tone="accent">
              Horaires déclarés
            </Micro>
            <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {JOURS.map((jour) => (
                <div
                  key={jour}
                  className="border-cp-border flex items-baseline justify-between gap-4 border-b py-2"
                >
                  <Micro as="dt" tone="muted" className="capitalize">
                    {jour}
                  </Micro>
                  <dd className="text-cp-fg text-[14px] tabular-nums">
                    {formatPlage(toPlage(horaires?.[jour]))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {(dossier.presentationTitre || dossier.presentationTexte) && (
          <section className="mt-10" aria-labelledby="presentation">
            <Micro as="h2" id="presentation" tone="accent">
              Présentation rédigée par l’établissement
            </Micro>
            {dossier.presentationTitre && (
              <h3 className="text-cp-fg mt-3 text-[22px] leading-[1.15] font-black tracking-[-0.03em]">
                {dossier.presentationTitre}
              </h3>
            )}
            {dossier.presentationTexte && (
              <Panel className="mt-4">
                <Markdown>{dossier.presentationTexte}</Markdown>
              </Panel>
            )}
          </section>
        )}

        {/* L'historique complet, du plus ancien au plus récent : c'est la
            mémoire de l'instruction, et rien n'y est effacé. */}
        {dossier.decisions.length > 0 && (
          <section className="mt-10" aria-labelledby="historique">
            <Micro as="h2" id="historique" tone="accent">
              Historique de l’instruction
            </Micro>
            <ol className="mt-4">
              {dossier.decisions.map((decision, rang) => (
                <li
                  key={`${decision.at}-${rang}`}
                  className="border-cp-border border-t py-4"
                >
                  <Micro as="p" tone="muted">
                    {decision.sens}
                    <Slash />
                    {decision.at ? DATE.format(new Date(decision.at)) : "—"}
                  </Micro>
                  <p className="text-cp-fg mt-2 text-[15px] leading-[1.55]">
                    {decision.motif}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section
          className="border-t-cp-fg mt-12 border-t-2 pt-8"
          aria-labelledby="decision"
        >
          <Micro as="h2" id="decision" tone="accent">
            Décision
          </Micro>
          <p className="text-cp-muted mt-3 max-w-[62ch] text-[15px] leading-[1.55]">
            Le motif est enregistré avec la décision et reste dans l’historique.
            Celui d’un refus n’est lu que par l’établissement concerné&nbsp;: il
            ne paraît jamais au catalogue.
          </p>

          <TextArea
            id="motif"
            label="Motif de la décision"
            value={motif}
            onChange={setMotif}
            rows={4}
            className="mt-6"
            hint="Obligatoire pour un refus. À défaut, une acceptation prend un motif générique."
          />

          {erreur && (
            <Note tone="danger" role="alert" className="mt-5">
              {erreur}
            </Note>
          )}

          {fait && (
            <Note tone="positive" role="status" className="mt-5">
              {fait}
            </Note>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button
              variant="solid"
              onClick={() => decider("approuver")}
              disabled={busy !== null || dejaValide}
            >
              {busy === "approuver" ? "Envoi…" : "Conventionner"}
            </Button>
            <Button
              variant="danger"
              onClick={() => decider("refuser")}
              disabled={busy !== null || dejaRefuse}
            >
              {busy === "refuser" ? "Envoi…" : "Refuser"}
            </Button>
            <Link
              href="/"
              className="text-cp-fg text-[15px] underline underline-offset-4"
            >
              Retour aux demandes
            </Link>
          </div>

          {(dejaValide || dejaRefuse) && (
            <Micro as="p" tone="muted" className="mt-4">
              {dejaValide
                ? "Ce dossier est déjà conventionné : seul un refus le changerait."
                : "Ce dossier est déjà refusé : seul un conventionnement le changerait."}
            </Micro>
          )}
        </section>
      </article>
    </PageMain>
  );
}
