"use client";

import { api } from "@/lib/api";
import type { Movement } from "@/components/espace/movements";

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

/* ---------------------------------------------------------------------------
 * Gestion des comptes salariés
 * ------------------------------------------------------------------------ */

/** Une mesure prise sur un compte, telle que `mesures_compte` la garde. */
export type Mesure = {
  /** « actif », « suspendu », « clôturé » — l'état où la mesure a mis le compte. */
  sens: string;
  motif: string;
  /** ISO 8601. */
  at: string | null;
};

/**
 * Un compte salarié vu par l'administration.
 *
 * Le solde y est parce que c'est ce qu'on regarde avant de clôturer : fermer un
 * compte qui porte encore de l'argent public est une décision, pas une
 * formalité. Il est calculé côté serveur — abondements moins paiements validés
 * — et n'existe dans aucune colonne.
 */
export type Compte = {
  /**
   * De quel côté du comptoir se trouve ce compte.
   *
   * Les deux vivent dans la même liste : la question qu'on vient poser est la
   * même — qui a un compte, dans quel état — et on le cherche par son nom, pas
   * par son genre.
   */
  genre: "salarie" | "partenaire";
  id: number;
  /** Présent pour un partenaire : ses gestes s'adressent par slug. */
  slug?: string;
  /**
   * L'aplat de la vignette du compte, en hexadécimal.
   *
   * Une couleur et non une image : le dispositif ne collectionne pas les
   * visages de ses bénéficiaires. Tirée au hasard à la création, puis
   * modifiable par le titulaire depuis ses réglages — donc jamais vide.
   */
  avatarColor: string;
  /** La photographie de fiche d'un partenaire, s'il en a une. */
  photo?: string;
  nom: string;
  email: string;
  /**
   * Deux vocabulaires, et c'est assumé : « actif », « suspendu », « clôturé »
   * pour un salarié ; « en_attente », « validé », « refusé », « suspendu »
   * pour un dossier de partenaire. Maquiller l'un en l'autre ferait passer un
   * dossier refusé pour un compte actif.
   */
  statut: string;
  /**
   * Ce que le compte porte, dont le sens dépend du genre : le solde d'un
   * salarié, ce qu'un partenaire a encaissé. Un partenaire ne détient rien, il
   * reçoit — l'écran dit lequel des deux il affiche.
   */
  soldeCents: number;
  /** L'employeur d'un salarié ; la catégorie et la ville d'un partenaire. */
  employeur: string;
  nbPaiements: number;
  /** Toujours zéro pour un partenaire : il n'en reçoit pas. */
  nbAbondements: number;
  /** Les mesures d'un compte, ou les décisions d'un dossier. */
  mesures: Mesure[];
  derniereMesure: Mesure | null;
};

/**
 * Les comptes salariés, avec leur état et leur solde.
 *
 *   GET /api/admin/comptes[?statut=…]
 *   → { "comptes": Compte[] }
 */
export async function getComptes(statut = ""): Promise<Compte[]> {
  const query = statut ? `?statut=${encodeURIComponent(statut)}` : "";
  const data = await api<{ comptes: Compte[] }>(`/api/admin/comptes${query}`);
  return data.comptes;
}

/**
 * Un compte salarié, seul, avec l'historique complet de ses mesures.
 *
 *   GET /api/admin/comptes/<id>
 *   → { "compte": Compte }
 *   → 404 compte introuvable
 *
 * Ce que demande la bande posée au-dessus d'un historique de dépenses : elle
 * nomme un compte, donc elle en lit un, et non les soixante-six de la liste.
 */
export async function getCompte(id: number): Promise<Compte> {
  const data = await api<{ compte: Compte }>(`/api/admin/comptes/${id}`);
  return data.compte;
}

