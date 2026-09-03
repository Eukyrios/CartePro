"use client";

import { useState } from "react";
import Link from "next/link";
import CardStyleForm from "./CardStyleForm";
import DeleteAccountCard from "./DeleteAccountCard";
import ProfileForm from "./ProfileForm";
import {
  displayNameOf,
  useAccount,
} from "@/components/account/AccountProvider";
import { Eyebrow } from "@/components/home/Marks";
import {
  BTN_OUTLINE,
  CHIP_OFFICIAL,
  CHIP_PLAIN,
  MICRO,
  NOTE_INFO,
  PANEL,
  PANEL_HEADING,
  PANEL_LEAD,
} from "@/components/ui/surfaces";
import type { ComponentProps, FC } from "react";

const UserIcon: FC<ComponentProps<"svg">> = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
      clipRule="evenodd"
    />
  </svg>
);

const LockIcon: FC<ComponentProps<"svg">> = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
      clipRule="evenodd"
    />
  </svg>
);

const TrashIcon: FC<ComponentProps<"svg">> = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const PaletteIcon: FC<ComponentProps<"svg">> = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M10 2a8 8 0 100 16 2 2 0 002-2v-.5a1.5 1.5 0 011.5-1.5H16a2 2 0 002-2 8 8 0 00-8-8zM5.5 11a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm2-4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm2.5 3a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * Sections listed in the side rail, in display order. Labels are kept short
 * enough to fit it: the panel beside it carries the full heading.
 */
type SectionId = "profil" | "style" | "securite" | "danger";

const SECTIONS: ReadonlyArray<{
  id: SectionId;
  label: string;
  /** Two digits, as every numbered list in the design is numbered. */
  index: string;
  icon: FC<ComponentProps<"svg">>;
  /** Employé only — a partenaire has no card to style. */
  employeeOnly?: boolean;
}> = [
  { id: "profil", label: "Profil", index: "01", icon: UserIcon },
  {
    id: "style",
    label: "Style",
    index: "02",
    icon: PaletteIcon,
    employeeOnly: true,
  },
  { id: "securite", label: "Sécurité", index: "03", icon: LockIcon },
  { id: "danger", label: "Zone de danger", index: "04", icon: TrashIcon },
];

/**
 * The /parametres screen: a side rail picks the section, the panel beside it
 * shows only that one. Signed-out visitors get a prompt instead, since every
 * section edits the signed-in account.
 *
 * Built from the landing page's flat vocabulary (see ui/surfaces) rather than
 * Flowbite's Card / Sidebar / Breadcrumb / Avatar / Badge: those carry rounded
 * corners, soft shadows and their own `dark:` colours, none of which this
 * design uses, and all of which have to be fought class by class.
 */
