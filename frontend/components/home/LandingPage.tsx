import ConfidenceSection from "./ConfidenceSection";
import HeroSection from "./HeroSection";
import HowItWorksSection from "./HowItWorksSection";
import SectionNav from "./SectionNav";

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
    <main className="snap-sections flex-1 overflow-x-clip">
      <HeroSection />
      <HowItWorksSection />
      <ConfidenceSection />

      <SectionNav />
    </main>
  );
}
