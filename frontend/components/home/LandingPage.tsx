"use client";

import { useEffect, useState } from "react";
import { Toast, ToastToggle } from "flowbite-react";
import AuthModal from "@/components/auth/AuthModal";
import ConfidenceSection from "./ConfidenceSection";
import HeroSection from "./HeroSection";
import HowItWorksSection from "./HowItWorksSection";
import NetworkSection from "./NetworkSection";
import StatementSection from "./StatementSection";
import { useAccount } from "@/components/account/AccountProvider";
import type { AuthMode, AuthSubmitPayload } from "@/components/auth/AuthModal";

/**
 * The landing page. It owns its own AuthModal instance so the hero's calls to
 * action can open it directly, the way the maquette's page does; TopBar keeps
 * its own for the header buttons, and only one is ever mounted since the modal
 * renders nothing while closed.
 */
export default function LandingPage() {
  const { signIn } = useAccount();
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [toast, setToast] = useState("");

  // Clear the confirmation on its own, as the original does.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function handleSubmit(payload: AuthSubmitPayload) {
    signIn(payload);
    setAuthMode(null);
    setToast(
      payload.mode === "signup"
        ? "Compte de démonstration créé."
        : "Connexion de démonstration réussie.",
    );
  }

  return (
    <main className="flex-1 overflow-hidden">
      <HeroSection onStart={() => setAuthMode("signup")} />
      <StatementSection />
      <HowItWorksSection />
      <NetworkSection />
      <ConfidenceSection />

      <AuthModal
        open={authMode !== null}
        mode={authMode ?? "login"}
        onModeChange={setAuthMode}
        onClose={() => setAuthMode(null)}
        onSubmit={handleSubmit}
      />

      {toast && (
        <Toast className="bg-primary-700 fixed right-[22px] bottom-[22px] z-100 max-w-none rounded-none px-[18px] py-[15px] text-[11px] font-black text-white shadow-[7px_7px_0_var(--color-cp-ink)]">
          <span>{toast}</span>
          <ToastToggle className="bg-transparent text-white hover:bg-white/20" />
        </Toast>
      )}
    </main>
  );
}
