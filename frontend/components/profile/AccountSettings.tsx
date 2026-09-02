"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  Sidebar,
  SidebarItem,
  SidebarItemGroup,
  SidebarItems,
  Spinner,
} from "flowbite-react";
import DeleteAccountCard from "./DeleteAccountCard";
import ProfileForm from "./ProfileForm";
import {
  displayNameOf,
  useAccount,
} from "@/components/account/AccountProvider";
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

/**
 * Sections listed in the side panel, in display order. Labels are kept short
 * enough to fit the rail: the pane beside it carries the full heading.
 */
type SectionId = "profil" | "securite" | "danger";

const SECTIONS: ReadonlyArray<{
  id: SectionId;
  label: string;
  icon: FC<ComponentProps<"svg">>;
}> = [
  { id: "profil", label: "Profil", icon: UserIcon },
  { id: "securite", label: "Sécurité", icon: LockIcon },
  { id: "danger", label: "Zone de danger", icon: TrashIcon },
];

/**
 * The /parametres screen: a side panel picks the section, the pane beside it
 * shows only that one. Signed-out visitors get a prompt instead, since every
 * section edits the signed-in account.
 */
export default function AccountSettings() {
  const { profile, ready, updateProfile, deleteAccount } = useAccount();
  const [section, setSection] = useState<SectionId>("profil");

  // The stored session is only readable after mount, so hold the page back
  // rather than flashing the signed-out prompt at someone who is signed in.
  if (!ready) {
    return (
      <div className="flex justify-center py-24">
        <Spinner aria-label="Chargement du compte" size="xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Alert color="info">
        <span className="font-medium">Connexion requise.</span> Connecte-toi
        pour accéder aux paramètres de ton compte.{" "}
        <Link href="/" className="underline">
          Retour à l&apos;accueil
        </Link>
      </Alert>
    );
  }

  const isPartner = profile.audience === "partner";
  const profileTitle = isPartner
    ? "Informations de l'entreprise"
    : "Mon profil";

  return (
    <>
      <Breadcrumb aria-label="Fil d'Ariane" className="mb-6">
        <BreadcrumbItem href="/">Accueil</BreadcrumbItem>
        <BreadcrumbItem>Paramètres</BreadcrumbItem>
      </Breadcrumb>

      <h1 className="text-heading mb-1 text-2xl font-semibold">
        Paramètres du compte
      </h1>
      <p className="text-body mb-6 text-sm">
        {isPartner
          ? "Gère les informations de ton entreprise et ton compte."
          : "Gère les informations de ton profil et ton compte."}
      </p>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar rounded size="md" alt="" />
          <div className="min-w-0">
            <div className="text-heading truncate font-medium">
              {displayNameOf(profile)}
            </div>
            <div className="text-body truncate text-sm">{profile.email}</div>
          </div>
          <Badge color={isPartner ? "purple" : "info"} className="ms-auto">
            {isPartner ? "Partenaire" : "Employé"}
          </Badge>
        </div>
      </Card>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <Sidebar
          aria-label="Sections des paramètres"
          className="w-full md:w-64 md:shrink-0"
        >
          <SidebarItems>
            <SidebarItemGroup>
              {SECTIONS.map((entry) => (
                <SidebarItem
                  key={entry.id}
                  as="button"
                  icon={entry.icon}
                  active={section === entry.id}
                  aria-current={section === entry.id ? "page" : undefined}
                  onClick={() => setSection(entry.id)}
                  // justify-start overrides the theme's justify-center, which
                  // would otherwise centre each row and leave the icons on
                  // different vertical lines from one another.
                  className="w-full cursor-pointer justify-start text-left"
                >
                  {entry.label}
                </SidebarItem>
              ))}
            </SidebarItemGroup>
          </SidebarItems>
        </Sidebar>

        <div className="min-w-0 flex-1">
          {section === "profil" && (
            <Card>
              <h2 className="text-heading text-lg font-semibold">
                {profileTitle}
              </h2>
              <ProfileForm profile={profile} onSave={updateProfile} />
            </Card>
          )}

          {section === "securite" && (
            <Card>
              <h2 className="text-heading text-lg font-semibold">
                Connexion et sécurité
              </h2>
              <p className="text-body text-sm">
                L&apos;adresse email sert d&apos;identifiant de connexion et se
                modifie depuis «&nbsp;{profileTitle}&nbsp;». Le changement de
                mot de passe arrivera avec le backend.
              </p>
              <Button color="light" disabled className="w-fit">
                Changer le mot de passe
              </Button>
            </Card>
          )}

          {section === "danger" && (
            <Card>
              <h2 className="text-heading text-lg font-semibold">
                Zone de danger
              </h2>
              <DeleteAccountCard onConfirm={deleteAccount} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
