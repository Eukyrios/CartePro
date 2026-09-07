"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatEuros } from "@/components/data/ledger";
import Button from "@/components/ui/Button";
import Display from "@/components/ui/Display";
import EmptyState from "@/components/ui/EmptyState";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";

type AdminPartner = { id: number; nom: string; secteur: string; ville: string };

type PartnerTransaction = {
  id: number;
  date: string | null;
  montantCents: number;
  salarie: string;
  estRemboursement: boolean;
  rembourse: boolean;
};

/**
 * Un partenaire par ligne, et son historique de paiement derrière un bouton —
 * plutôt qu'une page par partenaire, pour rester une section de ce panneau.
 *
 * « Annuler » n'efface ni ne modifie jamais la transaction d'origine (une
 * ligne validée est immuable, voir `backend/models.py`) : ça insère une
 * contre-passation, visible ici avec l'étiquette « Remboursement ».
 */
export default function PartnerTransactionsSection() {
  const [partners, setPartners] = useState<AdminPartner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    api<{ partenaires: AdminPartner[] }>("/api/admin/partenaires")
      .then((data) => setPartners(data.partenaires))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Chargement impossible."),
      );
  }, []);

  return (
    <section className="border-cp-border mt-10 border-t pt-10">
      <Display level={2} scale="panel" accent="." br={false}>
        Partenaires
      </Display>

      {error && (
        <Note tone="danger" role="alert" className="mt-4">
          {error}
        </Note>
      )}

      {partners === null ? (
        <EmptyState className="mt-6">Chargement…</EmptyState>
      ) : partners.length === 0 ? (
        <EmptyState className="mt-6">Aucun partenaire actif.</EmptyState>
      ) : (
        <ul className="mt-6 divide-cp-border divide-y">
          {partners.map((partner) => (
            <li key={partner.id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-cp-fg font-black">{partner.nom}</p>
                  <Micro tone="muted" as="p" className="mt-1">
                    {partner.secteur || "Secteur non précisé"}
                    {partner.ville && ` · ${partner.ville}`}
                  </Micro>
                </div>
                <Button
                  onClick={() =>
                    setOpenId((current) =>
                      current === partner.id ? null : partner.id,
                    )
                  }
                >
                  {openId === partner.id ? "Fermer" : "Voir l'historique"}
                </Button>
              </div>
              {openId === partner.id && (
                <PartnerHistory partnerId={partner.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PartnerHistory({ partnerId }: { partnerId: number }) {
  const [transactions, setTransactions] = useState<
    PartnerTransaction[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    api<{ transactions: PartnerTransaction[] }>(
      `/api/admin/partenaires/${partnerId}/transactions`,
    )
      .then((data) => setTransactions(data.transactions))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Chargement impossible."),
      );
  }

  useEffect(load, [partnerId]);

  async function rollback(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/admin/transactions/${id}/annuler`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'annulation a échoué.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="border-cp-border mt-4 border-l-2 pl-4">
      {error && (
        <Note tone="danger" role="alert" className="mb-3">
          {error}
        </Note>
      )}
      {transactions === null ? (
        <EmptyState>Chargement…</EmptyState>
      ) : transactions.length === 0 ? (
        <EmptyState>Aucune transaction.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <Micro as="span" tone={transaction.estRemboursement ? "muted" : "fg"}>
                {transaction.date
                  ? new Date(transaction.date).toLocaleDateString("fr-FR")
                  : "—"}{" "}
                · {transaction.salarie} · {formatEuros(transaction.montantCents)}
                {transaction.estRemboursement && (
                  <Micro tone="accent" className="ml-2">
                    Remboursement
                  </Micro>
                )}
              </Micro>
              {!transaction.estRemboursement && (
                <Button
                  variant="danger"
                  onClick={() => rollback(transaction.id)}
                  disabled={transaction.rembourse || busyId === transaction.id}
                >
                  {transaction.rembourse ? "Déjà annulée" : "Annuler"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
