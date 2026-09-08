"use client";

import { api } from "@/lib/api";

/**
 * Le seul endroit de l'espace d'administration qui parle au serveur.
 *
 * Même règle que `components/partenaire/api.ts` : les écrans appellent ces
 * fonctions et rien d'autre, aucun `fetch` dans un composant. Le jeton part
 * par `lib/api.ts`, et c'est lui qui décide de tout — chaque route porte
 * `@admin_required` côté serveur, donc appeler ces fonctions sans être
 * administrateur échoue quoi que fasse l'interface.
 */

/** Une décision d'instruction, telle que la table `decisions` la garde. */
export type Decision = {
  /** « accepté », « refusé », « suspendu », « réexamen demandé ». */
  sens: string;
  motif: string;
  /** ISO 8601. */
  at: string | null;
};

/**
 * Un dossier de partenaire vu par l'administration.
 *
 * Plus bavard que l'entrée du catalogue public : il porte l'email du contact,
 * le représentant, le SIREN et surtout l'historique des décisions avec leurs
 * motifs. Ces champs ne sortent que par `/api/admin/*` — le catalogue public
 * ne les sert pas, parce qu'un refus est un dossier adressé au seul
 * établissement concerné.
 */
export type Dossier = {
  /** Le slug, comme partout dans les URL. */
  id: string;
  nom: string;
  secteur: string;
  email: string;
  representant: string;
  siren: string;
  objetSocial: string;
  adresse: string;
  ville: string;
  codePostal: string;
  amountCents: number;
  photo: string;
  /** « en_attente », « valide », « refuse », « suspendu ». */
  statut: string;
  officiel: boolean;
  donneesReelles: boolean;
  /** La fiche que le partenaire rédige lui-même : une pièce du dossier. */
  siteWeb: string;
  presentationTitre: string;
  presentationTexte: string;
  /** Une plage par jour de la semaine, telle que la base la garde. */
  horaires: Record<string, unknown>;
  decisions: Decision[];
  derniereDecision: Decision | null;
};

/**
 * Les dossiers en attente d'instruction.
 *
 *   GET /api/admin/partenaires/demandes
 *   → { "demandes": Dossier[] }
 *
 * Deux cas s'y mêlent, et c'est voulu : une inscription jamais instruite, et
 * un dossier revenu en instruction après un refus. Les deux attendent la même
 * chose. `derniereDecision` permet à l'écran de les distinguer quand c'est
 * utile — un réexamen se lit autrement qu'une première demande.
 */
export async function getDemandes(): Promise<Dossier[]> {
  const data = await api<{ demandes: Dossier[] }>(
    "/api/admin/partenaires/demandes",
  );
  return data.demandes;
}

/**
 * Les établissements conventionnés — les Partenaires Officiels.
 *
 *   GET /api/admin/partenaires
 *   → { "partenaires": Dossier[] }
 */
export async function getConventionnes(): Promise<Dossier[]> {
  const data = await api<{ partenaires: Dossier[] }>("/api/admin/partenaires");
  return data.partenaires;
}

/**
 * Un dossier, quel que soit son statut.
 *
 *   GET /api/admin/partenaires/<slug>
 *   → { "dossier": Dossier }
 *   → 404 dossier introuvable
 *
 * Sert n'importe quel statut, et pas seulement les dossiers en attente : on
 * relit un dossier déjà instruit — pour retrouver le motif d'un refus, ou
 * écarter un établissement conventionné — aussi souvent qu'on en instruit un
 * neuf.
 */
export async function getDossier(slug: string): Promise<Dossier> {
  const data = await api<{ dossier: Dossier }>(
    `/api/admin/partenaires/${encodeURIComponent(slug)}`,
  );
  return data.dossier;
}

/** Ce que le serveur répond après une décision. */
type Instruction = { message: string; dossier: Dossier };

/**
 * Instruit un dossier : l'accepter, l'écarter, le suspendre.
 *
 *   POST /api/admin/partenaires/<slug>/{approuver,refuser,suspendre}
 *   { motif }
 *   → 200 { message, dossier }
 *   → 404 dossier introuvable
 *   → 409 le dossier est déjà dans cet état
 *   → 422 motif vide
 *
 * Le motif est obligatoire dans les trois sens, refus compris — c'est lui que
 * le titulaire du compte lira dans son espace, et le serveur refuse la
 * décision sans lui. Rend le message du serveur : c'est lui qui sait ce qui a
 * changé (« Spa des Vosges : en_attente → validé »).
 */
export async function instruire(
  slug: string,
  geste: "approuver" | "refuser" | "suspendre",
  motif: string,
): Promise<string> {
  const data = await api<Instruction>(
    `/api/admin/partenaires/${encodeURIComponent(slug)}/${geste}`,
    { method: "POST", body: JSON.stringify({ motif }) },
  );
  return data.message;
}

/**
 * Annule un paiement validé, avec le motif que la décision gardera.
 *
 *   POST /api/admin/transactions/<id>/annuler
 *   { motif }
 *   → 200  l'annulation est écrite
 *   → 404  paiement introuvable
 *   → 409  déjà annulé
 *   → 422  motif vide
 *   → 501  **aujourd'hui** : la route existe, gardée, mais son corps n'est pas
 *          écrit — voir `backend/routes/admin.py`.
 *
 * L'écran ne simule rien en attendant. Le message du serveur remonte tel quel,
 * 501 comprise : une annulation qui n'a pas eu lieu ne doit pas s'afficher
 * comme faite, et retirer la ligne du tableau « pour voir » aurait menti sur
 * l'état de la base. Le jour où le corps est écrit, cet appel n'a pas à bouger.
 *
 * Ce que la route devra faire, et qui explique le 501 : une transaction validée
 * est immuable — `models.py` bloque tout UPDATE et tout DELETE dessus — donc
 * annuler n'y touche pas. Il faut **une écriture inverse** : une ligne qui
 * recrédite le salarié et reprend au partenaire, qui référence l'originale, et
 * que les deux historiques affichent. La colonne de liaison manque encore au
 * schéma ; c'est une migration, pas un correctif.
 */
export async function annulerPaiement(
  id: string,
  motif: string,
): Promise<string> {
  const data = await api<{ message?: string }>(
    `/api/admin/transactions/${encodeURIComponent(id)}/annuler`,
    { method: "POST", body: JSON.stringify({ motif }) },
  );
  return data.message ?? "Paiement annulé.";
}
