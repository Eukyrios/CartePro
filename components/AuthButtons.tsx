"use client";

import { Button } from "flowbite-react";

type Props = {
  onLoginClick: () => void;
  onSignupClick: () => void;
};

export default function AuthButtons({ onLoginClick, onSignupClick }: Props) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={onLoginClick}
        className="text-heading mr-3 text-sm font-medium hover:underline"
      >
        Login
      </button>
      <Button onClick={onSignupClick}>Sign up</Button>
    </div>
  );
}
