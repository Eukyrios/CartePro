import StepsDeck from "./StepsDeck";
import Display from "@/components/ui/Display";
import Screen from "@/components/ui/Screen";

/** The three steps, in the order the original lists them. */
const STEPS = [
  {
    index: "01",
    title: "Votre employeur crédite",
    body: "Le montant disponible apparaît directement dans votre espace personnel.",
  },
  {
    index: "02",
    title: "Vous choisissez",
    body: "Explorez les partenaires et trouvez où utiliser votre crédit.",
  },
  {
    index: "03",
    title: "Vous utilisez",
    body: "Un QR temporaire permet de simuler la validation de votre dépense.",
  },
] as const;

/**
 * "Fonctionnement". The steps are a swipeable pile of cards, so the heading
 * and the deck sit side by side from lg: stacked, the two together overflow a
 * laptop viewport, and this section snap-scrolls as one screen.
 */
export default function HowItWorksSection() {
  return (
    <Screen id="fonctionnement" gutter="page" gap={9}>
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-12 lg:grid-cols-[1fr_minmax(0,720px)] lg:gap-[60px]">
        <Display level={2} scale="page" accent="Rien de plus.">
          Trois gestes.
        </Display>

        <StepsDeck steps={STEPS} />
      </div>
    </Screen>
  );
}
