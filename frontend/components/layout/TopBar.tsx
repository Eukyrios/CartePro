"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DarkThemeToggle,
  Navbar,
  NavbarBrand,
  NavbarCollapse,
  NavbarLink,
  NavbarToggle,
} from "flowbite-react";
import AuthButtons from "@/components/auth/AuthButtons";
import AuthModal from "@/components/auth/AuthModal";
import UserMenu from "./UserMenu";
import { LogoMark } from "@/components/home/Marks";
import {
  displayNameOf,
  useAccount,
} from "@/components/account/AccountProvider";
import type { AuthMode, AuthSubmitPayload } from "@/components/auth/AuthModal";

type Props = {
  onLogin?: () => void;
  onLogout?: () => void;
};

/** The landing page's numbered section anchors, in order. */
const SECTION_LINKS = [
  { index: "01", label: "Fonctionnement", href: "#fonctionnement" },
  { index: "02", label: "Le réseau", href: "#reseau" },
  { index: "03", label: "Confiance", href: "#confiance" },
];

export default function TopBar({ onLogin, onLogout }: Props) {
  const { profile, ready, signIn, signOut } = useAccount();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const pathname = usePathname();

  // The anchors only resolve on the landing page, so they are only offered
  // there rather than pointing at fragments that do not exist.
  const onLanding = pathname === "/";

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
        className="bg-cp-page border-cp-border relative z-40 border-b px-[3.2vw] py-0 lg:h-[76px]"
      >
        <NavbarBrand
          as={Link}
          href="/"
          className="text-cp-fg gap-2.5 text-[17px] font-black tracking-[-0.07em]"
        >
          <LogoMark />
          <span>
            CARTE<span className="text-cp-accent">PRO</span>
          </span>
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

          {onLanding && <NavbarToggle className="text-cp-fg" />}
        </div>

        {onLanding && (
          <NavbarCollapse className="lg:order-2">
            {SECTION_LINKS.map((link) => (
              <NavbarLink
                key={link.href}
                href={link.href}
                className="text-cp-fg hover:text-cp-accent border-0 p-2 text-[10px] font-extrabold tracking-[0.08em] uppercase lg:p-0"
              >
                <span className="text-cp-accent mr-[7px]">{link.index}</span>
                {link.label}
              </NavbarLink>
            ))}
          </NavbarCollapse>
        )}
      </Navbar>

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
