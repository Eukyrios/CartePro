"use client";

import React, { useState } from "react";
import type { AuthMode, AuthSubmitPayload } from "./types";

type Props = {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onSubmit: (payload: AuthSubmitPayload) => void;
};

export default function AuthModal({
  open,
  mode,
  onModeChange,
  onClose,
  onSubmit,
}: Props) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ mode, username, email, password, remember });
  }

  // Render nothing while closed rather than being unmounted by the parent, so
  // half-typed field values survive closing and reopening the modal.
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-neutral-primary-soft border-default rounded-base shadow-xs pointer-events-auto relative z-50 w-full max-w-sm border p-6">
        <button
          type="button"
          onClick={onClose}
          className="text-body hover:bg-neutral-secondary-medium hover:text-heading rounded-base absolute end-3 top-3 inline-flex h-8 w-8 items-center justify-center bg-transparent"
        >
          <svg
            className="h-4 w-4"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18 17.94 6M18 18 6.06 6"
            />
          </svg>
          <span className="sr-only">Close modal</span>
        </button>

        <form onSubmit={handleSubmit}>
          <h5 className="text-heading mb-6 text-xl font-semibold">
            {mode === "login"
              ? "Sign in to our platform"
              : "Create your account"}
          </h5>

          {mode === "signup" && (
            <div className="mb-4">
              <label
                htmlFor="username"
                className="text-heading mb-2.5 block text-sm font-medium"
              >
                Your username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-neutral-secondary-medium border-default-medium text-heading rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body block w-full border px-3 py-2.5 text-sm"
                placeholder="your username"
                required
              />
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="email"
              className="text-heading mb-2.5 block text-sm font-medium"
            >
              Your email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-neutral-secondary-medium border-default-medium text-heading rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body block w-full border px-3 py-2.5 text-sm"
              placeholder="example@company.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-heading mb-2.5 block text-sm font-medium"
            >
              Your password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-neutral-secondary-medium border-default-medium text-heading rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body block w-full border px-3 py-2.5 text-sm"
              placeholder="•••••••••"
              required
            />
          </div>

          <div className="my-6 flex items-start">
            <div className="flex items-center">
              <input
                id="checkbox-remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="border-default-medium bg-neutral-secondary-medium focus:ring-brand-soft h-4 w-4 rounded-xs border focus:ring-2"
              />
              <label
                htmlFor="checkbox-remember"
                className="text-heading ms-2 text-sm font-medium"
              >
                Remember me
              </label>
            </div>
            <a
              href="#"
              className="text-fg-brand ms-auto text-sm font-medium hover:underline"
            >
              Lost Password?
            </a>
          </div>

          <button
            type="submit"
            className="bg-brand hover:bg-brand-strong focus:ring-brand-medium shadow-xs rounded-base mb-3 box-border w-full border border-transparent px-4 py-2.5 text-sm leading-5 font-medium text-white focus:ring-4 focus:outline-none"
          >
            {mode === "login" ? "Login to your account" : "Create your account"}
          </button>

          <div className="text-body text-sm font-medium">
            {mode === "login" ? (
              <>
                Not registered?{" "}
                <button
                  type="button"
                  onClick={() => onModeChange("signup")}
                  className="text-fg-brand hover:underline"
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => onModeChange("login")}
                  className="text-fg-brand hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
