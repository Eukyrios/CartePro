/**
 * Le formatage des montants. Rien d'autre.
 *
 * Ce module tenait un registre entier dans le navigateur : solde, historique,
 * jetons de QR, refus, tout en `localStorage`. Il racontait sa propre histoire
 * à côté de la vraie — la carte affichait le solde du compte, l'historique en
 * dessous celui du stockage local, et les deux divergeaient dès le premier
 * paiement. Le solde vient du compte (`account/useBalance`), les mouvements de
 * `GET /api/transactions/me` (`espace/movements`), les jetons du serveur
 * (`espace/useQrToken`). Il ne reste ici que la mise en forme, qui n'est pas
 * une donnée.
 *
 * Le nom du fichier survit à son contenu : `formatEuros` est importé par six
 * écrans, et le renommer était un changement pour rien.
 */

/**
 * Des centimes vers une somme en euros, à la française.
 *
 * `Intl` s'en charge, y compris l'espace insécable étroite avant le symbole et
 * la virgule décimale. Les six appelants veulent la chaîne, interpolée dans une
 * phrase — d'où une fonction et non un composant.
 */
const EUROS = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEuros(cents: number): string {
  return EUROS.format(cents / 100);
}
