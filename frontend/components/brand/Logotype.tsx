import VectorMark from "./VectorMark";
import { WordMark } from "./Marks";

/**
 * Le logotype CartePro assemblé : le monogramme de carte, puis le nom.
 *
 * Tout est en em, et la seule chose à régler est la taille du texte — le
 * monogramme fait 1,52em de haut, l'écart 0,36em. C'est ce qui permet au même
 * composant de servir la barre haute (`text-[25px]`), le pied de page
 * (`text-[27px]`) et la carte de crédit, qui mesure tout en `cqw` et ne
 * connaît donc aucune taille en pixels. Une hauteur en pixels, elle, aurait
 * obligé chaque appelant à recalculer le corps du texte.
 *
 * Une seule encre, héritée : `currentColor` pour le monogramme, la couleur de
 * texte pour le nom. Le contraste du logotype est donc celui de la classe
 * posée par l'appelant, et il n'y a rien à vérifier de plus que pour du texte.
 */
export default function Logotype({
  className = "",
  name,
  style,
}: {
  /** La taille — `text-*` — et l'encre. Tout le reste en découle. */
  className?: string;
  /** Le nom à composer. Par défaut celui de la marque livrée. */
  name?: string;
  /** Pour une encre qui n'est pas connue à la compilation, comme celle de la carte. */
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={style}
      className={`inline-flex items-center gap-[0.36em] ${className}`}
    >
      <VectorMark decorative className="h-[1.52em] w-auto" />
      <WordMark name={name} />
    </span>
  );
}
