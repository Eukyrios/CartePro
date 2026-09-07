"use client";

import { useEffect, useRef, useState } from "react";
import { demanderReexamen } from "./api";
import Button from "@/components/ui/Button";
import Display from "@/components/ui/Display";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import Screen from "@/components/ui/Screen";
import Slash from "@/components/ui/Slash";
import RefusalStamp from "./RefusalStamp";

const DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

/**
 * Le premier écran de l'espace d'un partenaire écarté : la décision, son motif,
 * et la porte de sortie.
 *
 * Il est ici et non sur la fiche publique, et c'est le fond de l'affaire. La
 * première version affichait le refus sur la fiche — donc lisible par tout le
 * monde — tandis que le compte concerné ne pouvait pas se connecter. La seule
 * personne à qui la décision est adressée était la seule à ne pas pouvoir la
 * lire. Maintenant elle entre, et cet écran est ce qu'elle voit d'abord.
 *
 * Le motif est celui de la décision enregistrée — les mots de l'administration,
 * pas une reformulation. C'est ce que la table `decisions` garde, et ce que
 * `/api/auth/me` sert au seul titulaire du compte.
 *
 * Un refus sans recours n'est pas une décision, c'est une porte murée : d'où le
 * bouton de réexamen. Il repose le dossier « en attente d'instruction » et
 * écrit la demande dans la table des décisions — rien n'est effacé, le refus
 * précédent reste avec son motif et sa date, parce que c'est l'historique de
 * l'instruction.
 *
 * Les écrans suivants restent en place, barrés : ce n'est pas la connexion qui
 * ouvre l'encaissement, c'est le conventionnement.
 */
export default function RefusalSection({
  nom,
  refus,
  onReexamen,
}: {
  nom: string;
  refus: { motif: string; at: string };
  /** Appelé quand le dossier est reparti en instruction, pour rafraîchir. */
  onReexamen?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const minuteur = useRef<number | null>(null);

  /* Le compte est relu **après** un temps de lecture, et pas tout de suite.
     Relire le profil fait disparaître cette section — le dossier n'est plus en
     refus — donc le message de confirmation s'en allait avec elle avant qu'on
     ait pu le lire : on cliquait, l'écran se volatilisait, et rien ne disait
     que la demande était partie. */
  useEffect(() => {
    return () => {
      if (minuteur.current !== null) window.clearTimeout(minuteur.current);
    };
  }, []);

  async function reexaminer() {
    setBusy(true);
    setError(null);
    try {
      const message = await demanderReexamen();
      setOutcome(message);
      minuteur.current = window.setTimeout(() => onReexamen?.(), 3200);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "La demande n'a pas pu être envoyée. Réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      id="refus"
      height="below-bar"
      snap={false}
      rule={false}
      density="tight"
    >
      {/* La décision à gauche, la pièce du dossier à droite : la moitié droite
          laissée blanche se lisait comme un rendu inachevé. */}
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,38%)] lg:gap-16">
        <div className="max-w-[62ch]">
          <Micro as="p" tone="official">
            Décision de l&apos;administration
          </Micro>

          <Display level={1} accent="refusé." className="mt-4">
            Conventionnement
          </Display>

          <Note tone="danger" as="div" role="alert" className="mt-8">
            <strong className="font-black">
              La candidature de {nom} a été refusée.
            </strong>
            <p className="mt-3 text-[16px] leading-[1.6]">{refus.motif}</p>
            <Micro as="p" tone="muted" className="mt-4">
              Décision du {DATE.format(new Date(refus.at))}
              <Slash />
              visible de vous seul
            </Micro>
          </Note>

          <p className="text-cp-muted mt-7 max-w-[54ch] text-[15px] leading-[1.55]">
            Votre établissement n&apos;apparaît pas dans le réseau et
            l&apos;encaissement vous reste fermé. Un réexamen repose le dossier
            en instruction — joignez les pièces que le motif indique.
          </p>

          {outcome ? (
            <Note tone="positive" role="status" className="mt-7">
              {outcome}
            </Note>
          ) : (
            <div className="mt-7">
              <Button variant="solid" onClick={reexaminer} disabled={busy}>
                {busy ? "Envoi…" : "Demander un réexamen"}
              </Button>
            </div>
          )}

          {error && (
            <Note tone="danger" role="alert" className="mt-4">
              {error}
            </Note>
          )}
        </div>

        <RefusalStamp />
      </div>
    </Screen>
  );
}
