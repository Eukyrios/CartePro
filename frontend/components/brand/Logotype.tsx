import { WordMark } from "./Marks";

/**
 * Le logotype CartePro : le nom, et rien d'autre.
 *
 * Pas de pictogramme. Trois marques dessinées ont été essayées devant la barre
 * haute — un C évidé dans une carte, la même en contour, la carte et ses ondes
 * — et aucune ne tenait à côté du nom sans l'encombrer. Le nom seul est ce que
 * font Stripe ou Klarna, et il a trois propriétés qu'aucun pictogramme n'avait
 * ici : il ne rétrécit jamais mal, il dit le produit sans qu'on l'apprenne, et
 * il suit `brand.name` — renommer le produit dans `backend/theme.json` renomme
 * le logotype, sans qu'on redessine une lettre.
 *
 * Ce composant reste, plutôt que d'appeler `WordMark` partout : c'est lui qui
 * définit ce qu'est *le logotype*, et l'endroit où un pictogramme reviendrait
 * s'il revenait un jour. Il ne tient plus qu'une chose, et c'est l'information.
 *
 * La taille se règle par `text-*`, comme avant, ce qui laisse la carte de
 * crédit mesurer le logotype en `cqw` sans connaître un seul pixel.
 *
 * L'initiale seule, pour les carrés de 16 px où le nom ne tient pas, vit dans
 * `app/icon.svg` et `public/logo/tile-white.svg`.
 */
export default function Logotype({
  className = "",
  name,
  style,
}: {
  /** La taille — `text-*` — et l'encre. */
  className?: string;
  /** Le nom à composer. Par défaut celui de la marque livrée. */
  name?: string;
  /** Pour une encre qui n'est pas connue à la compilation, comme celle de la carte. */
  style?: React.CSSProperties;
}) {
  return <WordMark name={name} style={style} className={className} />;
}
