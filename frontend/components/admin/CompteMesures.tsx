"use client";

import Link from "next/link";
import { useState } from "react";
import type { Compte, GesteCompte } from "./api";
import { GESTES, LIBELLE_STATUT, gestesPour, tonDuStatut } from "./mesures";
import MesureDialog from "./MesureDialog";
import Chip from "@/components/ui/Chip";
import Note from "@/components/ui/Note";
import { MICRO } from "@/components/ui/surfaces";

/**
 * L'état d'un compte et les mesures qu'on peut prendre dessus, à côté du titre
 * de son historique.
 *
 * À côté du titre, et non dans une bande en tête de page : le titre nomme un
 * compte — « Les recettes de X », « Historique des dépenses de Y » — et son
 * état comme les gestes qui s'y appliquent appartiennent à ce nom. Une bande
 * séparée se lisait comme un second en-tête, à regarder avant d'arriver aux
 * chiffres, et répétait le nom que le titre venait de dire.
 *
 * Les mêmes gestes, le même vocabulaire et le même dialogue motivé que partout
 * ailleurs — `mesures.ts` et `MesureDialog` — pour qu'une suspension prononcée
 * ici s'écrive exactement comme une suspension prononcée d'un autre écran.
 *
 * Rien pendant le chargement, et rien si le compte n'a pas répondu : ce bloc
 * accompagne un titre, il n'est pas le contenu de l'écran. Un « Chargement… »
 * posé à côté d'un titre se lirait comme une panne, et l'historique en dessous
 * s'affiche très bien sans lui.
 *
 * `onMesure` prévient l'appelant qu'il faut relire : une mesure change l'état
 * affiché, et une clôture change ce qui sera proposé ensuite.
 */
export default function CompteMesures({
  compte,
  state,
  onMesure,
}: {
  compte: Compte | null;
  state: "loading" | "ready" | "error";
  onMesure: () => void;
}) {
  const [visee, setVisee] = useState<{
    compte: Compte;
    geste: GesteCompte | "retablir";
  } | null>(null);
  const [avis, setAvis] = useState("");

  if (state !== "ready" || !compte) return null;

  const gestes = gestesPour(compte);

  return (
    <div className="flex flex-col items-start gap-3 sm:items-end">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:justify-end">
        <Chip tone={tonDuStatut(compte.statut)}>
          {LIBELLE_STATUT[compte.statut] ?? compte.statut}
        </Chip>

        {gestes.length === 0 ? (
          compte.genre === "partenaire" ? (
            /* Un dossier en attente ou refusé ne se tranche pas d'ici : les
               pièces se lisent d'abord. */
            <Link
              href={`/dossier/${compte.slug}`}
              className={`text-cp-accent decoration-cp-accent underline underline-offset-4 hover:decoration-2 ${MICRO}`}
            >
              Instruire
            </Link>
          ) : (
            <span className={`${MICRO} text-cp-muted`}>
              Aucune mesure possible
            </span>
          )
        ) : (
          gestes.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setVisee({ compte, geste: id })}
              className={`${MICRO} ${
                GESTES[id].ton === "danger"
                  ? "text-fg-danger decoration-fg-danger"
                  : "text-cp-accent decoration-cp-accent"
              } underline underline-offset-4 hover:decoration-2`}
            >
              {GESTES[id].verbe}
            </button>
          ))
        )}
      </div>

      {/* Le motif de la dernière mesure, sous l'état : ce qu'un agent vient
          lire en premier quand un compte n'est pas actif. Rien à dire quand il
          l'est — un motif de réactivation sous une pastille « Actif » n'apprend
          rien à personne. */}
      {compte.derniereMesure &&
        compte.statut !== "actif" &&
        compte.statut !== "validé" && (
          <p className="text-cp-muted max-w-[42ch] text-[12px] sm:text-right">
            {compte.derniereMesure.motif}
          </p>
        )}

      {avis && (
        <Note tone="positive" role="status" className="max-w-[44ch]">
          {avis}
        </Note>
      )}

      <MesureDialog
        visee={visee}
        onClose={() => setVisee(null)}
        onDone={(message) => {
          setVisee(null);
          setAvis(message);
          onMesure();
        }}
      />
    </div>
  );
}