export default function AccountSettings() {
  const { profile, ready, updateProfile, deleteAccount } = useAccount();
  const [section, setSection] = useState<SectionId>("profil");

  // The stored session is only readable after mount, so hold the page back
  // rather than flashing the signed-out prompt at someone who is signed in.
  if (!ready) {
    return (
      <p className={`text-cp-muted py-24 text-center ${MICRO}`}>
        Chargement du compte…
      </p>
    );
  }

  if (!profile) {
    return (
      <div className={NOTE_INFO}>
        <strong className="font-black">Connexion requise.</strong> Connecte-toi
        pour accéder aux paramètres de ton compte.{" "}
        <Link href="/" className="font-black underline underline-offset-4">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  const isPartner = profile.audience === "partner";
  const profileTitle = isPartner
    ? "Informations de l'entreprise"
    : "Mon profil";
  const sections = SECTIONS.filter(
    (entry) => !entry.employeeOnly || !isPartner,
  );
  // Guards the case where the audience changes while the panel is open.
  const shown = sections.some((entry) => entry.id === section)
    ? section
    : "profil";

  return (
    <>
      {/* The trail reads like the hero's meta rows: micro-type, accent slash. */}
      <nav aria-label="Fil d'Ariane" className={`mb-9 flex gap-2 ${MICRO}`}>
        <Link href="/" className="text-cp-muted hover:text-cp-fg">
          Accueil
        </Link>
        <span className="text-cp-accent" aria-hidden="true">
          /
        </span>
        <span className="text-cp-fg">Paramètres</span>
      </nav>

      <Eyebrow>MON COMPTE</Eyebrow>
      <h1 className="mt-4 mb-5 text-[clamp(38px,5.4vw,64px)] leading-[0.84] font-black tracking-[-0.07em]">
        Paramètres
        <br />
        <em className="text-cp-accent font-serif font-normal">du compte.</em>
      </h1>
      <p className="text-cp-muted mb-10 max-w-[520px] text-sm leading-[1.55]">
        {isPartner
          ? "Gère les informations de ton entreprise et ton compte."
          : "Gère les informations de ton profil et ton compte."}
      </p>

      {/* Identity strip: rules above and below rather than a floating card, so
          it reads as part of the page's grid. */}
      <div className="border-t-cp-fg border-b-cp-border mb-10 flex flex-wrap items-center gap-5 border-t-2 border-b py-5">
        <span
          aria-hidden="true"
          className="bg-cp-accent flex size-11 shrink-0 items-center justify-center rounded-full text-[16px] font-black text-white"
        >
          {displayNameOf(profile).charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="text-cp-fg truncate text-[15px] font-black tracking-[-0.03em]">
            {displayNameOf(profile)}
          </div>
          <div className="text-cp-muted truncate text-[12px]">
            {profile.email}
          </div>
        </div>
        {/* A partner's own profile carries the ministry's mark, in the ochre
            accent the palette reserves for what the ministry vouches for. */}
        <span className={`ms-auto ${isPartner ? CHIP_OFFICIAL : CHIP_PLAIN}`}>
          {isPartner ? "Partenaire Officiel du Ministère" : "Employé"}
        </span>
      </div>

      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <nav
          aria-label="Sections des paramètres"
          className="border-cp-fg w-full border-t-2 md:w-56 md:shrink-0"
        >
          <ul>
            {sections.map((entry) => {
              const active = shown === entry.id;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => setSection(entry.id)}
                    className={`border-cp-border flex w-full cursor-pointer items-center gap-3 border-b py-3.5 text-left ${MICRO} ${
                      active
                        ? "text-cp-accent"
                        : "text-cp-muted hover:text-cp-fg"
                    }`}
                  >
                    <span className="text-[10px]">{entry.index}</span>
                    <entry.icon className="size-3.5 shrink-0" />
                    {entry.label}
                    {/* Square marker, the design's one active-state device. */}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="bg-cp-accent ms-auto size-1.5"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          {shown === "profil" && (
            <section className={PANEL}>
              <h2 className={PANEL_HEADING}>{profileTitle}</h2>
              <ProfileForm profile={profile} onSave={updateProfile} />
            </section>
          )}

          {shown === "style" && (
            <section className={PANEL}>
              <h2 className={PANEL_HEADING}>Style de la carte</h2>
              <p className={PANEL_LEAD}>
                Personnalise la carte affichée sur ton espace : couleur, motif,
                texte et effet métallisé.
              </p>
              <CardStyleForm profile={profile} onSave={updateProfile} />
            </section>
          )}

          {shown === "securite" && (
            <section className={PANEL}>
              <h2 className={PANEL_HEADING}>Connexion et sécurité</h2>
              <p className={PANEL_LEAD}>
                L&apos;adresse email sert d&apos;identifiant de connexion et se
                modifie depuis «&nbsp;{profileTitle}&nbsp;». Le changement de
                mot de passe arrivera avec le backend.
              </p>
              <button type="button" disabled className={`${BTN_OUTLINE} mt-7`}>
                Changer le mot de passe
              </button>
            </section>
          )}

          {shown === "danger" && (
            <section className={PANEL}>
              <h2 className={PANEL_HEADING}>Zone de danger</h2>
              <DeleteAccountCard onConfirm={deleteAccount} />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
