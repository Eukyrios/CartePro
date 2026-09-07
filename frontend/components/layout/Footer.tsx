import Link from "next/link";
import {
  Footer as FlowbiteFooter,
  FooterCopyright,
  FooterLink,
  FooterLinkGroup,
} from "flowbite-react";
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
          <p className="text-white/70 lg:max-w-[180px]">
            Le crédit salarié, pensé comme un produit simple.
          </p>
          <FooterLinkGroup className="text-[11px] lg:shrink-0">
            {FOOTER_LINKS.map((link) => (
              <FooterLink
                key={link.label}
                /* `as={Link}` pour que /conditions se charge sans recharger la
                   page, comme partout ailleurs — Flowbite rend une ancre nue
                   sinon. Même traitement que NavbarBrand dans TopBar. */
                as={Link}
                href={link.href}
                className="me-4 text-white/70 hover:text-white"
              >
                {link.label}
              </FooterLink>
            ))}
          </FooterLinkGroup>
          {/* La mention de démonstrateur ferme le bloc, après l'accroche et les
              liens : le pied de page est monté une fois dans le gabarit racine,
              donc cette ligne est le seul endroit d'où elle atteint réellement
              « toutes les pages ». Elle est en clair et non en micro-typo
              capitale — une mention qu'on doit plisser les yeux pour lire
              n'informe personne. */}
          <p className="font-semibold lg:max-w-[280px]">
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
