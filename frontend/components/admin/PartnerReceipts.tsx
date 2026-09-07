"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { useCataloguePartner } from "@/components/data/useCataloguePartner";
import TransactionsSection, {
  type TransactionRow,
} from "@/components/transactions/TransactionsSection";
import Breadcrumb from "@/components/ui/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import IconButton from "@/components/ui/IconButton";
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
  const router = useRouter();
  const { profile, ready } = useAccount();
  const { entry, loaded } = useCataloguePartner(slug);
  const [rows, setRows] = useState<readonly TransactionRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const admin = ready && profile?.role === "admin";

  useEffect(() => {
    if (!admin) return;
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
        /* Le même en-tête que la fiche d'un partenaire — bouton de retour de
           40px et fil d'Ariane sur une ligne : les deux écrans sont ouverts
           depuis une tuile d'une liste, et on en repart par le même geste. Une
           ligne de surtitre seule, posée contre le titre, donnait un haut
           d'écran serré ; la rangée respire parce qu'elle a la hauteur du
           bouton. */
        eyebrow={
          <div className="flex items-center gap-4">
            <IconButton
              label="Retour à la page précédente"
              /* Un onglet neuf n'a pas d'historique à remonter : on retombe
                 alors sur l'écran des recettes de l'espace, d'où viennent les
                 tuiles qui mènent ici. */
              onClick={() =>
                window.history.length > 1
                  ? router.back()
                  : router.push("/espace#recettes")
              }
            >
              ←
            </IconButton>
            <Breadcrumb
              trail={[
                { label: "Administration", href: "/espace" },
                { label: "Les recettes", href: "/espace#recettes" },
                { label: "Historique des paiements" },
              ]}
            />
          </div>
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
      />
    </PageMain>
  );
}
