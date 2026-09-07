import Link from "next/link";
import {
  Footer as FlowbiteFooter,
  FooterCopyright,
  FooterLink,
  FooterLinkGroup,
} from "flowbite-react";
import BrandLogo from "@/components/brand/BrandLogo";
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
      className="bg-cp-ink dark:bg-cp-ink mt-auto min-h-[230px] items-end rounded-none px-6 py-10 text-white shadow-none lg:h-[230px] lg:px-[7vw] lg:py-[42px]"
    >
      <div className="grid w-full gap-8 lg:grid-cols-3 lg:items-end lg:gap-0">
        <Link href="/" className="inline-flex">
          {/* The footer is near-black in both themes, so the white mark is
              pinned rather than following the theme. */}
          <BrandLogo variant="white" className="h-[42px] w-auto" />
        </Link>

        <div className="max-w-[250px] text-[11px] leading-[1.5]">
          <p className="mb-3">
            Le crédit salarié, pensé comme un produit simple.
          </p>
          <FooterLinkGroup className="text-[11px]">
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
        </div>

        <FooterCopyright
          by="FRANCE"
          year={2026}
          className={`flex flex-col leading-[1.6] text-white lg:items-end lg:justify-self-end ${MICRO}`}
        />
      </div>
    </FlowbiteFooter>
  );
}
