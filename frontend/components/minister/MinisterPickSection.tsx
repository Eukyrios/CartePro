import { ministerPick } from "@/components/data/ministerPicks";
import { partnerCategoryLabel } from "@/components/data/partnerCategories";
import { Arrow } from "@/components/brand/Marks";
import Chip from "@/components/ui/Chip";
import Display from "@/components/ui/Display";
import Micro from "@/components/ui/Micro";
import PartnerTile from "@/components/ui/PartnerTile";
import Screen from "@/components/ui/Screen";

/**
 * « Coup de cœur du Ministre » : un partenaire, et ce que le Ministre en dit.
 *
 * Un seul. La section en montrait quatre côte à côte, ce qui en faisait une
 * rangée de plus dans un site qui en compte déjà — le réseau, l'historique, la
 * pile des trois gestes. Or un coup de cœur qui se décline en quatre n'est plus
 * un coup de cœur, c'est une étagère : le lecteur compare au lieu de retenir.
 * Un seul rend la phrase du Ministre lisible en grand, à l'échelle des autres
 * titres de la page, et le nom du partenaire devient une recommandation plutôt
 * qu'une vignette.
 *
 * Les autres entrées de `data/ministerPicks` ne sont pas perdues : la liste
 * reste la sélection, et c'est sa tête qui s'affiche. Changer de coup de cœur,
 * c'est remonter une ligne — le jour où l'espace d'administration existera, il
 * fera exactement cela.
 *
 * Montrée aux deux publics : au visiteur avant le bloc « Confiance », et au
 * salarié dans son espace. D'où le seul réglage exposé — la vitrine porte ses
 * propres gouttières, l'espace hérite de celle de son conteneur.
 *
 * Rien à cliquer ici que la fiche du partenaire : la tuile est le lien, et il
 * n'y en a qu'un, parce qu'un bouton « Voir la fiche » posé à côté d'une tuile
 * qui mène au même endroit se lit comme deux destinations.
 */
export default function MinisterPickSection({
  gutter = "container",
}: {
  /** "page" sur la page d'accueil, dont les écrans vont de bord à bord. */
  gutter?: "container" | "page";
}) {
  const chosen = ministerPick();

  // Sélection vide : pas de titre au-dessus de rien.
  if (!chosen) return null;
  const { pick, partner } = chosen;

  return (
    <Screen id="coup-de-coeur" gutter={gutter} gap={9}>
      {/* Les mots à gauche, le lieu à droite — la même répartition que
          « Fonctionnement », pour que les deux écrans se suivent sans que l'œil
          ait à se replacer. */}
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,52%)] lg:gap-[56px]">
        <div>
          <Chip tone="official" className="inline-block">
            Choisi par le Ministère
          </Chip>

          <Display level={2} accent="du Ministre." className="mt-6">
            Coup de cœur
          </Display>

          {/* La phrase du Ministre, dans la serif de la marque et à la taille
              d'une citation : c'est le contenu de la section, pas sa légende. */}
          <blockquote className="text-cp-fg mt-12 font-serif text-[clamp(24px,2.6vw,36px)] leading-[1.25] italic">
            «&nbsp;{pick.note}&nbsp;»
          </blockquote>
        </div>

        <PartnerTile
          partner={partner}
          /* Paysage, et large : la tuile occupe la moitié de l'écran. Un
             portrait à cette largeur dépassait la fenêtre en hauteur, et une
             tuile étroite laissait un couloir blanc entre la citation et
             elle. */
          photoClassName="aspect-[3/2] min-h-[200px]"
          nameClassName="text-[22px]"
        >
          <div className="flex flex-1 flex-wrap items-baseline gap-x-4 gap-y-2 p-5">
            <Micro tone="accent">
              {partnerCategoryLabel(partner.categoryId)}
            </Micro>
            <Arrow className="text-cp-accent ms-auto" />
            <address className="text-cp-muted basis-full text-[13px] leading-[1.5] not-italic">
              {partner.address}
              <br />
              {partner.postcode} {partner.city}
            </address>
          </div>
        </PartnerTile>
      </div>
    </Screen>
  );
}
