import ConfidenceSection from "./ConfidenceSection";
import HeroSection from "./HeroSection";
import HowItWorksSection from "./HowItWorksSection";
import MinisterPickSection from "@/components/minister/MinisterPickSection";
import SectionNav from "@/components/layout/SectionNav";
import PageMain from "@/components/ui/PageMain";

/**
 * The landing page: the sections in reading order, nothing else. Signing in
 * and registering are reached from TopBar, which owns the auth dialog.
 *
 * `overflow-x-clip` rather than `overflow-hidden`: `hidden` makes an element a
 * scroll container, and the sections' `scroll-snap-align` then binds to this
 * <main> — which has no snap type — instead of the document, silently
 * disabling the section snapping. `clip` crops the same way without creating a
 * scroll container.
 */
export default function LandingPage() {
  return (
    <PageMain snap width="full">
      <HeroSection />
      <HowItWorksSection />
      {/* Avant « Confiance » : le visiteur voit à quoi ressemble le réseau
          avant qu'on lui parle de la mécanique du paiement. Gouttières de
          page, comme les autres écrans de la vitrine. */}
      <MinisterPickSection gutter="page" />
      <ConfidenceSection />

      <SectionNav />
    </PageMain>
  );
}
