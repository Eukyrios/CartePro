import type { Compte, GesteCompte } from "./api";

/**
 * Le vocabulaire des mesures : ce qu'un geste s'appelle, ce qu'il fait, et
 * lesquels un compte accepte.
 *
 * Écrit ici et non dans l'écran des comptes parce que trois écrans le
 * demandent maintenant : le tableau des comptes, la bande d'un partenaire
 * au-dessus de ses recettes, et celle d'un salarié au-dessus de ses dépenses.
 * Recopié, l'un des trois aurait fini par proposer « clôturer » à un
 * établissement, ou par oublier de dire ce que la mesure emporte.
 */

/** Le geste, et tout ce que l'écran doit en dire avant de le prendre. */
export const GESTES: Record<
  GesteCompte | "retablir",
  {
    titre: string;
    verbe: string;
    /** Ce que la mesure fait, en une phrase, au-dessus du motif. */
    portee: string;
    ton: "solid" | "danger";
    /** Vrai pour ce dont on ne revient pas. */
    definitif?: boolean;
  }
> = {
  retablir: {
    titre: "Rétablir le conventionnement",
    verbe: "Rétablir",
    portee:
      "L'établissement revient dans le réseau et peut encaisser de nouveau. " +
      "La levée s'écrit dans ses décisions, avec son motif.",
    ton: "solid",
  },
  suspendre: {
    titre: "Suspendre le compte",
    verbe: "Suspendre",
    portee:
      "Le titulaire ne pourra plus se connecter. Son solde lui reste, ses paiements passés restent lisibles, et la mesure se lève.",
    ton: "solid",
  },
  activer: {
    titre: "Lever la mesure",
    verbe: "Réactiver",
    portee:
      "Le titulaire retrouve l’accès à son compte et à son solde. La mesure levée reste dans l’historique : rien n’est effacé.",
    ton: "solid",
  },
  cloturer: {
    titre: "Clôturer le compte",
    verbe: "Clôturer",
    portee:
      "Définitif. Le compte ne se rouvre pas — il faudrait en créer un autre. Rien n’est supprimé : les abondements reçus et les paiements faits restent, et le solde reste calculable.",
    ton: "danger",
    definitif: true,
  },
};

/**
 * Les gestes qu'un compte accepte, selon son genre et son état.
 *
 * Un partenaire n'offre ici que la suspension et son inverse. Accepter ou
 * refuser un dossier ne s'y fait **pas** : cela se décide sur l'écran du
 * dossier, où les pièces se lisent avant qu'on tranche. Offrir le même geste
 * aux deux endroits ferait deux chemins vers la même décision, et l'un des
 * deux se prendrait sans avoir rien lu.
 *
 * D'où l'absence de « clôturer » côté partenaire : un établissement n'a pas de
 * solde à solder, et sa mise à l'écart est un refus motivé, pas une clôture.
 */
export function gestesPour(compte: Compte): (GesteCompte | "retablir")[] {
  if (compte.genre === "partenaire") {
    if (compte.statut === "suspendu") return ["retablir"];
    if (compte.statut === "validé") return ["suspendre"];
    return []; // en attente ou refusé : cela se décide sur le dossier.
  }
  if (compte.statut === "actif") return ["suspendre", "cloturer"];
  if (compte.statut === "suspendu") return ["activer", "cloturer"];
  return []; // clôturé : plus rien, et la route le refuse aussi.
}

export function tonDuStatut(statut: string): "plain" | "official" | "muted" {
  if (statut === "actif" || statut === "validé") return "plain";
  if (statut === "suspendu" || statut === "en_attente") return "official";
  return "muted";
}

/** Les statuts des deux côtés, dits en français dans le tableau. */
export const LIBELLE_STATUT: Record<string, string> = {
  actif: "Actif",
  suspendu: "Suspendu",
  clôturé: "Clôturé",
  en_attente: "En attente",
  validé: "Conventionné",
  refusé: "Refusé",
};

/** Ce que le chiffre d'un compte veut dire : un salarié détient, un partenaire a reçu. */
export function sensDuChiffre(compte: Compte): string {
  return compte.genre === "partenaire" ? "encaissé" : "de solde";
}
