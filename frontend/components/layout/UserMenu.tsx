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
const MENU_LINKS = [{ label: "Paramètres", href: "/parametres" }];

/** Square, uppercase micro-type rows, as everywhere else in the design. */
const ITEM_CLASS =
  "hover:bg-cp-surface hover:text-cp-fg block w-full rounded-none px-4 py-3 text-[9px] font-black tracking-[0.16em] uppercase";

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
        className="bg-cp-accent focus-visible:outline-cp-fg relative size-10 cursor-pointer rounded-full text-[15px] font-black text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
        <span className="sr-only">Menu utilisateur</span>
      </button>

      {dropdownOpen && (
        <div
          id="userDropdown"
          aria-labelledby="avatarButton"
          className="bg-cp-page border-cp-fg absolute top-full right-0 z-50 mt-2 w-52 rounded-none border-2"
        >
          <div className="border-cp-border border-b px-4 py-3.5">
            <div className="text-cp-fg truncate text-[13px] font-black tracking-[-0.03em]">
              {user.name}
            </div>
            <div className="text-cp-muted truncate text-[11px]">
              {user.email}
            </div>
          </div>
          <ul className="text-cp-muted">
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
                className={`${ITEM_CLASS} border-cp-border text-fg-danger border-t text-left`}
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
