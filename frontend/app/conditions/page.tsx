import Link from "next/link";
import { CGU_ARTICLES, CGU_STATUS } from "@/components/legal/cgu";
import Display from "@/components/ui/Display";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import PageMain from "@/components/ui/PageMain";
import Slash from "@/components/ui/Slash";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d’utilisation | CartePro",
  description:
    "Projet de conditions générales d’utilisation du démonstrateur CartePro, soumis à l’avis préalable du service juridique de l'administration.",
  /* Un projet non validé n'a rien à faire dans un index de moteur de
     recherche : la page existe pour être lue depuis le pied de page, pas pour
     être trouvée avant que le service juridique se soit prononcé. */
  robots: { index: false, follow: true },
};

/**
 * Les CGU, transcrites du document de référence (voir components/legal/cgu).
 *
 * Une colonne de texte, et rien d'autre : pas d'écran pleine hauteur, pas de
 * rail, pas de défilement par sections. C'est le seul écran du site qui se lit
 * de haut en bas d'une traite, donc il ne prend rien du gabarit de la vitrine
 * — `pad="y"` plutôt que `snap`.
 *
 * L'avertissement du document est repris en tête, dans ses propres mots. Le
 * texte dit lui-même qu'il ne doit pas être publié en l'état ; l'afficher sans
 * le dire serait exactement ce qu'il interdit.
 */
export default function ConditionsPage() {
  return (
    <PageMain pad="y">
      <article className="mx-auto max-w-[760px]">
        <Micro as="p" tone="accent">
          CartePro
          <Slash />
          Administration
        </Micro>

        {/* Échelle « section » et non « page » : à 98 px le titre tenait sur
            trois lignes dans une colonne de 760 px, et les jambages de la
            deuxième traversaient la troisième. C'est un document, pas une
            accroche. */}
        <Display level={1} accent="d’utilisation." className="mt-5">
          Conditions générales
        </Display>

        <Note tone="danger" as="div" className="mt-8">
          <strong className="font-black">Projet non validé.</strong>{" "}
          {CGU_STATUS}
        </Note>

        {/* Un article par section, numéroté comme dans le document : le numéro
            en micro-typo au-dessus du titre, pour qu'on puisse citer « article
            6 » sans avoir à compter. */}
        {CGU_ARTICLES.map((article) => (
          <section
            key={article.number}
            className="border-cp-border mt-10 border-t pt-6"
          >
            <Micro as="p" tone="muted">
              {article.number}
            </Micro>
            <h2 className="text-cp-fg mt-2 text-[24px] leading-[1.15] font-black tracking-[-0.03em]">
              {article.title}
            </h2>
            {article.body.map((paragraph) => (
              <p
                key={paragraph.slice(0, 40)}
                className="text-cp-fg mt-4 text-[17px] leading-[1.6]"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <Micro
          as="p"
          tone="muted"
          className="border-cp-border mt-10 border-t pt-6"
        >
          Document de référence : projet de CGU CartePro
          <Slash />
          <Link href="/" className="text-cp-fg underline underline-offset-4">
            Retour à l’accueil
          </Link>
        </Micro>
      </article>
    </PageMain>
  );
}
