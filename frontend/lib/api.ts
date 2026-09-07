import type { CardStyle, Profile } from "@/components/account/AccountProvider";
import { EMPTY_PARTNER, toHoraires } from "@/components/forms/partnerFields";
import type { Horaires, PartnerFields } from "@/components/forms/partnerFields";

export type ApiUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  balanceCents: number;
  profile: {
    audience: "employee" | "partner";
    username: string;
    email: string;
    partner: PartnerFields;
    cardStyle: CardStyle;
  };
};

export type ApiPartner = {
  id: string;
  nom: string;
  secteur: string;
  adresse: string;
  ville: string;
  codePostal: string;
  amountCents: number;
  /** Chemin de la photographie, servie par le front depuis /public. */
  photo: string;
  /** Conventionné « Partenaire Officiel du Ministère » — statut administratif. */
  officiel: boolean;
  /** Coup de cœur du Ministre — sélection éditoriale, sans rapport avec le
   *  conventionnement : un partenaire peut être l'un, l'autre, les deux ou
   *  aucun. */
  featured: boolean;
  /**
   * Fiche renseignée pour de vrai, ou fiche de remplissage. Le démonstrateur
   * mêle les deux, et l'écran le dit. Distinct du coup de cœur : l'un est un
   * goût du Ministre, l'autre un constat sur la donnée.
   */
  donneesReelles: boolean;
  /**
   * Le statut administratif en clair : « validé », « en_attente », « refusé »,
   * « suspendu ». `officiel` n'en dit que le premier cas — et « en attente »
   * n'est pas « refusé », donc un écran qui les confond ne peut pas expliquer
   * l'un des deux.
   */
  statut: string;
  /**
   * Le motif du refus, pour un établissement écarté. `null` sinon.
   *
   * Un refus se motive par écrit : c'est ce que la table des décisions exige,
   * et c'est la seule façon honnête d'écarter quelqu'un. La fiche l'affiche en
   * première position, avant tout le reste.
   */
  refus: { motif: string; at: string } | null;
  /**
   * La présentation écrite par le partenaire, et son site.
   *
   * Elles vivent dans son profil — il les saisit dans ses paramètres — mais
   * sortent par le catalogue parce que sa fiche est publique : la lire ne
   * demande pas d'être connecté. Chaînes vides quand rien n'a été saisi.
   */
  siteWeb: string;
  presentationTitre: string;
  /** Markdown, dans le sous-ensemble de `ui/Markdown`. */
  presentationTexte: string;
  /** Les sept jours, toujours complets — voir `toHoraires`. */
  horaires: Horaires;
};

const TOKEN_KEY = "access_token";

export function accessToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

/**
 * Un refus du serveur, avec le statut qui l'accompagne.
 *
 * Le message seul ne suffit pas à tous les appelants : l'encaissement doit
 * distinguer un code déjà utilisé (que le serveur accepte, en 200) d'un code
 * refusé (400) et d'un partenaire qui n'est pas le bon (403). Classer ces cas
 * en lisant le texte du message serait une grammaire de plus à maintenir.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** L'appel, avec le statut conservé. */
export async function apiWithStatus<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; data: T }> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = accessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...init, headers });
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    message?: string;
  };
  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || "La requête a échoué.",
      response.status,
    );
  }
  return { status: response.status, data };
}

/** L'appel courant : le corps de la réponse, et rien d'autre. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await apiWithStatus<T>(path, init);
  return data;
}

export function userProfile(user: ApiUser): Profile {
  return {
    id: user.id,
    balanceCents: user.balanceCents,
    ...user.profile,
    /* Les neuf champs partenaire, complétés à la chaîne vide.
     *
     * Le seed n'écrit dans `partner_data` que ce dont le réseau a besoin —
     * raison sociale, secteur, adresse, ville, code postal, tarif — et laisse
     * `siren`, `objetSocial`, `categorie` et `nomRepresentant` absents. Le type
     * promet des chaînes, l'API renvoyait `undefined`, et un champ contrôlé
     * qui reçoit `undefined` puis une frappe fait basculer React de non
     * contrôlé à contrôlé. Le formulaire ne peut pas se défendre seul de ça :
     * la forme se répare ici, à la frontière. */
    partner: {
      ...EMPTY_PARTNER,
      ...(user.profile?.partner ?? {}),
      /* `horaires` est le seul champ imbriqué, et l'étalement ci-dessus ne
         fusionne qu'un niveau : une base ne portant que le lundi aurait rendu
         les six autres jours `undefined`, avec le même basculement contrôlé /
         non contrôlé que le reste de ce correctif évite. */
      horaires: toHoraires(user.profile?.partner?.horaires),
    },
    email: user.email,
    username: user.username,
  };
}
