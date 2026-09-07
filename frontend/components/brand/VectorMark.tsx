/**
 * Le monogramme CartePro, en ligne.
 *
 * Une carte de paiement — rectangle aux coins arrondis — dans laquelle sont
 * évidés un C et une puce. Trois sous-chemins dans un seul `path`, peints
 * d'une seule encre : `fillRule="evenodd"` creuse le C et la puce au lieu de
 * les peindre, plutôt que de superposer une forme de la couleur du fond, qui
 * n'aurait tenu que sur un fond connu.
 *
 * En ligne plutôt qu'en `<img>` pour qu'il hérite de `currentColor` : le
 * monogramme de la carte de crédit doit s'imprimer dans l'encre que le salarié
 * a choisie, et une image ne peut être que la couleur dans laquelle elle a été
 * enregistrée. C'est la même raison qui permet à la barre haute et au pied de
 * page de prendre la leur dans une classe de texte au lieu d'embarquer un
 * fichier par encre.
 *
 * Géométrie : carte 112x80, coins r 13 ; C centré en (41,40), rayons 27 et
 * 12,5, ouverture de 100° à droite ; puce 20x18 posée en (80,31), r 3. Le
 * `viewBox` est calé sur le tracé, sans marge, pour que le monogramme remplisse
 * sa boîte. Les mêmes coordonnées vivent dans `public/logo/mark-purple.svg`,
 * `public/logo/tile-purple.svg` et `app/icon.svg` : tenues à la main, elles se
 * retouchent ensemble.
 */
export default function VectorMark({
  className = "h-9 w-auto",
  decorative = false,
}: {
  /** La taille, et la couleur : le monogramme prend l'encre héritée. */
  className?: string;
  /**
   * À vrai, le monogramme est retiré aux technologies d'assistance. C'est ce
   * que fait `Logotype`, où le nom est déjà écrit à côté : sans cela, un
   * lecteur d'écran annoncerait « CartePro CartePro ».
   */
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 112 80"
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": "CartePro" })}
      fill="currentColor"
      fillRule="evenodd"
      className={className}
    >
      <path
        d="M13 0 H99 A13 13 0 0 1 112 13 V67 A13 13 0 0 1 99 80 H13 A13 13 0 0 1 0 67 V13 A13 13 0 0 1 13 0 Z
           M58.36 19.32 A27 27 0 1 0 58.36 60.68 L49.03 49.57 A12.5 12.5 0 1 1 49.03 30.43 Z
           M83 31 H97 A3 3 0 0 1 100 34 V46 A3 3 0 0 1 97 49 H83 A3 3 0 0 1 80 46 V34 A3 3 0 0 1 83 31 Z"
      />
    </svg>
  );
}
