"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MENTION_DEMONSTRATEUR } from "@/components/legal/mention";
import Button from "@/components/ui/Button";
import Display from "@/components/ui/Display";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import PageMain from "@/components/ui/PageMain";

/**
 * L'écran d'erreur serveur — le « 500 » de l'application.
 *
 * Obligatoirement un composant client, et obligatoirement nommé `error.tsx` :
 * c'est la convention par laquelle Next attrape une erreur de rendu dans ce
 * segment. Comme il reste sous le gabarit racine, il hérite de la barre haute
 * et du pied de page, donc de la mention de démonstrateur ; elle est en plus
 * rappelée dans le corps, parce qu'une erreur est exactement le moment où l'on
 * ne fait pas défiler la page jusqu'au pied.
 *
 * Le message technique n'est pas affiché. `error.message` peut contenir ce que
 * le serveur a bien voulu y mettre — un chemin de fichier, une requête, un
 * identifiant — et un écran d'erreur public n'est pas un journal. Il part dans
 * la console, où le développeur le lit.
 *
 * `reset()` refait le rendu du segment sans recharger la page : si la panne
 * était momentanée, l'écran revient.
 */
export default function Error({
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
    <PageMain pad="y">
      <div className="mx-auto max-w-[680px]">
        <Micro as="p" tone="muted">
          Erreur serveur
        </Micro>

        <Display level={1} accent="interrompu." className="mt-5">
          Écran
        </Display>

        <p className="text-cp-fg mt-8 text-[17px] leading-[1.6]">
          Une erreur a empêché l’affichage de cet écran. Rien n’a été modifié.
          Vous pouvez réessayer&nbsp;; si l’erreur revient, elle est de notre
          côté.
        </p>

        {/* Le condensé, quand il existe, est le seul élément technique
            montrable : il identifie l'incident dans les journaux du serveur
            sans rien révéler de son contenu. */}
        {error.digest && (
          <Micro as="p" tone="muted" className="mt-4">
            Référence de l’incident : {error.digest}
          </Micro>
        )}

        <Note as="div" className="mt-8">
          {MENTION_DEMONSTRATEUR}
        </Note>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button variant="solid" onClick={reset}>
            Réessayer
          </Button>
          <Link
            href="/"
            className="text-cp-fg text-[15px] underline underline-offset-4"
          >
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </PageMain>
  );
}
