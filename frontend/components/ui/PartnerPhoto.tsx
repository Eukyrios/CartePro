import Image from "next/image";
import type { Partner } from "@/components/data/partners";

/**
 * A partner's photograph with their name laid over the bottom of it, shared by
 * the catalogue and the administration's selection.
 *
 * `shrink-0` and a min-height on the frame: in a tile whose height is set by
 * its row rather than by its own content, a flex parent would otherwise squash
 * the photo to fit — or, with no floor, flatten it in a narrow column. The
 * frame also clips, so a hover scale cannot spill past the border.
 *
 * alt="" on purpose: the name sits over the image as real text, so describing
 * the picture would only repeat it. `unoptimized` because the placeholders are
 * SVG, which the image optimiser refuses without being opened up to arbitrary
 * remote SVG — real photography can drop the flag.
 *
 * Sans image, un aplat neutre : le cadre, le voile et le nom restent, et la
 * tuile se lit comme les autres. Le scrim sert alors à porter le nom en blanc
 * sur un fond clair, ce qu'il faisait déjà pour une photographie claire.
 */
/**
 * La teinte d'une vignette sans image, tirée de l'identifiant de l'enseigne.
 *
 * Dans la bande froide des visuels générés — 205° à 275° — parce que c'est
 * celle que `public/partenaires` occupe déjà : une vignette dessinée en CSS doit
 * pouvoir voisiner avec une image sans que la grille se dédouble en deux
 * familles. Déterministe, donc la même enseigne garde sa teinte d'un rendu à
 * l'autre, et deux enseignes voisines ne l'ont pas la même.
 */
function teinteDe(id: string): number {
  let empreinte = 0;
  for (let n = 0; n < id.length; n += 1) {
    empreinte = (empreinte * 31 + id.charCodeAt(n)) % 997;
  }
  return 205 + (empreinte % 70);
}

export default function PartnerPhoto({
  partner,
  className = "aspect-[4/3] min-h-[150px]",
  nameClassName = "text-[17px]",
  withName = true,
}: {
  partner: Partner;
  className?: string;
  nameClassName?: string;
  /** False where the name is already a heading beside the photo. */
  withName?: boolean;
}) {
  return (
    <div className={`relative shrink-0 overflow-hidden ${className}`}>
      {partner.photo ? (
        <Image
          src={partner.photo}
          alt=""
          fill
          unoptimized
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        /* Pas de fichier, mais une vignette quand même : un dégradé tiré du
           slug, et l'initiale par-dessus.

           Tous les partenaires n'ont pas d'image. `migration_vignal.py` vide
           `image_partenaire` sur les enseignes archivées, et un établissement
           inscrit par le formulaire n'en a pas encore — la route rend alors une
           chaîne vide, que `next/image` refuse (elle fait retélécharger la page
           entière, l'avertissement le dit) et dont un chemin devinable comme
           `/partenaires/<slug>.svg` ferait un 404 et une image cassée.

           Dessinée en CSS, elle ne peut donc pas manquer, et deux enseignes
           voisines n'ont pas la même teinte : la bande froide est celle des
           visuels générés dans `public/partenaires`, pour que la grille se lise
           comme une seule famille. */
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(160deg, hsl(${teinteDe(partner.id)} 34% 28%), hsl(${teinteDe(partner.id) + 16} 30% 13%))`,
          }}
        >
          {/* L'initiale en SVG, et non en texte : le cadre va d'une vignette de
              320px à la moitié d'un écran, et une taille de police ne suit pas
              une boîte — `text-[28%]` se calcule sur la police héritée, ce qui
              donnait une lettre de trois pixels. Le `viewBox` fait ce travail
              tout seul. */}
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full font-sans"
            role="presentation"
          >
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="56"
              fontWeight="900"
              letterSpacing="-4"
              fill="rgba(255, 255, 255, 0.16)"
            >
              {partner.name.charAt(0).toUpperCase()}
            </text>
          </svg>
        </div>
      )}
      {/* Scrim: white on the artwork alone is not a contrast anyone can rely
          on, whatever the photograph turns out to be. Both it and the name go
          when the name is not laid over the picture. */}
      {withName && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
          />
          <h3
            className={`absolute inset-x-0 bottom-0 p-4 leading-[1.05] font-black tracking-[-0.03em] text-white ${nameClassName}`}
          >
            {partner.name}
          </h3>
        </>
      )}
    </div>
  );
}
