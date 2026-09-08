"use client";

import Link from "next/link";
import { useState } from "react";
import type { Compte, GesteCompte } from "./api";
import {
  GESTES,
  LIBELLE_STATUT,
  gestesPour,
  libelleDuChiffre,
  porteeDe,
  tonDuStatut,
} from "./mesures";
import MesureDialog from "./MesureDialog";
import { formatEuros } from "@/components/data/ledger";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Display from "@/components/ui/Display";
import EmptyState from "@/components/ui/EmptyState";
import Note from "@/components/ui/Note";
import Screen from "@/components/ui/Screen";
import { MICRO, PANEL } from "@/components/ui/surfaces";
import type { ReactNode } from "react";

/**
 * La gestion d'un compte, en tête de son historique.
 *
 * Ce qu’une pastille et un lien posés à côté du titre faisaient jusqu’ici,
 * repris en section : l'état du compte, ce qu'il porte, les mesures qu'on peut
 * prendre, et l'écrit de celles déjà prises. La pastille suffisait à *dire*
 * l'état ; elle ne suffisait pas à le *gérer* — le motif d'une suspension en
 * cours n'y tenait pas, et l'historique des décisions n'y tenait pas du tout.
 *
 * Un seul composant pour les deux genres de compte. Ce qui change entre un
 * établissement et un salarié — les gestes offerts, le sens du chiffre, le mot
 * pour son état — est déjà écrit une fois dans `mesures.ts`, et cet écran s'y
 * réfère au lieu de le redire.
 *
 * **Les gestes ne sont pas les mêmes des deux côtés, et c'est voulu.** Un
 * salarié se suspend et se clôture ; un établissement se suspend et se
 * rétablit, mais ne se clôture pas — il n'a pas de solde à solder, et sa mise
 * à l'écart est un refus motivé, qui se prend sur son dossier après lecture
 * des pièces. La règle vit dans `gestesPour`, pas ici : cet écran affiche ce
 * qu'elle rend, et dit où aller quand elle ne rend rien.
 */
