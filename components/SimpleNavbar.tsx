"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "flowbite-react";

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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar?: string;
  } | null>(null);

  function openModal(m: "login" | "signup") {
    setMode(m);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Replace with real auth calls as needed
    console.log({ mode, username, email, password, remember });
    // Simulate sign-in: set user and mark logged in
    const displayName =
      mode === "signup" && username ? username : email.split("@")[0];
    setUser({
      name: displayName,
      email,
      avatar: "/docs/images/people/profile-picture-5.jpg",
    });
    setLoggedIn(true);
    setDropdownOpen(false);
    if (mode === "login" && onLogin) onLogin();
    if (mode === "signup" && onLogin) onLogin();
    closeModal();
  }

  return (
    <>
      <nav className="pointer-events-auto relative z-40 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/favicon.svg"
              alt="logo"
              width={36}
              height={36}
              className="mr-3"
            />
            <span className="text-xl font-semibold">Flowbite</span>
          </Link>

          <div className="relative flex items-center">
            {loggedIn && user ? (
              <div className="flex items-center">
                <button
                  id="avatarButton"
                  type="button"
                  onClick={() => setDropdownOpen((s) => !s)}
                  className="h-10 w-10 overflow-hidden rounded-full focus:outline-none"
                >
                  <img
                    src={user.avatar}
                    alt="User dropdown"
                    className="h-10 w-10 object-cover"
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 z-50 mt-12 w-44 rounded border bg-white shadow-lg">
                    <div className="border-b px-4 py-3 text-sm text-gray-900">
                      <div className="font-medium">{user.name}</div>
                      <div className="truncate text-xs">{user.email}</div>
                    </div>
                    <ul className="p-2 text-sm font-medium">
                      <li>
                        <a
                          href="#"
                          className="block w-full rounded p-2 hover:bg-gray-100"
                        >
                          Dashboard
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="block w-full rounded p-2 hover:bg-gray-100"
                        >
                          Settings
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="block w-full rounded p-2 hover:bg-gray-100"
                        >
                          Earnings
                        </a>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            setLoggedIn(false);
                            setUser(null);
                            setDropdownOpen(false);
                            if (onLogout) onLogout();
                          }}
                          className="w-full rounded p-2 text-left text-red-600 hover:bg-gray-100"
                        >
                          Sign out
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => openModal("login")}
                  className="mr-3 text-sm font-medium text-gray-800 hover:underline"
                >
                  Login
                </button>
                <Button onClick={() => openModal("signup")}>Sign up</Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="pointer-events-auto relative z-50 max-h-full w-full max-w-2xl p-4">
            <div className="relative rounded-lg border bg-white p-4 shadow-sm md:p-6">
              <div className="flex items-center justify-between border-b pb-4 md:pb-5">
                <h3 className="text-lg font-medium">
                  {mode === "login" ? "Login" : "Sign up"}
                </h3>
                <button
                  type="button"
                  className="text-body ms-auto inline-flex h-9 w-9 items-center justify-center rounded bg-transparent text-sm hover:bg-gray-100"
                  onClick={closeModal}
                >
                  <svg
                    className="h-5 w-5"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
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
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-4 py-4 md:space-y-6 md:py-6"
              >
                {mode === "signup" && (
                  <div>
                    <label
                      htmlFor="username"
                      className="mb-2.5 block text-sm font-medium"
                    >
                      Username
                    </label>
                    <input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full rounded border bg-gray-50 px-3 py-2.5 text-sm"
                      placeholder="your username"
                      required
                      tabIndex={0}
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2.5 block text-sm font-medium"
                  >
                    Your email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded border bg-gray-50 px-3 py-2.5 text-sm"
                    placeholder="name@flowbite.com"
                    required
                    tabIndex={0}
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2.5 block text-sm font-medium"
                  >
                    Your password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded border bg-gray-50 px-3 py-2.5 text-sm"
                    placeholder="••••••••"
                    required
                    tabIndex={0}
                  />
                </div>

                <label htmlFor="remember" className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border bg-white"
                  />
                  <p className="ms-2 text-sm font-medium select-none">
                    I agree with the{" "}
                    <a href="#" className="text-blue-600 hover:underline">
                      terms and conditions
                    </a>
                    .
                  </p>
                </label>

                <div className="flex items-center space-x-4 pt-4">
                  <button
                    type="submit"
                    className="rounded bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {mode === "login" ? "Submit" : "Create account"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
