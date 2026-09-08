"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { useCataloguePartner } from "@/components/data/useCataloguePartner";
import TransactionsSection, {
  type TransactionRow,
} from "@/components/transactions/TransactionsSection";
import { annulerPaiement, getComptePartenaire, type Compte } from "./api";
import CompteMesures from "./CompteMesures";
import { formatEuros } from "@/components/data/ledger";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Button from "@/components/ui/Button";
import Micro from "@/components/ui/Micro";
import Modal from "@/components/ui/Modal";
import TextArea from "@/components/ui/TextArea";
import EmptyState from "@/components/ui/EmptyState";
import Note from "@/components/ui/Note";
import PageMain from "@/components/ui/PageMain";
import { api } from "@/lib/api";

/** Une ligne telle que `GET /api/admin/transactions` la rend. */
type AdminTransaction = {
  id: string;
  at: string;
  amountCents: number;
  label: string;
};

/**
 * Les encaissements d'un établissement, vus par l'administration.
 *
 * C'est **le même écran** que « Mes recettes » de l'espace partenaire —
 * `transactions/TransactionsSection` — nourri d'une autre route : le partenaire
 * lit ses recettes par son jeton, l'administration celles de n'importe quel
 * établissement par son slug. Filtres, total et pagination sont donc écrits une
 * fois pour les deux.
 *
 * Pas de colonne « Partenaire » : l'écran ne parle que de celui-là, et son nom
 * est dans le titre.
 *
 * Rien de tout cela n'apparaît sur la fiche publique d'un partenaire. Une fiche
 * est ce qu'un salarié vient lire pour savoir où dépenser ; le chiffre
 * d'affaires d'un établissement et le nom de ceux qui y ont payé ne lui
 * appartiennent pas. C'est pourquoi cet écran est une page réservée, servie par
 * une route qui porte `@admin_required`.
 *
 * Le garde ci-dessous n'est qu'un confort d'affichage — la vraie protection est
 * côté serveur, donc appeler l'API sans le rôle échoue, garde ou pas.
 */
