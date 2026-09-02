"use client";

import { Button } from "flowbite-react";
import { Arrow } from "@/components/home/Marks";

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
        className="text-cp-fg hidden text-[11px] font-extrabold hover:underline sm:block"
      >
        Se connecter
      </button>
      {/* h-auto: Flowbite's size prop pins a fixed height, which would
          override the design's padding. */}
      <Button
        onClick={onSignupClick}
        className="group h-auto rounded-none px-4 py-3 text-[11px] font-extrabold"
      >
        Créer un compte
        <Arrow />
      </Button>
    </div>
  );
}
