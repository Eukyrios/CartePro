import Link from "next/link";
import { Footer as FlowbiteFooter, FooterCopyright } from "flowbite-react";
import BrandLogo from "@/components/brand/BrandLogo";
import { MENTION_DEMONSTRATEUR } from "@/components/legal/mention";
import { MICRO } from "@/components/ui/surfaces";

/**
 * Les conditions d'utilisation ont maintenant leur page ; « Contact » attend
 * encore la sienne, et son `#` reste donc un aveu plutôt qu'un lien mort
 * déguisé en adresse.
 */
const FOOTER_LINKS = [
  { label: "Contact", href: "#" },
  { label: "Conditions d'utilisation", href: "/conditions" },
];

/**
 * Bottom bar shown on every page, mounted once in the root layout. Black in
 * both themes, as in the maquette, where it closes the page rather than being
 * a themed surface.
 *
 * The brand is a plain link rather than Flowbite's FooterBrand: that component
 * requires an image `src` and always renders an <img>, while this brand is the
 * inline logo glyph.
 */
export default function Footer() {
  return (
    <FlowbiteFooter
      container={false}
      /* 115px, la moitié de la hauteur d'origine. Le pied appartient au
         dernier écran — voir Screen, `height="screen-minus-footer"` — donc
         chaque pixel qu'il prend est un pixel de moins pour le contenu, et
         230px en prenaient le quart d'une fenêtre de 900. La marge verticale
         suit : à 42px elle aurait dépassé à elle seule la place restante. */
      className="bg-cp-ink dark:bg-cp-ink mt-auto min-h-[115px] items-end rounded-none px-6 py-7 text-white shadow-none lg:h-[115px] lg:px-[7vw] lg:py-5"
    >
      {/* Trois tiers égaux mettaient l'accroche, les liens et la mention à
         l'étroit dans 33% de la largeur dès qu'ils passent côte à côte :
         la colonne du milieu prend donc ce que le logotype et le
         copyright — tous deux étroits — lui laissent. */}
      <div className="grid w-full gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-end lg:gap-8">
        <Link href="/" className="inline-flex">
          {/* The footer is near-black in both themes, so the white mark is
              pinned rather than following the theme. */}
          <BrandLogo variant="white" className="text-[27px]" />
        </Link>

        {/* Empilé sur mobile, aligné côte à côte dès `lg` — l'écart est porté
            par `gap` et non par des marges, pour qu'il ne reste pas une marge
            basse orpheline quand la colonne devient une ligne. */}
        <div className="flex max-w-[250px] flex-col gap-3 text-[11px] leading-[1.5] lg:max-w-none lg:flex-row lg:items-end lg:gap-8">
          {/* Des `Link` nus, et non le `FooterLink` de Flowbite.
              
              Son thème remplaçait la classe passée au lieu de s'y ajouter : le
              rendu ne portait que `hover:underline`, ni la couleur ni l'écart
              demandés ici. On ne s'en apercevait pas parce que le texte hérite
              d'un blanc voisin — jusqu'à ce qu'il faille agrandir la cible
              tactile, où la marge intérieure a disparu sans bruit.
              
              `inline-block py-1.5` : le libellé fait 17 px de haut, sous les
              24 px minimum du WCAG 2.5.8. Le pied de page est ce qu'on vise au
              pouce, donc c'est là que la cible compte le plus. */}
          <ul className="flex flex-wrap items-center gap-x-6 text-[11px] lg:shrink-0">
            {FOOTER_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="inline-block py-1.5 text-white/70 hover:text-white hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {/* La mention de démonstrateur ferme le bloc : le pied de page est
              monté une fois dans le gabarit racine, donc cette ligne est le
              seul endroit d'où elle atteint réellement « toutes les pages ».
              Elle est en clair et non en micro-typo capitale — une mention
              qu'on doit plisser les yeux pour lire n'informe personne.

              D'un seul tenant dès `lg`, et c'est ce qui a coûté sa place à
              l'accroche « Le crédit salarié, pensé comme un produit simple. »
              qui la précédait. Mesuré à 1024 px, la plus étroite des largeurs
              où le pied passe en ligne : le logotype, l'accroche, les liens,
              la mention insécable et le copyright réclamaient ensemble
              ~1030 px pour ~880 px disponibles, et la rangée débordait des
              115 px du pied — la mention s'y retrouvait rognée, donc
              illisible. Entre une accroche décorative et une mention de
              conformité qui doit se lire d'une traite, c'est l'accroche qui
              part.

              En dessous de `lg` la coupure revient, et il le faut : le bloc
              s'y empile, le pied n'a plus de hauteur fixe, et 382 px de texte
              insécable déborderaient d'une fenêtre de téléphone. */}
          <p className="font-semibold lg:whitespace-nowrap">
            {MENTION_DEMONSTRATEUR}
          </p>
        </div>

        {/* « FRANCE » signait le pied de page comme si l'État en était
            l'auteur. La marque signe ce qu'elle a produit. */}
        <FooterCopyright
          by="CartePro"
          year={2026}
          className={`flex flex-col leading-[1.6] text-white lg:items-end lg:justify-self-end ${MICRO}`}
        />
      </div>
    </FlowbiteFooter>
  );
}
