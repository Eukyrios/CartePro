import { ecrireSession, effacerSession, lireSession } from "@/lib/session";
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
    /** L'aplat de la vignette du compte, toujours renseigné par le serveur. */
    avatarColor: string;
    /** « validé », « en_attente », « refusé », « suspendu ». `null` pour un salarié. */
    statut: string | null;
    /**
     * La décision qui écarte ce partenaire, adressée à lui seul.
     *
     * Hors de `partner`, et à dessein : c'est une décision de l'administration, pas un
     * champ que le partenaire déclare — le formulaire de profil renvoie
     * `partner` entier, il n'a pas à pouvoir réécrire ça. Elle ne sort jamais
     * par le catalogue, qui est public.
     */
    refus: { motif: string; at: string } | null;
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
  /** Conventionné « Partenaire Officiel de l'administration » — statut administratif. */
  officiel: boolean;
  /** Coup de cœur de l'administrateur — sélection éditoriale, sans rapport avec le
   *  conventionnement : un partenaire peut être l'un, l'autre, les deux ou
   *  aucun. */
  featured: boolean;
  /**
   * Fiche renseignée pour de vrai, ou fiche de remplissage. Le démonstrateur
   * mêle les deux, et l'écran le dit. Distinct du coup de cœur : l'un est un
   * goût de l'administrateur, l'autre un constat sur la donnée.
   */
  donneesReelles: boolean;
  /**
   * Le statut administratif en clair : « validé », « en_attente », « refusé »,
   * « suspendu ». `officiel` n'en dit que le premier cas — et « en attente »
   * n'est pas « refusé », donc un écran qui les confond ne peut pas expliquer
   * l'un des deux.
   */
  statut: string;
  /* Le motif d'un refus n'est **pas** ici : cette route est publique, et la
     raison pour laquelle un établissement a été écarté est un dossier
     administratif adressé à lui seul. Il la lit dans son espace. */
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
  /** Le nombre de likes de la communaute. */
  likes: number;
  /** Si l'utilisateur a like. */
  liked_by_user: boolean;
};

/**
 * Le jeton de session.
 *
 * Il passe par `lib/session`, qui choisit entre `localStorage` et
 * `sessionStorage` selon la case « Se souvenir de moi ». C'est aussi lui qui
 * sert de repère : `sessionPersistante` regarde où le jeton se trouve pour
 * savoir où écrire la suite.
 */
export const TOKEN_KEY = "access_token";

export function accessToken() {
  return lireSession(TOKEN_KEY);
}

/** `remember` faux : le jeton part dans le magasin que l'onglet vide en se fermant. */
export function setAccessToken(token: string, remember: boolean) {
  ecrireSession(TOKEN_KEY, token, remember);
}

export function clearAccessToken() {
  effacerSession(TOKEN_KEY);
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
    role: user.role,
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
    /* La décision de l'administration, en lecture seule : elle traverse le profil
       parce que c'est l'écran du partenaire qui l'affiche, mais rien dans les
       formulaires ne l'écrit. */
    statut: user.profile?.statut ?? null,
    refus: user.profile?.refus ?? null,
    email: user.email,
    username: user.username,
  };
}
