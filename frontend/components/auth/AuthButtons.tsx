"use client";

import { Arrow } from "@/components/home/Marks";
import { BTN_SOLID, MICRO } from "@/components/ui/surfaces";

type Props = {
  onLoginClick: () => void;
  onSignupClick: () => void;
};

export default function AuthButtons({ onLoginClick, onSignupClick }: Props) {
  return (
    <div className="flex items-center gap-4 lg:gap-[22px]">
      <button
        type="button"
        onClick={onLoginClick}
        className={`text-cp-fg hidden hover:underline sm:block ${MICRO}`}
      >
        Se connecter
      </button>
      {/* Flowbite's Button is a field of primary-700, which the charter does
          not allow for a button, so this uses the shared ink-filled one. */}
      <button type="button" onClick={onSignupClick} className={BTN_SOLID}>
        Créer un compte
        <Arrow />
      </button>
    </div>
  );
}
