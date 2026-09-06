"use client";

import { ApiError, api, apiWithStatus } from "@/lib/api";

/**
 * Le seul endroit de l'espace partenaire qui parle au serveur.
 *
 * Les écrans appellent ces fonctions et rien d'autre : aucun `fetch` dans un
 * composant, aucune donnée en dur non plus. Chaque fonction porte la route
 * qu'elle interroge et la forme de ce qui revient, pour qu'une évolution du
 * backend se voie ici et nulle part ailleurs.
 *
 * L'authentification passe par `lib/api.ts`, qui pose l'en-tête
 * `Authorization: Bearer <jeton>` — c'est pourquoi aucune de ces fonctions ne
 * prend d'identifiant de partenaire : le serveur sait qui appelle.
 *
 * Le catalogue et le détail d'un partenaire ne sont pas ici : ils sont déjà
 * lus par `components/espace/PartnerCatalogue` et par la page
 * `/espace/partenaire/[id]`, que les deux espaces partagent. Les redéclarer
 * aurait fait deux chemins vers la même route.
 */

/**
 * Un encaissement reçu, tel que l'écran des recettes l'affiche.
 *
 * `kind` vaut toujours "credit" pour un partenaire : la même route sert les
 * deux audiences et renvoie "debit" à un salarié.
 */
export type Receipt = {
  id: string;
  /** ISO 8601, tel que le serveur l'écrit. */
  at: string;
  kind: "credit" | "debit";
  amountCents: number;
  /** Qui a payé, en clair mais sans son email. */
  label: string;
  partnerId: string;
};

/**
 * Les encaissements du partenaire connecté, du plus récent au plus ancien.
 *
 *   GET /api/transactions/me
 *   → { "transactions": [ { id, at, kind, amountCents, label, partnerId } ] }
 *
 * Le filtrage (période, montant, référence) se fait pour l'instant à l'écran :
 * la route ne prend pas encore de paramètres. Le jour où elle en prendra, ils
 * s'ajoutent ici — la signature accepte déjà un objet — sans qu'un composant
 * bouge.
 */
export async function getReceivedTransactions(): Promise<Receipt[]> {
  const data = await api<{ transactions: Receipt[] }>("/api/transactions/me");
  return data.transactions;
}

/** Ce que le serveur répond quand un encaissement aboutit. */
type EncaissementBody = {
  status: string;
  message: string;
  details: {
    transaction_id: number;
    nouveau_solde_salarie: number;
  };
};

/**
 * Le résultat d'un encaissement, dans les trois formes que l'écran doit
 * distinguer.
 *
 * « déjà encaissé » n'est pas une erreur pour le serveur : l'idempotence lui
 * fait répondre 200 avec la transaction d'origine, pour qu'un double appel ne
 * débite pas deux fois. C'est à l'écran d'en faire un refus lisible, sinon le
 * partenaire encaisserait deux fois le même code en croyant l'avoir fait deux
 * fois.
 */
export type EncaissementOutcome =
  | { kind: "encaisse"; transactionId: number; soldeSalarieCents: number }
  | { kind: "deja-encaisse"; transactionId: number }
  | { kind: "refus"; reason: string };

/**
 * Encaisse le code présenté par un salarié.
 *
 *   POST /api/transactions/valider
 *   { qr_token, montant, partenaire_id }
 *   → 201 { status, message, details: { transaction_id, nouveau_solde_salarie } }
 *   → 200 même forme si ce code a déjà été encaissé (idempotence serveur)
 *   → 400 solde insuffisant · code expiré · code invalide
 *   → 403 le jeton d'authentification n'est pas celui de ce partenaire
 *
 * `montant` part en euros parce que c'est ce que la route attend ; l'interface,
 * elle, ne manipule que des centimes entiers. La conversion tient donc ici, à
 * la frontière, et pas dans un écran.
 *
 * Le serveur reconnaît le partenaire par son slug autant que par sa clé
 * primaire, d'où `partnerId` tel que le catalogue l'expose.
 */
export async function validateEncaissement(input: {
  code: string;
  amountCents: number;
  partnerId: string;
}): Promise<EncaissementOutcome> {
  try {
    const { status, data } = await apiWithStatus<EncaissementBody>(
      "/api/transactions/valider",
      {
        method: "POST",
        body: JSON.stringify({
          qr_token: input.code.trim(),
          montant: input.amountCents / 100,
          partenaire_id: input.partnerId,
        }),
      },
    );
    /* 201 : la transaction vient d'être écrite. 200 : elle existait déjà, et
       le serveur renvoie celle d'origine plutôt que d'en créer une seconde. */
    return status === 201
      ? {
          kind: "encaisse",
          transactionId: data.details.transaction_id,
          soldeSalarieCents: Math.round(
            data.details.nouveau_solde_salarie * 100,
          ),
        }
      : { kind: "deja-encaisse", transactionId: data.details.transaction_id };
  } catch (error) {
    /* Les mots du refus sont ceux du serveur : code expiré, code corrompu,
       solde insuffisant, partenaire non autorisé. Les réécrire ici, c'est
       inventer une deuxième version de la règle. */
    if (error instanceof ApiError)
      return { kind: "refus", reason: error.message };
    return {
      kind: "refus",
      reason: "L'encaissement n'a pas abouti. Réessayez.",
    };
  }
}
