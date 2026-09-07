"use client";

import Image from "next/image";
import { useTheme } from "@/components/theme/ThemeProvider";
import Logotype from "./Logotype";

/**
 * Le logotype CartePro, tel que le châssis l'emploie.
 *
 * Deux sources possibles, dans cet ordre. Si `backend/theme.json` donne un
 * chemin d'image — par exemple `/logo/wordmark-purple.svg` — c'est elle qui
 * s'affiche : c'est ainsi qu'on change le logotype sans toucher au code, en
 * posant un fichier dans `frontend/public` et en pointant le thème dessus.
 * Sinon c'est le logotype composé : le nom en Archivo, qui prend la couleur
 * d'accent et suit donc le thème sans qu'on ait à fournir deux fichiers. C'est
 * le cas par défaut, et le meilleur des deux — un texte se recolore, une image
 * non.
 *
 * Le nom vient de `brand.name`, jamais d'une constante d'ici : renommer le
 * produit dans le thème renomme le logotype, et `WordMark` pose la graisse sur
 * la capitale intérieure du nom qu'on lui donne.
 *
 * `variant="white"` est pour le pied de page, presque noir dans les deux
 * thèmes : le thème peut y poser une image à part, faute de quoi le logotype
 * passe en blanc.
 *
 * La taille se donne en corps de texte — `className="text-[25px]"`.
 *
 * `unoptimized` : l'optimiseur d'images de Next refuse les SVG sans qu'on lui
 * ouvre les SVG distants, et un logotype est un SVG.
 */
export default function BrandLogo({
  variant = "auto",
  className = "text-[24px]",
}: {
  /** "auto" prend l'accent, qui suit le thème ; "white" fixe le blanc. */
  variant?: "auto" | "white";
  /** La taille du logotype, donnée en corps de texte, et ce qui l'entoure. */
  className?: string;
}) {
  const { brand } = useTheme();
  const source = variant === "white" ? brand.logoWhite : brand.logo;
  const nom = brand.name || "CartePro";

  if (source) {
    return (
      <Image
        src={source}
        alt={nom}
        width={160}
        height={36}
        unoptimized
        /* 0,71em : la hauteur des lettres du logotype vectorisé, débord des
           rondes compris — 710 unités sur les 1000 du cadratin d'Archivo. Une
           image posée par le thème s'aligne donc sur le logotype composé au
           lieu d'imposer sa propre taille. */
        className={`h-[0.71em] w-auto ${className}`}
      />
    );
  }

  const ink = variant === "white" ? "text-white" : "text-cp-accent";
  return <Logotype name={nom} className={`${ink} ${className}`} />;
}
