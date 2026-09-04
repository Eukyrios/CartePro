/**
 * Accent- and case-insensitive folding, so "Correze" finds "Corrèze" and
 * "creperie" finds "Crêperie".
 *
 * It was defined twice, byte for byte, in the partner data and in the history
 * screen — both module-private, so neither could reuse the other. Here it is
 * once, in the layer both of them already depend on.
 */
export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
