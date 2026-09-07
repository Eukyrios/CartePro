"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Display from "@/components/ui/Display";
import EmptyState from "@/components/ui/EmptyState";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";

type PartnerRequest = {
  id: number;
  nom: string;
  email: string;
  secteur: string;
  ville: string;
};

/**
 * Les demandes pour devenir partenaire : un compte créé par
 * `POST /api/auth/register` avec `audience: "partner"`, mais laissé inactif
 * jusqu'à ce qu'un admin l'approuve ici. Refuser réutilise la suppression de
 * partenaire déjà en place — un compte en attente n'est encore qu'un compte.
 */
export default function PartnerRequestsSection() {
  const [requests, setRequests] = useState<PartnerRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    api<{ demandes: PartnerRequest[] }>("/api/admin/partenaires/demandes")
      .then((data) => setRequests(data.demandes))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Chargement impossible."),
      );
  }

  useEffect(load, []);

  async function approve(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/admin/partenaires/${id}/approuver`, { method: "POST" });
      setRequests((current) => current?.filter((r) => r.id !== id) ?? current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'approbation a échoué.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/partenaires/admin/supprimer/${id}`, { method: "DELETE" });
      setRequests((current) => current?.filter((r) => r.id !== id) ?? current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le refus a échoué.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="border-cp-border mt-10 border-t pt-10">
      <Display level={2} scale="panel" accent="partenaire." br={false}>
        Demandes pour devenir
      </Display>

      {error && (
        <Note tone="danger" role="alert" className="mt-4">
          {error}
        </Note>
      )}

      {requests === null ? (
        <EmptyState className="mt-6">Chargement…</EmptyState>
      ) : requests.length === 0 ? (
        <EmptyState className="mt-6">Aucune demande en attente.</EmptyState>
      ) : (
        <ul className="mt-6 divide-cp-border divide-y">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="text-cp-fg font-black">{request.nom}</p>
                <Micro tone="muted" as="p" className="mt-1">
                  {request.email}
                  {request.secteur && ` · ${request.secteur}`}
                  {request.ville && ` · ${request.ville}`}
                </Micro>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="solid"
                  onClick={() => approve(request.id)}
                  disabled={busyId === request.id}
                >
                  Approuver
                </Button>
                <Button
                  variant="danger"
                  onClick={() => reject(request.id)}
                  disabled={busyId === request.id}
                >
                  Refuser
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
