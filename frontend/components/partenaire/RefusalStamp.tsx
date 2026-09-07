import BlueprintFrame from "@/components/ui/BlueprintFrame";
import Micro from "@/components/ui/Micro";

/**
 * Le dossier refusé, dessiné : un cadre technique, une pièce, un tampon.
 *
 * Purement décoratif — `aria-hidden` de bout en bout, parce qu'un lecteur
 * d'écran a déjà la décision en texte à gauche et n'a rien à faire d'un tampon.
 * Il est là pour que l'écran ait un poids visuel : une page administrative
 * n'est pas une page vide avec un encadré rouge, et la moitié droite de
 * l'écran, laissée blanche, se lisait comme un rendu inachevé.
 *
 * Tout est composé avec les outils du dépôt : la grille technique de
 * `BlueprintFrame`, les hachures de `globals.css`, l'encre et l'ochre de la
 * palette. Aucune image, aucune police de plus — le motif se redessine à
 * n'importe quelle taille et suit le thème.
 */
export default function RefusalStamp() {
  return (
    <div aria-hidden="true" className="pointer-events-none select-none">
      <BlueprintFrame pitch="fine" className="aspect-[4/5] max-h-[62vh] w-full">
        {/* La pièce du dossier : une feuille, penchée, avec ses lignes de
          texte suggérées et sa moitié basse hachurée — la partie qu'on ne
          remplira pas. */}
        <div className="relative w-[62%] rotate-[-3deg]">
          <div className="border-cp-border bg-cp-page relative aspect-[3/4] border shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)]">
            <div className="flex h-full flex-col p-[9%]">
              <Micro tone="official" className="block">
                Administration
              </Micro>
              <div className="border-t-cp-fg mt-[6%] border-t-2 pt-[6%]">
                {/* Des lignes, pas du texte : c'est un dessin de document. */}
                {[92, 78, 86, 64].map((largeur) => (
                  <span
                    key={largeur}
                    className="bg-cp-border mb-[5%] block h-[3px]"
                    style={{ width: `${largeur}%` }}
                  />
                ))}
              </div>
              <div className="hatched border-cp-border mt-auto h-[38%] border-t" />
            </div>
          </div>

          {/* Le tampon, en travers de la pièce. Double filet, capitales
            espacées, et l'encre de refus de la palette. */}
          <div className="absolute inset-0 grid place-items-center">
            <div className="border-fg-danger text-fg-danger rotate-[-14deg] border-[3px] px-[7%] py-[3%] opacity-90">
              <span className="block border-y border-current px-1 py-[2px] text-center text-[clamp(15px,2.6vw,26px)] leading-none font-black tracking-[0.18em] uppercase">
                Refusé
              </span>
            </div>
          </div>
        </div>
      </BlueprintFrame>
    </div>
  );
}