/**
 * Le compte d'un partenaire, par son slug.
 *
 * Il n'a pas de route à lui : les gestes d'un établissement s'adressent par
 * slug, mais son compte est rendu dans la liste — `_compte_partenaire` côté
 * serveur — et la liste entière tient dans une réponse. Une route de plus pour
 * une lecture que celle-ci fait déjà n'apprendrait rien au serveur.
 *
 * Rend `null` pour un slug inconnu, comme la route des transactions : ce n'est
 * pas à cet écran de dire si un établissement existe.
 */
export async function getComptePartenaire(
  slug: string,
): Promise<Compte | null> {
  const comptes = await getComptes();
  return (
    comptes.find(
      (compte) => compte.genre === "partenaire" && compte.slug === slug,
    ) ?? null
  );
}

/**
 * Les mouvements d'un compte salarié, du plus récent au plus ancien.
 *
 *   GET /api/admin/comptes/<id>/mouvements
 *   → { "transactions": Movement[] }
 *   → 404 compte introuvable
 *
 * La même forme que `GET /api/transactions/me` rend au titulaire, et le même
 * calcul côté serveur — `backend/mouvements.py`. C'est ce qui permet à
 * l'administration d'afficher le composant de l'espace salarié tel quel, y
 * compris le solde après chaque opération : les crédits d'employeur sont du
 * lot, donc la suite se recalcule.
 */
export async function getMouvementsCompte(
  id: number,
): Promise<readonly Movement[]> {
  const data = await api<{ transactions: Movement[] }>(
    `/api/admin/comptes/${id}/mouvements`,
  );
  return data.transactions;
}

/** Les trois gestes, tels que les routes les nomment. */
export type GesteCompte = "activer" | "suspendre" | "cloturer";

/**
 * Prend une mesure sur un compte, avec le motif écrit qui la porte.
 *
 *   POST /api/admin/comptes/<id>/{activer,suspendre,cloturer}
 *   { motif }
 *   → 200 { message, compte, soldeResiduelCents? }
 *   → 404 compte introuvable
 *   → 409 le compte est déjà dans cet état, ou il est clôturé
 *   → 422 motif vide
 *
 * Le motif est obligatoire dans les trois sens : c'est lui que lira l'agent
 * suivant, et le serveur refuse la mesure sans lui. Une clôture rend en plus
 * `soldeResiduelCents` — ce qui restait sur le compte au moment de la fermer.
 */
/**
 * Applique un geste au compte, quel que soit son genre.
 *
 * Les deux côtés gardent **leurs** routes : un salarié se mesure par
 * `/api/admin/comptes/<id>/<geste>`, un partenaire s'instruit par
 * `/api/admin/partenaires/<slug>/<geste>`. Une route unique aurait demandé au
 * serveur de deviner le genre depuis un identifiant numérique qui n'est unique
 * que par table, et surtout elle aurait fait un second chemin vers une
 * décision de dossier — celle que l'écran du dossier écrit déjà.
 *
 * Pour un partenaire, « rétablir » veut dire conventionner : c'est le geste
 * qui le remet dans le réseau, et il s'écrit dans la table des décisions comme
 * n'importe quelle acceptation.
 */
export async function mesurer(
  compte: Compte,
  geste: GesteCompte | "retablir",
  motif: string,
): Promise<string> {
  if (compte.genre === "partenaire") {
    if (!compte.slug) throw new Error("Ce dossier n'a pas de slug.");
    const route = geste === "suspendre" ? "suspendre" : "approuver";
    return instruire(compte.slug, route as "approuver" | "suspendre", motif);
  }
  const data = await mesurerCompte(
    compte.id,
    geste === "retablir" ? "activer" : geste,
    motif,
  );
  return data.message;
}

export async function mesurerCompte(
  id: number,
  geste: GesteCompte,
  motif: string,
): Promise<{ message: string; compte: Compte; soldeResiduelCents?: number }> {
  return api<{ message: string; compte: Compte; soldeResiduelCents?: number }>(
    `/api/admin/comptes/${id}/${geste}`,
    { method: "POST", body: JSON.stringify({ motif }) },
  );
}

