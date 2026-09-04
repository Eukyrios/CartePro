import { ministerPicks } from "@/components/data/ministerPicks";
import Chip from "@/components/ui/Chip";
import Display from "@/components/ui/Display";
import Micro from "@/components/ui/Micro";
import PartnerTile from "@/components/ui/PartnerTile";
import Screen from "@/components/ui/Screen";
import Slash from "@/components/ui/Slash";

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
    <Screen id="coup-de-coeur">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Display level={2} accent="du Ministre.">
          Coup de cœur
        </Display>
        <Chip tone="official">Choisi par le Ministère</Chip>
      </div>

      {/* Quatre colonnes quand la place le permet, deux, puis une. Les tuiles
          s'étirent à la hauteur de la plus haute, si bien que les notes du
          Ministre, de longueurs inégales, restent alignées. */}
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {picks.map(({ pick, partner }) => (
          <li key={partner.id}>
            <PartnerTile partner={partner}>
              <div className="flex-1 p-4">
                <p className="text-cp-fg text-[13px] leading-[1.5] italic">
                  «&nbsp;{pick.note}&nbsp;»
                </p>
                <Micro as="address" tone="muted" className="mt-3 not-italic">
                  {partner.postcode} {partner.city}
                </Micro>
              </div>
            </PartnerTile>
          </li>
        ))}
      </ul>

      <Micro as="p" tone="muted" className="mt-6">
        {picks.length} coup{picks.length > 1 ? "s" : ""} de cœur
        <Slash />
        sélection du Ministère
      </Micro>
    </Screen>
  );
}
