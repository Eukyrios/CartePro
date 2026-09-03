import { HR } from "flowbite-react";

/**
 * The one-sentence pitch between the hero and the numbered sections: a large
 * blue letter, the statement, and a rule closing the row on desktop.
 */
export default function StatementSection() {
  return (
    <section className="border-cp-border grid min-h-screen snap-start content-center items-center gap-6 border-b px-6 py-14 lg:grid-cols-[100px_1fr_22%] lg:gap-10 lg:px-[7vw] lg:py-[65px]">
      <div className="text-cp-accent text-[60px] leading-none font-black tracking-[-0.1em] lg:text-[90px]">
        A
      </div>

      <p className="m-0 max-w-[850px] text-[clamp(22px,3vw,38px)] leading-[1.08] tracking-[-0.045em]">
        Ticket Tout transforme une aide employeur en une expérience simple :{" "}
        <strong className="font-black">
          un solde clair, des choix libres, des partenaires identifiés.
        </strong>
      </p>

      <HR className="bg-cp-fg my-0 hidden h-px border-0 lg:block" />
    </section>
  );
}
