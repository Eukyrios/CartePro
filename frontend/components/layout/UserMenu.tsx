"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
/** The signed-in person shown in the menu header. */
export type AuthUser = {
  name: string;
  email: string;
};

type Props = {
  user: AuthUser;
  onSignOut: () => void;
};

/** Navigation entries listed above the sign-out action, in display order. */
const MENU_LINKS = [
  { label: "Tableau de bord", href: "#" },
  { label: "Paramètres", href: "/parametres" },
  { label: "Revenus", href: "#" },
];

const ITEM_CLASS =
  "hover:bg-neutral-tertiary-medium hover:text-heading block w-full rounded-md p-2";

/** Avatar button and the dropdown it toggles, for a signed-in user. */
export default function UserMenu({ user, onSignOut }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the user dropdown when clicking anywhere outside of it.
  useEffect(() => {
    if (!dropdownOpen) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [dropdownOpen]);

  return (
    <div ref={dropdownRef} className="relative flex items-center">
      <button
        id="avatarButton"
        type="button"
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
        onClick={() => setDropdownOpen((s) => !s)}
        className="bg-neutral-secondary-medium relative h-10 w-10 cursor-pointer overflow-hidden rounded-full focus:outline-none"
      >
        <svg
          className="text-body-subtle absolute top-0 -left-1 h-12 w-12"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
        <span className="sr-only">Menu utilisateur</span>
      </button>

      {dropdownOpen && (
        <div
          id="userDropdown"
          aria-labelledby="avatarButton"
          className="bg-neutral-primary-medium border-default-medium rounded-base absolute top-full right-0 z-50 mt-2 w-44 border shadow-lg"
        >
          <div className="border-default-medium text-heading border-b px-4 py-3 text-sm">
            <div className="font-medium">{user.name}</div>
            <div className="truncate">{user.email}</div>
          </div>
          <ul className="text-body p-2 text-sm font-medium">
            {MENU_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  onClick={() => setDropdownOpen(false)}
                  className={ITEM_CLASS}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onSignOut();
                }}
                className="hover:bg-neutral-tertiary-medium text-fg-danger block w-full rounded-md p-2 text-left"
              >
                Se déconnecter
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
