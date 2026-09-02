import Image from "next/image";

/**
 * TODO: placeholder. This is the landing page and should present the project;
 * only the decorative background exists so far. The background colour and the
 * page chrome come from the root layout.
 */
export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-24">
      {/* Scoped to this main (hence `relative` above) and clipped, so the
          decoration cannot spill over the top or bottom bars. */}
      <div className="absolute inset-0 size-full overflow-hidden">
        <div className="relative h-full w-full select-none">
          <Image
            className="absolute right-0 min-w-dvh dark:hidden"
            alt="Motif clair"
            src="/pattern-light.svg"
            width="803"
            height="774"
          />
          <Image
            className="absolute right-0 hidden min-w-dvh dark:block"
            alt="Motif sombre"
            src="/pattern-dark.svg"
            width="803"
            height="775"
          />
        </div>
      </div>
    </main>
  );
}
