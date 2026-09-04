import Link from "next/link";
import { ministerPicks } from "@/components/data/ministerPicks";
import PartnerPhoto from "@/components/partners/PartnerPhoto";
import { CHIP_OFFICIAL, MICRO } from "@/components/ui/surfaces";

/**
 * « Coup de cœur du Ministre » : la sélection, et les mots du Ministre sur
 * chacun. Le contenu est celui de l'admin — voir data/ministerPicks — donc
 * rien ici ne change quand la sélection change, et une sélection vide efface
 * la section plutôt que de laisser un titre au-dessus de rien.
 *
 * Montrée entière, une fois, en autant de colonnes qu'il y a de place. Cette
 * section défilait sans fin, la liste répétée trois fois bout à bout pour
 * cacher la couture : quatre choix qui repassent indéfiniment se lisent comme
 * un catalogue qu'on parcourt, alors que c'est une sélection qu'on regarde.
 * Une sélection se compte d'un coup d'œil ; c'est tout l'intérêt d'être
 * choisi. Au-delà d'une dizaine de coups de cœur, la grille passera à la ligne
 * — et il faudra alors une pagination, pas un défilement.
 *
 * Plus de "use client" : il n'y a plus d'état, plus de rAF, plus de geste à
 * suivre. La section est du HTML rendu sur le serveur.
 */
export default function MinisterPicksSection() {
  const picks = ministerPicks();

  if (picks.length === 0) return null;

  return (
    <section
      id="coup-de-coeur"
      className="border-cp-border grid min-h-screen snap-start content-center border-b py-16"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-[clamp(34px,4.4vw,58px)] leading-[0.86] font-black tracking-[-0.07em]">
          Coup de cœur
          <br />
          <em className="text-cp-accent font-serif font-normal">
            du Ministre.
          </em>
        </h2>
        <span className={CHIP_OFFICIAL}>Choisi par le Ministère</span>
      </div>

      {/* Quatre colonnes quand la place le permet, deux, puis une. Les tuiles
          s'étirent à la hauteur de la plus haute, si bien que les notes du
          Ministre, de longueurs inégales, restent alignées. */}
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {picks.map(({ pick, partner }) => (
          <li key={partner.id}>
            <Link
              href={`/espace/partenaire/${partner.id}`}
              className="border-cp-border group hover:border-cp-fg focus-visible:outline-cp-accent flex h-full w-full cursor-pointer flex-col overflow-hidden border text-left focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <PartnerPhoto partner={partner} />
              <div className="flex-1 p-4">
                <p className="text-cp-fg text-[13px] leading-[1.5] italic">
                  «&nbsp;{pick.note}&nbsp;»
                </p>
                <address className={`text-cp-muted mt-3 not-italic ${MICRO}`}>
                  {partner.postcode} {partner.city}
                </address>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className={`text-cp-muted mt-6 ${MICRO}`}>
        {picks.length} coup{picks.length > 1 ? "s" : ""} de cœur
        <span className="text-cp-accent px-1.5">/</span>
        sélection du Ministère
      </p>
    </section>
  );
}
