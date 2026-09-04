import type { CardStyle, Profile } from "@/components/account/AccountProvider";
import { EMPTY_PARTNER } from "@/components/forms/partnerFields";
import type { PartnerFields } from "@/components/forms/partnerFields";

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
};

const TOKEN_KEY = "access_token";

export function accessToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
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
    throw new Error(data.error || data.message || "La requête a échoué.");
  }
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
    partner: { ...EMPTY_PARTNER, ...(user.profile?.partner ?? {}) },
    email: user.email,
    username: user.username,
  };
}
