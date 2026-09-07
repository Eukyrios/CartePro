import Link from "next/link";
import { MENTION_DEMONSTRATEUR } from "@/components/legal/mention";
import Display from "@/components/ui/Display";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import PageMain from "@/components/ui/PageMain";
import Slash from "@/components/ui/Slash";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page introuvable | CartePro",
  robots: { index: false, follow: false },
};

/**
 * La page 404. Elle n'existait pas : Next servait son écran par défaut, en
 * Helvetica sur fond blanc, sans barre haute, sans pied de page — donc sans la
 * mention de démonstrateur, et sans rien qui rattache l'écran au produit.
 *
 * Rendue par le gabarit racine, elle hérite donc de la barre haute et du pied
 * de page, et la mention y figure comme partout ailleurs.
 *
 * `PageMain pad="y"` et non un écran pleine hauteur : une page d'erreur n'a
 * pas de sections à faire défiler.
 */
export default function NotFound() {
  return (
    <PageMain pad="y">
      <div className="mx-auto max-w-[680px]">
        <Micro as="p" tone="muted">
          Erreur 404
        </Micro>

        <Display level={1} accent="introuvable." className="mt-5">
          Page
        </Display>

        <p className="text-cp-fg mt-8 text-[17px] leading-[1.6]">
          L’adresse demandée ne correspond à aucun écran du démonstrateur. Elle
          a peut-être changé, ou n’a jamais existé.
        </p>

        <Note as="div" className="mt-8">
          {MENTION_DEMONSTRATEUR}
        </Note>

        <Micro
          as="p"
          tone="muted"
          className="border-cp-border mt-10 border-t pt-6"
        >
          <Link href="/" className="text-cp-fg underline underline-offset-4">
            Retour à l’accueil
          </Link>
          <Slash />
          <Link
            href="/conditions"
            className="text-cp-fg underline underline-offset-4"
          >
            Conditions d’utilisation
          </Link>
        </Micro>
      </div>
    </PageMain>
  );
}
