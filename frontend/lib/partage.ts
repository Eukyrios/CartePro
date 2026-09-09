/**
 * Une requête à la fois pour une même clé, tant qu'elle est en vol.
 *
 * Le problème qu'elle règle est visible sur l'espace d'administration : trois
 * composants frères — le tableau des comptes, leur catalogue, et la liste de
 * l'écran des abondements — appellent chacun `/api/admin/comptes` au montage.
 * Trois requêtes partent en même temps, trois fois la même liste de cinquante
 * et un comptes avec tout leur historique de mesures revient, et deux sont
 * jetées. Idem pour le référentiel des catégories, demandé par tout écran qui
 * affiche un secteur.
 *
 * **Ce n'est pas un cache**, et c'est délibéré : rien n'est gardé après la
 * réponse. Une promesse déjà en vol est partagée, puis oubliée dès qu'elle
 * retombe. Un cache mémoriserait la réponse et ferait mentir l'écran après une
 * mesure — c'est exactement ce que fait `onMesure`, qui relit pour voir le
 * nouvel état. Ici, relire relit vraiment ; c'est seulement la rafale de
 * montage qui est ramenée à une requête.
 *
 * L'échec est partagé lui aussi, ce qui est la bonne réponse : si l'appel
 * échoue, les trois appelants doivent le savoir, et non deux voir une erreur
 * pendant que le troisième attend indéfiniment.
 */
const enVol = new Map<string, Promise<unknown>>();

export function partage<T>(
  cle: string,
  produire: () => Promise<T>,
): Promise<T> {
  const deja = enVol.get(cle);
  if (deja) return deja as Promise<T>;

  const promesse = produire().finally(() => {
    // Retiré dans tous les cas, succès comme échec : sans cela une erreur
    // réseau passagère se rejouerait à chaque appel jusqu'au rechargement.
    enVol.delete(cle);
  });
  enVol.set(cle, promesse);
  return promesse;
}
