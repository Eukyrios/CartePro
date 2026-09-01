"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DarkThemeToggle } from "flowbite-react";
import AuthButtons from "./AuthButtons";
import AuthModal from "./AuthModal";
import UserMenu from "./UserMenu";
import type { AuthMode, AuthSubmitPayload, AuthUser } from "./types";

type Props = {
  isLoggedIn?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
};

export default function SimpleNavbar({
  isLoggedIn = false,
  onLogin,
  onLogout,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  function openModal(m: AuthMode) {
    setMode(m);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function handleSubmit(payload: AuthSubmitPayload) {
    // Replace with real auth calls as needed
    console.log(payload);
    // Simulate sign-in: set user and mark logged in
    const { mode, username, email } = payload;
    const displayName =
      mode === "signup" && username ? username : email.split("@")[0];
    setUser({ name: displayName, email });
    setLoggedIn(true);
    if (mode === "login" && onLogin) onLogin();
    if (mode === "signup" && onLogin) onLogin();
    closeModal();
  }

  function handleSignOut() {
    setLoggedIn(false);
    setUser(null);
    if (onLogout) onLogout();
  }

  return (
    <>
      <nav className="bg-neutral-primary-soft border-default pointer-events-auto relative z-40 border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/ticket.svg"
              alt="Ticket Tout logo"
              width={36}
              height={36}
              className="mr-3"
            />
            <span className="text-heading text-xl font-semibold tracking-wide">
              TICKET TOUT
            </span>
          </Link>

          <div className="relative flex items-center gap-2">
            <DarkThemeToggle />

            {loggedIn && user ? (
              <UserMenu user={user} onSignOut={handleSignOut} />
            ) : (
              <AuthButtons
                onLoginClick={() => openModal("login")}
                onSignupClick={() => openModal("signup")}
              />
            )}
          </div>
        </div>
      </nav>

      <AuthModal
        open={modalOpen}
        mode={mode}
        onModeChange={setMode}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  );
}