export default function CompteSection({
  compte,
  state,
  onMesure,
  eyebrow,
  titre,
}: {
  compte: Compte | null;
  state: "loading" | "ready" | "error";
  /** Appelé après une mesure : l'état affiché et l'historique changent. */
  onMesure: () => void;
  /** Le fil d'Ariane de la page, que cette section ouvre désormais. */
  eyebrow?: ReactNode;
  /** Ce qui précède le nom dans le titre — « L'établissement », « Le compte de ». */
  titre: string;
}) {
  const [visee, setVisee] = useState<{
    compte: Compte;
    geste: GesteCompte | "retablir";
  } | null>(null);
  const [avis, setAvis] = useState("");

  return (
    /* Un écran à part entière, et non un bloc posé au-dessus de l'historique :
       la page en compte deux, donc le rail latéral peut les lister et le
       défilement s'y accrocher. `tight` parce que c'est le premier — il ouvre
       sous la barre haute, là où les autres ouvrent sur du vide. */
    <Screen
      id="compte"
      /* Un écran plein sous la barre, comme les autres sections, et le
         contenu posé haut dedans.

         Les trois réglages ont été essayés : collé en haut (`tight`, 12px), le
         titre touchait la barre ; centré, il descendait à mi-hauteur et on
         voyait d'abord du blanc ; sans plancher, le bloc était plus court
         qu'une section et l'historique montait dans la même fenêtre. `offset`
         est la densité écrite pour ce cas précis — voir `Screen` : assez d'air
         pour que le bloc se lise comme posé, pas comme poussé contre la
         barre. */
      height="below-bar"
      snap={false}
      rule={false}
      align="start"
      density="offset"
      aria-labelledby="compte-titre"
    >
      <div>
        {eyebrow}

        <Display
          level={1}
          id="compte-titre"
          accent={compte ? `${compte.nom}.` : "…"}
          className={eyebrow ? "mt-5 mb-8" : "mb-8"}
        >
          {titre}
        </Display>

        {state === "loading" ? (
          <EmptyState>Chargement du compte…</EmptyState>
        ) : state === "error" || !compte ? (
          <Note tone="danger" role="alert">
            Le compte n’a pas pu être chargé. L’historique ci-dessous reste
            lisible ; rechargez la page pour reprendre la main dessus.
          </Note>
        ) : (
          <div className={PANEL}>
            {/* Ce qu'on regarde avant de décider : l'état, ce que le compte
                porte, et ce qu'il a produit. Trois faits, pas un tableau de
                bord — la décision se prend sur eux. */}
            <div className="grid gap-x-10 gap-y-6 sm:grid-cols-3">
              <div>
                <p className={`${MICRO} text-cp-muted`}>État</p>
                <p className="mt-2">
                  <Chip tone={tonDuStatut(compte.statut)}>
                    {LIBELLE_STATUT[compte.statut] ?? compte.statut}
                  </Chip>
                </p>
              </div>
              <div>
                <p className={`${MICRO} text-cp-muted`}>
                  {libelleDuChiffre(compte)}
                </p>
                <p className="text-cp-fg mt-2 text-[22px] leading-none font-black tracking-[-0.04em] tabular-nums">
                  {formatEuros(compte.soldeCents)}
                </p>
              </div>
              <div>
                <p className={`${MICRO} text-cp-muted`}>Paiements</p>
                <p className="text-cp-fg mt-2 text-[22px] leading-none font-black tracking-[-0.04em] tabular-nums">
                  {compte.nbPaiements}
                </p>
              </div>
            </div>

            {/* Les mesures. Séparées des faits par un filet : ce qui est au-dessus
                se lit, ce qui est en dessous s'exerce. */}
            <div className="border-cp-border mt-8 border-t pt-6">
              <p className={`${MICRO} text-cp-muted`}>Mesures</p>

              {gestesPour(compte).length === 0 ? (
                <p className="text-cp-muted mt-3 max-w-[70ch] text-[13px]">
                  {compte.statut === "clôturé" ? (
                    <>
                      {compte.genre === "partenaire"
                        ? "Cet établissement est clôturé. Une clôture est définitive : elle ne se lève pas, un nouveau dossier se dépose."
                        : "Ce compte est clôturé. Une clôture est définitive : elle ne se lève pas, un nouveau compte se crée."}
                    </>
                  ) : (
                    <>
                      Aucune mesure ne se prend ici sur un dossier «{" "}
                      {LIBELLE_STATUT[compte.statut] ?? compte.statut} ».
                      Conventionner ou écarter un établissement se décide sur
                      son dossier, où les pièces se lisent avant qu’on tranche —{" "}
                      <Link
                        href={`/dossier/${compte.slug}`}
                        className="text-cp-accent decoration-cp-accent underline underline-offset-4 hover:decoration-2"
                      >
                        ouvrir le dossier
                      </Link>
                      .
                    </>
                  )}
                </p>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {gestesPour(compte).map((id) => (
                      <Button
                        key={id}
                        variant={
                          GESTES[id].ton === "danger" ? "danger" : "solid"
                        }
                        onClick={() => setVisee({ compte, geste: id })}
                      >
                        {GESTES[id].verbe}
                      </Button>
                    ))}
                  </div>
                  {/* Ce que chaque geste emporte, écrit avant qu'on clique et pas
                      seulement dans le dialogue : un bouton dont on ne découvre
                      la portée qu'une fois pressé n'est pas un bouton qu'on
                      presse en connaissance de cause. */}
                  <ul className="mt-4 space-y-1">
                    {gestesPour(compte).map((id) => (
                      <li key={id} className="text-cp-muted text-[12px]">
                        <span className={`${MICRO} text-cp-fg`}>
                          {GESTES[id].verbe}
                        </span>{" "}
                        — {porteeDe(compte, id)}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {avis && (
                <Note tone="positive" role="status" className="mt-4">
                  {avis}
                </Note>
              )}
            </div>

            {/* L'écrit. Un compte ne change pas d'état sans qu'on sache qui l'a
                décidé et pourquoi, et rien ne s'efface : suspendu puis rétabli
                puis suspendu laisse trois lignes. */}
            {compte.mesures.length > 0 && (
              <div className="border-cp-border mt-8 border-t pt-6">
                <p className={`${MICRO} text-cp-muted`}>
                  {compte.genre === "partenaire"
                    ? "Décisions"
                    : "Mesures prises"}
                </p>
                <ul className="mt-3 space-y-3">
                  {[...compte.mesures].reverse().map((mesure, n) => (
                    <li
                      key={`${mesure.at}-${n}`}
                      className="border-cp-border border-l-2 pl-3"
                    >
                      <p className={`${MICRO} text-cp-fg`}>
                        {LIBELLE_STATUT[mesure.sens] ?? mesure.sens}
                        {mesure.at && (
                          <span className="text-cp-muted">
                            {" · "}
                            {new Date(mesure.at).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </p>
                      <p className="text-cp-muted mt-1 max-w-[80ch] text-[13px]">
                        {mesure.motif}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
    </Screen>
  );
}
