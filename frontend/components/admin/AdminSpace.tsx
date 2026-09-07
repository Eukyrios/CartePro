"use client";

import { useState } from "react";
import Link from "next/link";
import Display from "@/components/ui/Display";
import Button from "@/components/ui/Button";
import Note from "@/components/ui/Note";
import EmptyState from "@/components/ui/EmptyState";
import { useAccount } from "@/components/account/AccountProvider";
import { accessToken } from "@/lib/api";
import PartnerRequestsSection from "./PartnerRequestsSection";
import FeaturedPickSection from "./FeaturedPickSection";
import PartnerTransactionsSection from "./PartnerTransactionsSection";

/**
 * Le panneau d'administration : un garde-fou d'affichage, pour l'écran, avant
 * tout contenu.
 *
 * Ce garde n'est qu'un confort visuel — il évite qu'un compte non-admin voie
 * l'interface clignoter avant redirection. La vraie protection est côté
 * serveur : chaque route de `/api/admin` vérifie elle-même le rôle du jeton
 * (voir `backend/decorators.py`), donc appeler l'API directement sans être
 * admin échoue toujours, garde ou pas.
 */
export default function AdminSpace() {
  const { profile, ready } = useAccount();

  if (!ready) {
    return <EmptyState variant="page">Chargement…</EmptyState>;
  }

  if (!profile) {
    return (
      <Note as="div">
        <strong className="font-black">Connexion requise.</strong>{" "}
        Connectez-vous avec un compte administrateur pour accéder à cette
        page.{" "}
        <Link href="/" className="font-black underline underline-offset-4">
          Retour à l&apos;accueil
        </Link>
      </Note>
    );
  }

  if (profile.role !== "admin") {
    return (
      <Note as="div" tone="danger" role="alert">
        <strong className="font-black">Accès refusé.</strong> Cette page est
        réservée aux comptes administrateur.{" "}
        <Link href="/" className="font-black underline underline-offset-4">
          Retour à l&apos;accueil
        </Link>
      </Note>
    );
  }

  return (
    <>
      <Display level={1} accent="Ministère.">
        Administration
      </Display>
      <PartnerRequestsSection />
      <FeaturedPickSection />
      <PartnerTransactionsSection />
      <TransactionsExport />
    </>
  );
}

/** Le seul geste déjà branché côté serveur : le CSV des transactions. */
function TransactionsExport() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setError(null);
    setBusy(true);
    try {
      const token = accessToken();
      const response = await fetch("/api/admin/transactions.csv", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Le téléchargement a échoué.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "transactions.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Le téléchargement a échoué.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-cp-border mt-10 border-t pt-10">
      <Button onClick={handleDownload} disabled={busy}>
        {busy ? "Génération…" : "Exporter les transactions (CSV)"}
      </Button>
      {error && (
        <Note tone="danger" role="alert" className="mt-4">
          {error}
        </Note>
      )}
    </div>
  );
}