export default function PartnerReceipts({ slug }: { slug: string }) {
  const { profile, ready } = useAccount();
  const { entry, loaded } = useCataloguePartner(slug);
  const [rows, setRows] = useState<readonly TransactionRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  /* Le compte de l'établissement, pour la bande d'en-tête : son état, ce qu'il
     a encaissé, et la mesure qu'on peut prendre. Le catalogue ne le dit pas —
     il décrit une vitrine, pas un compte. */
  const [compte, setCompte] = useState<Compte | null>(null);
  const [etatCompte, setEtatCompte] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  /* Le paiement dont on est en train de décider, et le motif qu'on écrit.
     Un seul à la fois : le dialogue est modal. */
  const [aAnnuler, setAAnnuler] = useState<TransactionRow | null>(null);
  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const admin = ready && profile?.role === "admin";

  /* Extrait de l'effet pour être rappelable : après une annulation, la liste et
     le total se relisent du serveur plutôt que d'être rafistolés de mémoire —
     l'écriture inverse crée une ligne que le client n'a pas vue. */
  const charger = useCallback(() => {
    if (!admin) return () => undefined;
    let cancelled = false;
    api<{ transactions: AdminTransaction[] }>(
      `/api/admin/transactions?partenaire=${encodeURIComponent(slug)}`,
    )
      .then((data) => {
        if (cancelled) return;
        setRows(data.transactions);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [slug, admin]);

  useEffect(charger, [charger]);

  const chargerCompte = useCallback(() => {
    if (!admin) return;
    getComptePartenaire(slug)
      .then((lu) => {
        setCompte(lu);
        setEtatCompte("ready");
      })
      .catch(() => setEtatCompte("error"));
  }, [slug, admin]);

  useEffect(chargerCompte, [chargerCompte]);

  function fermer() {
    setAAnnuler(null);
    setMotif("");
    setErreur(null);
  }

  async function annuler() {
    if (!aAnnuler) return;
    const propre = motif.trim();
    /* Le motif est exigé ici comme il l'est pour un refus de dossier : c'est
       la trace de la décision, et « annulé » sans raison n'explique rien à qui
       relira l'historique. */
    if (!propre) {
      setErreur("Le motif de l’annulation est obligatoire.");
      return;
    }
    setBusy(true);
    setErreur(null);
    try {
      const message = await annulerPaiement(aAnnuler.id, propre);
      setFait(message);
      fermer();
      charger();
    } catch (cause) {
      setErreur(
        cause instanceof Error
          ? cause.message
          : "L’annulation n’a pas pu être enregistrée.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <PageMain>
        <EmptyState variant="page">Chargement de l’écran…</EmptyState>
      </PageMain>
    );
  }

  if (!admin) {
    return (
      <PageMain pad="y">
        <Note as="div" tone="danger" role="alert">
          <strong className="font-black">Accès refusé.</strong> Les recettes
          d’un établissement sont réservées aux comptes de l’administration.{" "}
          <Link href="/" className="font-black underline underline-offset-4">
            Retour à l’accueil
          </Link>
        </Note>
      </PageMain>
    );
  }

  /* Le nom vient du catalogue, pas de la route des paiements : un établissement
     sans aucun encaissement a quand même un nom, et l'écran doit pouvoir le
     dire au-dessus d'une liste vide. */
  const nom = loaded && entry ? entry.nom : slug;

  /* `PageMain` porte la colonne : `TransactionsSection` rend un `Screen` en
     `gutter="container"`, qui hérite sa gouttière de la page. Dans les espaces
     c'est `AccountSpace` qui la donne ; ici l'écran est seul sur sa route, donc
     la colonne se pose au-dessus de lui — sinon le tableau saigne jusqu'au bord
     de la fenêtre. */
  return (
    <PageMain>
      <TransactionsSection
        id="recettes"
        title="Les recettes de"
        accent={`${nom}.`}
        br
        /* Le même en-tête que la fiche d'un partenaire : les deux écrans sont
           ouverts depuis une tuile d'une liste, et on en repart par le même
           geste — une entrée du fil d'Ariane, qui nomme sa destination. */
        eyebrow={
          <Breadcrumb
            trail={[
              { label: "Administration", href: "/espace" },
              { label: "Les comptes", href: "/espace#comptes" },
              { label: "Historique des paiements" },
            ]}
          />
        }
        /* L'état de l'établissement et la mesure qu'on peut prendre, à côté du
           titre qui le nomme. Une suspension change les deux — l'état affiché
           et ce que la liste montrera — donc les deux se relisent ensemble. */
        aside={
          <CompteMesures
            compte={compte}
            state={etatCompte}
            onMesure={() => {
              chargerCompte();
              charger();
            }}
          />
        }
        rows={rows}
        state={state}
        totalLabel="Total encaissé"
        whoLabel="Salarié"
        searchLabel="Salarié ou référence"
        searchPlaceholder="Camille, 42…"
        noun={["encaissement", "encaissements"]}
        zero="Aucun encaissement"
        caption={`Encaissements de ${nom}, du plus récent au plus ancien`}
        loadingMessage="Chargement des encaissements…"
        errorMessage="Les encaissements n’ont pas pu être chargés. Rechargez la page ; si cela persiste, le serveur ne répond pas."
        emptyMessage="Aucun encaissement pour cet établissement. Le premier code encaissé apparaîtra ici."
        noMatchMessage="Aucun encaissement ne correspond à ces filtres. Élargissez la période ou effacez-les."
        /* L'annulation n'existe que sur cet écran : le partenaire lit les mêmes
           lignes par le même composant, sans cette colonne. */
        onCancel={setAAnnuler}
      />

      {/* Le résultat de la dernière annulation, hors du dialogue : le dialogue
          se ferme en réussissant, donc un message posé dedans partirait avec
          lui. */}
      {fait && (
        <Note tone="positive" role="status" as="div" className="mt-6">
          {fait}
        </Note>
      )}

      {/* Un `<dialog>`, comme les autres recouvrements du site : Échap, le
          piège de focus et le retour du focus au déclencheur viennent de
          `showModal()`. Le montant et le salarié sont dans le sous-titre —
          annuler un paiement se confirme sur ce qu'on annule, pas sur une
          formule générale. */}
      <Modal
        open={aAnnuler !== null}
        onClose={fermer}
        size="sm"
        title="Annuler"
        accent="ce paiement."
        meta={
          aAnnuler ? (
            <>
              {formatEuros(aAnnuler.amountCents)} — {aAnnuler.label}
              {" · "}n° {aAnnuler.id}
            </>
          ) : undefined
        }
      >
        <p className="text-cp-fg text-[15px] leading-[1.55]">
          Le montant est recrédité au salarié et repris à l’établissement. Le
          paiement d’origine n’est pas effacé&nbsp;: l’annulation s’écrit comme
          une opération inverse, et les deux restent lisibles dans les deux
          historiques.
        </p>

        <TextArea
          id="motif-annulation"
          label="Motif de l’annulation"
          value={motif}
          onChange={setMotif}
          rows={4}
          className="mt-6"
          hint="Obligatoire. Il reste attaché à l’opération."
        />

        {erreur && (
          <Note tone="danger" role="alert" className="mt-5">
            {erreur}
          </Note>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button variant="danger" onClick={annuler} disabled={busy}>
            {busy ? "Envoi…" : "Annuler le paiement"}
          </Button>
          <button
            type="button"
            onClick={fermer}
            className="text-cp-fg cursor-pointer text-[15px] underline underline-offset-4"
          >
            Revenir
          </button>
        </div>

        <Micro as="p" tone="muted" className="mt-5">
          Cette opération est tracée et ne peut pas être défaite.
        </Micro>
      </Modal>
    </PageMain>
  );
}
