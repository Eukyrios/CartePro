"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DarkThemeToggle } from "flowbite-react";
import AuthButtons from "@/components/auth/AuthButtons";
import AuthModal from "@/components/auth/AuthModal";
import UserMenu from "./UserMenu";
import {
  displayNameOf,
  useAccount,
} from "@/components/profile/AccountProvider";
import type { AuthMode, AuthSubmitPayload } from "@/components/auth/AuthModal";

type Props = {
  onLogin?: () => void;
  onLogout?: () => void;
};

export default function SimpleNavbar({ onLogin, onLogout }: Props) {
  const { profile, ready, signIn, signOut } = useAccount();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");

  function openModal(m: AuthMode) {
    setMode(m);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function handleSubmit(payload: AuthSubmitPayload) {
    // Replace with real auth calls as needed. The password is redacted here: it
    // must never be logged or stored in clear, only hashed server-side.
    console.log({ ...payload, password: "[redacted]" });
    signIn(payload);
    if (onLogin) onLogin();
    closeModal();
  }

  function handleSignOut() {
    signOut();
    if (onLogout) onLogout();
  }

  return (
    <>
      <nav className="bg-neutral-primary-soft border-default pointer-events-auto relative z-40 border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/ticket.svg"
              alt="Logo Ticket Tout"
              width={36}
              height={36}
              className="mr-3"
            />
            <span className="text-heading text-xl font-semibold tracking-wide">
              TICKET TOUT
            </span>
          </Link>

          <div className="relative flex items-center gap-2">
            <DarkThemeToggle aria-label="Changer de thème" />

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
