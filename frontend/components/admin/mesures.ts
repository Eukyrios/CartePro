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
 * **Accepter ou refuser un dossier ne s'y fait pas** : cela se décide sur
 * l'écran du dossier, où les pièces se lisent avant qu'on tranche. Offrir le
 * même geste aux deux endroits ferait deux chemins vers la même décision, et
 * l'un des deux se prendrait sans avoir rien lu.
 *
 * La clôture, elle, vaut des deux côtés — et elle n'est pas un refus. Le refus
 * est une décision sur un dossier : il se motive, son titulaire le lit, et il
 * se réexamine. La clôture est la fin du compte — l'établissement a fermé,
 * changé de main, quitté le dispositif — et elle ne se réexamine pas. Les
 * confondre ferait porter à un commerce qui ferme la mention d'un dossier
 * écarté.
 */
export function gestesPour(compte: Compte): (GesteCompte | "retablir")[] {
  if (compte.genre === "partenaire") {
    if (compte.statut === "validé") return ["suspendre", "cloturer"];
    if (compte.statut === "suspendu") return ["retablir", "cloturer"];
    // Clôturé : plus rien. En attente ou refusé : cela se décide sur le dossier.
    return [];
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

/** Le même fait, en libellé de colonne : « Solde », « Total encaissé ». */
export function libelleDuChiffre(compte: Compte): string {
  return compte.genre === "partenaire" ? "Total encaissé" : "Solde";
}

/**
 * Ce qu'un geste emporte, dit pour le genre de compte auquel il s'applique.
 *
 * `GESTES[…].portee` est écrit du point de vue d'un salarié, parce que c'est de
 * là que ces gestes viennent. Suspendre un établissement n'emporte pas la même
 * chose : il n'a pas de solde qui lui reste, il a un encaissement qui s'arrête.
 * Servir la phrase du salarié à un partenaire lui promettrait un solde qu'il
 * n'a pas.
 */
export function porteeDe(
  compte: Compte,
  geste: GesteCompte | "retablir",
): string {
  if (compte.genre === "partenaire" && geste === "suspendre") {
    return (
      "L’établissement sort du réseau : il ne peut plus encaisser, et son " +
      "compte ne se connecte plus. Ses recettes passées restent lisibles, et " +
      "la mesure se lève."
    );
  }
  if (compte.genre === "partenaire" && geste === "cloturer") {
    return (
      "Définitif, et ce n’est pas un refus : le dossier écarté se réexamine, " +
      "un établissement clôturé ne rouvre pas — il redépose. Rien n’est " +
      "supprimé : ses encaissements restent, et la décision garde son motif."
    );
  }
  return GESTES[geste].portee;
}