/* ---------------------------------------------------------------------------
 * Tableau de bord national
 * ------------------------------------------------------------------------ */

/** Un mois de la série, tel que le serveur l'agrège. */
export type MoisVolume = {
  /** « AAAA-MM ». */
  mois: string;
  nombre: number;
  montantCents: number;
};

/** Un département où le réseau est implanté. */
export type Departement = {
  /** Deux chiffres, trois outre-mer. */
  code: string;
  nom: string;
  partenaires: number;
  nombre: number;
  montantCents: number;
  villes: string[];
};

export type TableauDeBord = {
  /** Bornée par les données, pas par l'horloge — voir `routes/admin_tableau.py`. */
  periode: { debut: string | null; fin: string | null };
  volume: {
    nombre: number;
    montantCents: number;
    moyenneCents: number;
    serie: MoisVolume[];
  };
  partenaires: {
    total: number;
    conventionnes: number;
    /** Conventionnés ayant encaissé au moins une fois. */
    actifs: number;
    parStatut: Record<string, number>;
    classement: {
      id: string;
      nom: string;
      ville: string;
      categorie: string;
      nombre: number;
      montantCents: number;
    }[];
  };
  comptes: { total: number; parStatut: Record<string, number> };
  geographie: Departement[];
};

/**
 * Tout ce que le tableau de bord affiche, pris dans la même passe.
 *
 *   GET /api/admin/tableau-de-bord
 *
 * Un seul appel et non six : six appels afficheraient six états de chargement
 * et pourraient montrer six instants différents du même dispositif. Ici les
 * chiffres s'additionnent.
 */
export async function getTableauDeBord(): Promise<TableauDeBord> {
  return api<TableauDeBord>("/api/admin/tableau-de-bord");
}

/* ---------------------------------------------------------------------------
 * Abondements employeurs
 * ------------------------------------------------------------------------ */

export type Abondement = {
  id: number;
  salarieId: number;
  salarie: string;
  montantCents: number;
  at: string | null;
  employeur: string;
  agentId: number | null;
  reference: string;
};

/**
 * Les crédits versés, du plus récent au plus ancien.
 *
 *   GET /api/admin/abondements[?salarie=<id>][&limite=<n>]
 *   → { "abondements": Abondement[], "plafondCents": number }
 */
export async function getAbondements(
  limite = 200,
): Promise<{ abondements: Abondement[]; plafondCents: number }> {
  return api<{ abondements: Abondement[]; plafondCents: number }>(
    `/api/admin/abondements?limite=${limite}`,
  );
}

/**
 * Crédite un ou plusieurs comptes salariés du même montant.
 *
 *   POST /api/admin/abondements
 *   { salarieIds, montantCents, reference }
 *   → 200 { message, abondements, rejoue }
 *   → 400 saisie invalide (montant, liste)
 *   → 404 compte inconnu · 409 compte fermé · 422 référence absente ou mal formée
 *
 * `reference` est une **clé d'idempotence**, et elle est obligatoire : c'est la
 * seule route de l'application qui crée de l'argent sur un compte, et un
 * double envoi — double-clic, réseau qui repart — créditerait deux fois sans
 * elle. Renvoyer la même clé rend la même réponse avec `rejoue: true` plutôt
 * qu'une erreur, ce qui est ce qu'attend une reprise.
 *
 * Le lot est atomique : un seul compte fermé ou inconnu et rien n'est écrit.
 */
export async function crediter(
  salarieIds: number[],
  montantCents: number,
  reference: string,
): Promise<{ message: string; abondements: Abondement[]; rejoue: boolean }> {
  return api<{ message: string; abondements: Abondement[]; rejoue: boolean }>(
    "/api/admin/abondements",
    {
      method: "POST",
      body: JSON.stringify({ salarieIds, montantCents, reference }),
    },
  );
}
