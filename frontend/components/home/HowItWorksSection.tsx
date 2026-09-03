import StepsDeck from "./StepsDeck";

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
    <section
      id="fonctionnement"
      className="border-cp-border grid min-h-screen snap-start content-center gap-9 border-b px-6 py-16 lg:px-[7vw] lg:py-[110px]"
    >
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-12 lg:grid-cols-[1fr_minmax(0,720px)] lg:gap-[60px]">
        <h2 className="my-0 text-[clamp(44px,4.8vw,78px)] leading-[0.82] font-black tracking-[-0.08em]">
          Trois gestes.
          <br />
          <em className="text-cp-accent font-serif font-normal">
            Rien de plus.
          </em>
        </h2>

        <StepsDeck steps={STEPS} />
      </div>
    </section>
  );
}
