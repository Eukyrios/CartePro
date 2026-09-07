"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  AuthAudience,
  AuthSubmitPayload,
} from "@/components/auth/AuthModal";
import type { PartnerFields } from "@/components/forms/partnerFields";
import { api, clearAccessToken, accessToken, userProfile } from "@/lib/api";

/** Background texture printed on the card. */
export type CardPattern =
  | "none"
  | "waves"
  | "dots"
  | "grid"
  | "stripes"
  | "crosshatch"
  | "rings"
  | "checker";

/** How an employé has styled their card. */
export type CardStyle = {
  /** Card background, as a hex colour. */
  color: string;
  /** Colour of the text printed on it. */
  text: string;
  pattern: CardPattern;
  /** 0 = matte, 100 = full metallic sheen. */
  metalness: number;
};

export const DEFAULT_CARD_STYLE: CardStyle = {
  color: "#1b3a6b",
  text: "#ffffff",
  pattern: "waves",
  metalness: 20,
};

/**
 * Everything an account holds, whatever its audience. `partner` and `cardStyle`
 * stay on the type for both audiences so the shape is stable; only the matching
 * field set is ever rendered.
 */
export type Profile = {
  id?: number;
  balanceCents: number;
  audience: AuthAudience;
  username: string;
  email: string;
  partner: PartnerFields;
  cardStyle: CardStyle;
  /**
   * Le statut administratif d'un partenaire, et la décision qui l'écarte.
   *
   * En lecture seule : c'est l'administration qui décide, pas le titulaire du
   * compte. Hors de `partner` pour cette raison — le formulaire de profil
   * renvoie `partner` entier, et il n'a rien à dire ici.
   */
  statut?: string | null;
  refus?: { motif: string; at: string } | null;
};

type Account = {
  /** Null once signed out, and until the stored session has been read. */
  profile: Profile | null;
  /** False during the first paint, while the stored session is still unknown. */
  ready: boolean;
  /** Lève l'erreur du serveur telle quelle : c'est à l'écran de l'afficher. */
  signIn: (payload: AuthSubmitPayload) => Promise<void>;
  signOut: () => void;
  updateProfile: (profile: Profile) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshAccount: () => Promise<void>;
};

const AccountContext = createContext<Account | null>(null);

/**
 * Where the signed-in profile is kept across page loads. Stands in for the
 * session the backend will own, so that /parametres survives a reload and a
 * direct visit. Only profile fields are stored, never the password.
 */
const STORAGE_KEY = "ticket-tout.profile";

function writeStored(profile: Profile | null) {
  try {
    if (profile) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Losing the mock session on reload beats breaking the page.
  }
}

/**
 * Name shown for an account: a partenaire is known by its raison sociale, so
 * that wins over the username whenever it is filled in.
 */
export function displayNameOf(profile: Profile) {
  return profile.partner.raisonSociale || profile.username;
}

/**
 * Holds the signed-in account for the whole app, so the navbar and the
 * /parametres page read and write the same profile. Replace the bodies below
 * with real calls once the backend exists.
 */
export default function AccountProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  const persist = useCallback((next: Profile | null) => {
    setProfile(next);
    writeStored(next);
  }, []);

  const refreshAccount = useCallback(async () => {
    const data = await api<{ user: Parameters<typeof userProfile>[0] }>(
      "/api/auth/me",
    );
    const next = userProfile(data.user);
    persist({
      ...next,
      cardStyle: { ...DEFAULT_CARD_STYLE, ...next.cardStyle },
    });
  }, [persist]);

  // Read after mount: localStorage does not exist while server-rendering, so
  // reading it during the first render would break hydration.
  useEffect(() => {
    async function restoreSession() {
      if (!accessToken()) {
        setReady(true);
        return;
      }
      try {
        await refreshAccount();
      } catch {
        clearAccessToken();
        setProfile(null);
      } finally {
        setReady(true);
      }
    }
    restoreSession();
  }, [refreshAccount]);

  /**
   * Connecte ou inscrit, et **laisse remonter le refus du serveur**.
   *
   * Un `alert()` du navigateur tenait ce rôle : une boîte grise, hors de la
   * page, hors du design, qui bloque tout et qu'aucun lecteur d'écran ne
   * rattache au formulaire d'où elle vient. Le message appartient à l'écran qui
   * a posé la question — c'est le dialogue d'authentification qui l'affiche
   * désormais, dans ses propres mots et à sa place.
   */
  const signIn = useCallback(
    async (payload: AuthSubmitPayload) => {
      const { audience, mode, username, email, password, partner } = payload;
      const data = await api<{
        access_token: string;
        user: Parameters<typeof userProfile>[0];
      }>(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          ...(mode === "signup"
            ? { username, audience, partner: partner ?? {} }
            : {}),
        }),
      });
      window.localStorage.setItem("access_token", data.access_token);
      const next = userProfile(data.user);
      persist({
        ...next,
        cardStyle: { ...DEFAULT_CARD_STYLE, ...next.cardStyle },
      });
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* Session is cleared locally below. */
    }
    clearAccessToken();
    persist(null);
  }, [persist]);

  const updateProfile = useCallback(
    async (next: Profile) => {
      const data = await api<{ user: Parameters<typeof userProfile>[0] }>(
        "/api/auth/profile",
        {
          method: "PUT",
          body: JSON.stringify({ profile: next }),
        },
      );
      persist({
        ...userProfile(data.user),
        cardStyle: { ...DEFAULT_CARD_STYLE, ...data.user.profile.cardStyle },
      });
    },
    [persist],
  );

  // Distinct from signOut only once a backend exists to delete against; both
  // end the session here.
  const deleteAccount = useCallback(async () => {
    await api("/api/auth/account", { method: "DELETE" });
    clearAccessToken();
    persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({
      profile,
      ready,
      signIn,
      signOut,
      updateProfile,
      deleteAccount,
      refreshAccount,
    }),
    [
      profile,
      ready,
      signIn,
      signOut,
      updateProfile,
      deleteAccount,
      refreshAccount,
    ],
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

/** Reads the account context. Throws outside AccountProvider. */
export function useAccount(): Account {
  const account = useContext(AccountContext);
  if (!account) {
    throw new Error("useAccount must be used inside an AccountProvider");
  }
  return account;
}
