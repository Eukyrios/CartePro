"use client";

import { useEffect } from "react";
import { MENTION_DEMONSTRATEUR } from "@/components/legal/mention";
import "./globals.css";

/**
 * Le dernier filet : l'erreur qui casse le gabarit racine lui-même.
 *
 * Ce fichier remplace `<html>` et `<body>`, donc il n'a ni barre haute, ni
 * pied de page, ni fournisseur de thème — et c'est précisément pourquoi il
 * existe. Sans lui, une erreur dans le gabarit produisait l'écran nu de Next,
 * le seul écran de l'application où la mention de démonstrateur était
 * absente parce qu'elle ne pouvait pas y être héritée.
 *
 * Tout est donc écrit en styles littéraux, sans dépendre d'une variable de
 * thème : les jetons `--cp-*` viennent du gabarit qui vient de tomber. La
 * mention, elle, est importée — une phrase de conformité ne se recopie pas.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#ffffff",
          color: "#0a0a0b",
          fontFamily: "Archivo, Arial, Helvetica, sans-serif",
        }}
      >
        <main style={{ maxWidth: "560px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#6b6b70",
            }}
          >
            Erreur serveur
          </p>

          <h1
            style={{
              margin: "12px 0 0",
              fontSize: "40px",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              fontWeight: 900,
            }}
          >
            Application interrompue.
          </h1>

          <p style={{ margin: "24px 0 0", fontSize: "17px", lineHeight: 1.6 }}>
            Une erreur a empêché le chargement de l’application. Rien n’a été
            modifié.
          </p>

          {error.digest && (
            <p
              style={{ margin: "12px 0 0", fontSize: "13px", color: "#6b6b70" }}
            >
              Référence de l’incident : {error.digest}
            </p>
          )}

          <p
            style={{
              margin: "24px 0 0",
              paddingTop: "16px",
              borderTop: "2px solid #0a0a0b",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {MENTION_DEMONSTRATEUR}
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "24px",
              padding: "12px 20px",
              border: "none",
              background: "#4a1b6b",
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
