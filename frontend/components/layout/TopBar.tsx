"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DarkThemeToggle, Navbar, NavbarBrand } from "flowbite-react";
import AuthButtons from "@/components/auth/AuthButtons";
import AuthModal from "@/components/auth/AuthModal";
import { onAuthIntent } from "@/components/auth/authIntent";
import UserMenu from "./UserMenu";
import BrandLogo from "@/components/brand/BrandLogo";
import {
  displayNameOf,
  useAccount,
} from "@/components/account/AccountProvider";
import type { AuthMode, AuthSubmitPayload } from "@/components/auth/AuthModal";

type Props = {
  onLogin?: () => void;
  onLogout?: () => void;
};

export default function TopBar({ onLogin, onLogout }: Props) {
  const router = useRouter();
  const { profile, ready, signIn, signOut } = useAccount();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  /** Le refus du serveur, affiché dans le dialogue et effacé à sa fermeture. */
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  function openModal(m: AuthMode) {
    setMode(m);
    setModalOpen(true);
  }

  /* Le dialogue s'ouvre aussi depuis les pages — la carte barrée de l'accueil
     y envoie. Voir auth/authIntent : la barre est hors de leur arbre, donc
     l'appel passe par un événement plutôt que par des props. */
  useEffect(() => onAuthIntent(openModal), []);

  function closeModal() {
    setModalOpen(false);
    setAuthError(null);
  }

  /**
   * Le dialogue reste ouvert tant que la connexion n'a pas abouti, et le refus
   * s'affiche dedans : le fermer sur un échec effacerait la saisie et le
   * message avec elle.
   */
  async function handleSubmit(payload: AuthSubmitPayload) {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signIn(payload);
      if (onLogin) onLogin();
      closeModal();
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Impossible de contacter le serveur.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  function handleSignOut() {
    signOut();
    if (onLogout) onLogout();
    /* Every other page is the signed-in person's own — the space, the
       settings, a partner's payment screen — so signing out anywhere lands on
       the public homepage rather than on a page telling you to sign in. */
    router.push("/");
  }

  return (
    <>
      <Navbar
        fluid
        // The bar is a fixed 76px in the design, so the inner row is given the
        // full height too — the stock theme only sizes it to its content, which
        // would leave the brand top-aligned in a 76px bar.
        theme={{
          root: {
            inner: {
              base: "mx-auto flex h-full flex-wrap items-center justify-between",
              fluid: { on: "", off: "container" },
            },
          },
        }}
        className="bg-cp-page border-cp-border relative z-40 snap-start border-b px-[3.2vw] py-0 lg:h-[76px]"
      >
        <NavbarBrand as={Link} href="/" className="text-cp-fg">
          <BrandLogo className="text-[25px]" />
        </NavbarBrand>

        <div className="flex items-center gap-4 lg:order-3 lg:gap-[22px]">
          <DarkThemeToggle
            aria-label="Changer de thème"
            className="text-cp-fg rounded-none"
          />

          {/* Held back until the stored session is known, so a signed-in
              visitor never sees the auth buttons flash first. */}
          {!ready ? null : profile ? (
            <UserMenu
              user={{ name: displayNameOf(profile), email: profile.email }}
              onSignOut={handleSignOut}
            />
          ) : (
            <AuthButtons
              onLoginClick={() => openModal("login")}
              onSignupClick={() => openModal("signup")}
            />
          )}
        </div>
      </Navbar>

      <AuthModal
        error={authError}
        busy={authBusy}
        onDismissError={() => setAuthError(null)}
        open={modalOpen}
        mode={mode}
        onModeChange={setMode}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  );
}
