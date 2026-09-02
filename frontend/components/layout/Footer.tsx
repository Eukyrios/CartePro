import Link from "next/link";
import {
  Footer as FlowbiteFooter,
  FooterCopyright,
  FooterLink,
  FooterLinkGroup,
} from "flowbite-react";
import { LogoMark } from "@/components/home/Marks";

/**
 * TODO: the links are placeholders — point them at the real contact and legal
 * pages once those exist.
 */
const FOOTER_LINKS = [
  { label: "Contact", href: "#" },
  { label: "Conditions d'utilisation", href: "#" },
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
      className="bg-cp-ink mt-auto min-h-[230px] items-end rounded-none px-6 py-10 text-white shadow-none lg:h-[230px] lg:px-[7vw] lg:py-[42px]"
    >
      <div className="grid w-full gap-8 lg:grid-cols-3 lg:items-end lg:gap-0">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[18px] font-black tracking-[-0.07em] text-white"
        >
          <LogoMark className="size-7 bg-white" barClassName="bg-cp-ink" />
          <span>CARTEPRO</span>
        </Link>

        <div className="max-w-[250px] text-[11px] leading-[1.5]">
          <p className="mb-3">
            Le crédit salarié, pensé comme un produit simple.
          </p>
          <FooterLinkGroup className="text-[11px]">
            {FOOTER_LINKS.map((link) => (
              <FooterLink
                key={link.label}
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
          className="flex flex-col text-[9px] leading-[1.6] tracking-[0.1em] text-white lg:items-end lg:justify-self-end"
        />
      </div>
    </FlowbiteFooter>
  );
}
