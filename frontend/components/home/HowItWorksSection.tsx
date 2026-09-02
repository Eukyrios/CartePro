import { Table, TableBody, TableCell, TableRow } from "flowbite-react";
import { Arrow, Eyebrow, SectionRail } from "./Marks";

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
 * "Fonctionnement". The original draws the steps as a bordered row grid, which
 * is what a table already is, so this uses Flowbite's Table with its padding
 * and rounding stripped back to the design's flat rules.
 */
export default function HowItWorksSection() {
  return (
    <section
      id="fonctionnement"
      className="border-cp-border grid min-h-screen snap-start content-center gap-9 border-b px-6 py-16 lg:grid-cols-[100px_1fr] lg:gap-[65px] lg:px-[7vw] lg:py-[110px]"
    >
      <SectionRail index="01" />

      <div className="max-w-[1150px]">
        <Eyebrow>LE PARCOURS</Eyebrow>
        <h2 className="mt-[22px] mb-12 text-[clamp(58px,8vw,120px)] leading-[0.82] font-black tracking-[-0.08em] lg:mb-[70px]">
          Trois gestes.
          <br />
          <em className="text-cp-accent font-serif font-normal">
            Rien de plus.
          </em>
        </h2>

        {/* The stock Table paints a rounded drop-shadow panel behind the rows;
            this design has flat rules instead, so that layer is hidden. */}
        <Table
          theme={{ root: { shadow: "hidden" } }}
          className="border-cp-fg text-cp-fg border-t-2"
        >
          <TableBody>
            {STEPS.map((step) => (
              <TableRow
                key={step.index}
                className="border-cp-border group border-b bg-transparent transition-[padding] hover:bg-transparent"
              >
                <TableCell className="text-cp-accent w-[70px] px-0 py-7 align-middle text-[10px] font-black">
                  {step.index}
                </TableCell>
                <TableCell className="py-7 pr-0 pl-[30px] align-middle">
                  <h3 className="text-cp-fg mb-[7px] text-xl tracking-[-0.03em]">
                    {step.title}
                  </h3>
                  <p className="text-cp-muted m-0 max-w-[600px] text-xs leading-[1.5]">
                    {step.body}
                  </p>
                </TableCell>
                <TableCell className="text-cp-accent w-[60px] px-0 py-7 text-right align-middle">
                  <Arrow className="ml-0" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
