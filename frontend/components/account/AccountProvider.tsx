"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { EMPTY_PARTNER } from "@/components/auth/AuthModal";
import type {
  AuthAudience,
  AuthSubmitPayload,
} from "@/components/auth/AuthModal";
import type { PartnerFields } from "@/components/auth/SignupPartnerFields";

/** Background texture printed on the card. */
export type CardPattern = "none" | "waves" | "dots" | "grid";

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
  audience: AuthAudience;
  username: string;
  email: string;
  partner: PartnerFields;
  cardStyle: CardStyle;
};

type Account = {
  /** Null once signed out, and until the stored session has been read. */
  profile: Profile | null;
  /** False during the first paint, while the stored session is still unknown. */
  ready: boolean;
  signIn: (payload: AuthSubmitPayload) => void;
  signOut: () => void;
  updateProfile: (profile: Profile) => void;
  deleteAccount: () => void;
};

const AccountContext = createContext<Account | null>(null);

/**
 * Where the signed-in profile is kept across page loads. Stands in for the
 * session the backend will own, so that /parametres survives a reload and a
 * direct visit. Only profile fields are stored, never the password.
 */
const STORAGE_KEY = "ticket-tout.profile";

function readStored(): Profile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Profile;
    // A session stored before the card style existed has no `cardStyle`, and a
    // partially written one may miss individual keys.
    return {
      ...stored,
      cardStyle: { ...DEFAULT_CARD_STYLE, ...(stored.cardStyle ?? {}) },
    };
  } catch {
    // Private windows and browsers set to block site data throw on access.
    return null;
  }
}

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

  // Read after mount: localStorage does not exist while server-rendering, so
  // reading it during the first render would break hydration.
  useEffect(() => {
    setProfile(readStored());
    setReady(true);
  }, []);

  const persist = useCallback((next: Profile | null) => {
    setProfile(next);
    writeStored(next);
  }, []);

  const signIn = useCallback(
    (payload: AuthSubmitPayload) => {
      // Signing in carries no partner details, so those stay empty until the
      // backend can supply them; the settings page is what fills them in.
      const { audience, mode, username, email, partner } = payload;
      persist({
        audience,
        username:
          mode === "signup" && username ? username : email.split("@")[0],
        email,
        partner: partner ?? EMPTY_PARTNER,
        cardStyle: DEFAULT_CARD_STYLE,
      });
    },
    [persist],
  );

  const signOut = useCallback(() => persist(null), [persist]);

  const updateProfile = useCallback(
    (next: Profile) => persist(next),
    [persist],
  );

  // Distinct from signOut only once a backend exists to delete against; both
  // end the session here.
  const deleteAccount = useCallback(() => persist(null), [persist]);

  const value = useMemo(
    () => ({
      profile,
      ready,
      signIn,
      signOut,
      updateProfile,
      deleteAccount,
    }),
    [profile, ready, signIn, signOut, updateProfile, deleteAccount],
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
