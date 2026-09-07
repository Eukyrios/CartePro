"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Display from "@/components/ui/Display";
import EmptyState from "@/components/ui/EmptyState";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import SelectField from "@/components/ui/SelectField";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/TextField";

type AdminPartner = { id: number; nom: string; secteur: string; ville: string };

type FeaturedPick = {
  id: number;
  partenaireNom: string;
  commentaire: string;
  actif: boolean;
  clics: number;
};

/**
 * Le coup de cœur du Ministre, vu de l'admin : une ligne par choix plutôt
 * qu'un simple bouton, pour garder l'historique et pouvoir réactiver un choix
 * précédent — voir `backend/models.py` (`FeaturedPick`).
 *
 * La section publique est désactivée pour l'instant (voir
 * `MINISTER_PICK_ENABLED` dans `components/minister/MinisterPickSection`),
 * donc les clics resteront à zéro tant qu'elle n'est pas rebranchée — ce
 * panneau prépare l'historique pour ce jour-là.
 */
export default function FeaturedPickSection() {
  const [partners, setPartners] = useState<AdminPartner[]>([]);
  const [picks, setPicks] = useState<FeaturedPick[] | null>(null);
  const [partnerId, setPartnerId] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  function loadPicks() {
    api<{ choix: FeaturedPick[] }>("/api/admin/coup-de-coeur")
      .then((data) => setPicks(data.choix))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Chargement impossible."),
      );
  }

  useEffect(() => {
    api<{ partenaires: AdminPartner[] }>("/api/admin/partenaires")
      .then((data) => setPartners(data.partenaires))
      .catch(() => undefined);
    loadPicks();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!partnerId) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/coup-de-coeur", {
        method: "POST",
        body: JSON.stringify({
          partenaireId: Number(partnerId),
          commentaire: comment,
        }),
      });
      setComment("");
      setPartnerId("");
      loadPicks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "La création a échoué.");
    } finally {
      setBusy(false);
    }
  }

  async function activate(id: number) {
    setActivatingId(id);
    setError(null);
    try {
      await api(`/api/admin/coup-de-coeur/${id}/activer`, { method: "POST" });
      loadPicks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'activation a échoué.");
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <section className="border-cp-border mt-10 border-t pt-10">
      <Display level={2} scale="panel" accent="du Ministre." className="mb-2">
        Coup de cœur
      </Display>
      <Micro tone="muted" as="p" className="mb-6">
        Section désactivée sur le site public pour le moment — ce panneau
        prépare l&apos;historique pour sa réactivation.
      </Micro>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end"
      >
        <SelectField
          id="coup-de-coeur-partenaire"
          label="Partenaire"
          value={partnerId}
          onChange={setPartnerId}
          options={partners.map((p) => ({ value: String(p.id), label: p.nom }))}
          placeholder="Choisir un partenaire"
          emptyLabel="Aucun partenaire actif"
        />
        <div>
          <label htmlFor="coup-de-coeur-commentaire" className={LABEL_CLASS}>
            Mot du Ministre
          </label>
          <textarea
            id="coup-de-coeur-commentaire"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={2}
            className={INPUT_CLASS}
            placeholder="Un mot sur ce choix…"
          />
        </div>
        <Button type="submit" variant="solid" disabled={busy || !partnerId}>
          {busy ? "Création…" : "Choisir"}
        </Button>
      </form>

      {error && (
        <Note tone="danger" role="alert" className="mt-4">
          {error}
        </Note>
      )}

      {picks === null ? (
        <EmptyState className="mt-6">Chargement…</EmptyState>
      ) : picks.length === 0 ? (
        <EmptyState className="mt-6">
          Aucun coup de cœur choisi pour l&apos;instant.
        </EmptyState>
      ) : (
        <ul className="mt-6 divide-cp-border divide-y">
          {picks.map((pick) => (
            <li
              key={pick.id}
              className="flex flex-wrap items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="text-cp-fg font-black">
                  {pick.partenaireNom}
                  {pick.actif && (
                    <Micro tone="accent" className="ml-2">
                      Actif
                    </Micro>
                  )}
                </p>
                {pick.commentaire && (
                  <Micro tone="muted" as="p" className="mt-1">
                    «&nbsp;{pick.commentaire}&nbsp;»
                  </Micro>
                )}
                <Micro tone="muted" as="p" className="mt-1">
                  {pick.clics} clic{pick.clics === 1 ? "" : "s"} vers la fiche
                </Micro>
              </div>
              {!pick.actif && (
                <Button
                  onClick={() => activate(pick.id)}
                  disabled={activatingId === pick.id}
                >
                  {activatingId === pick.id ? "…" : "Réactiver"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
