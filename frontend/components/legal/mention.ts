/**
 * La mention de démonstrateur, dans ses mots exacts.
 *
 * Une seule constante, et c'est le point : la mention a été demandée « sur
 * toutes les pages publiques, les pages d'erreur et dans les e-mails ». Une
 * phrase recopiée à la main dans huit endroits finit par exister en huit
 * versions, dont sept qui ne sont plus celle qui a été validée. Ici elle est
 * écrite une fois ; les écrans, les pages d'erreur, le manifeste, les balises
 * de partage et l'export CSV la lisent.
 *
 * Le texte est reproduit au caractère près, ponctuation finale comprise. Ne
 * pas le reformuler sans l'accord écrit du donneur d'ordre : c'est une mention
 * de conformité, pas une accroche.
 *
 * Le pendant côté serveur est `backend/mention.py`, qui porte la même phrase
 * pour l'export CSV — le back ne peut pas importer un module TypeScript, donc
 * la phrase est dupliquée là et nulle part ailleurs, avec un test qui compare
 * les deux.
 */
export const MENTION_DEMONSTRATEUR =
  "Démonstrateur technique, ne constitue pas un service public en exploitation.";
