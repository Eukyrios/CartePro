"use client";

import { useState } from "react";
import Link from "next/link";
import AvatarColorForm from "./AvatarColorForm";
import CardStyleForm from "./CardStyleForm";
import ThemeForm from "./ThemeForm";
import DeleteAccountCard from "./DeleteAccountCard";
import PresentationForm from "./PresentationForm";
import ProfileForm from "./ProfileForm";
import {
  displayNameOf,
  useAccount,
} from "@/components/account/AccountProvider";
import { usePartnerEntry } from "@/components/account/usePartnerEntry";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Display from "@/components/ui/Display";
import EmptyState from "@/components/ui/EmptyState";
import IdentityStrip from "@/components/ui/IdentityStrip";
import Note from "@/components/ui/Note";
import Panel from "@/components/ui/Panel";
import { MICRO } from "@/components/ui/surfaces";
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
type SectionId = "profil" | "presentation" | "style" | "securite" | "danger";

/**
 * Ce que la pastille d'identité affiche, selon le compte.
 *
 * « En attente de confirmation » n'est pas un ornement : c'est la réponse à la
 * question que le partenaire vient poser ici quand son espace lui refuse
 * l'encaissement. Le libellé conventionné est celui du réseau, mot pour mot,
 * pour qu'une même distinction ne s'écrive pas de deux façons.
 */
const STATUT_LABEL = {
  administration: "Administration",
  employe: "Employé",
  partenaire: "Partenaire",
  attente: "Partenaire en attente de confirmation",
  officiel: "Partenaire Officiel de l'administration",
} as const;

const PenIcon: FC<ComponentProps<"svg">> = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.379-8.379-2.828-2.828z" />
  </svg>
);

/**
 * Les sections, dans l'ordre d'affichage. Le numéro n'est pas écrit ici : il
 * est calculé **après** le filtrage par audience, sinon un partenaire voyait
 * « 01, 03, 04 » — le 02 réservé au style de carte laissant un trou dans une
 * liste dont il ne connaît pas les absents.
 */
const SECTIONS: ReadonlyArray<{
  id: SectionId;
  label: string;
  icon: FC<ComponentProps<"svg">>;
  /**
   * Employé only — a partenaire has no card to style.
   *
   * L'administration n'est pas un partenaire, donc elle voit « Style » : le
   * panneau y montre le thème du site et non une carte, puisqu'elle n'en a pas.
   * Voir le branchement sur `isAdmin` plus bas.
   */
  employeeOnly?: boolean;
  /** Partenaire only — un salarié n'a pas de fiche à présenter. */
  partnerOnly?: boolean;
}> = [
  { id: "profil", label: "Profil", icon: UserIcon },
  {
    id: "presentation",
    label: "Présentation",
    icon: PenIcon,
    partnerOnly: true,
  },
  { id: "style", label: "Style", icon: PaletteIcon, employeeOnly: true },
  { id: "securite", label: "Sécurité", icon: LockIcon },
  { id: "danger", label: "Zone de danger", icon: TrashIcon },
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
  /* Le conventionnement vient du réseau, et de la même source que l'espace
     partenaire : les deux écrans doivent dire la même chose, sinon les
     paramètres décernent un titre officiel au-dessus d'un espace verrouillé. */
  const { entry: partnerEntry, loaded: partnerLoaded } = usePartnerEntry();
  const [section, setSection] = useState<SectionId>("profil");

  // The stored session is only readable after mount, so hold the page back
  // rather than flashing the signed-out prompt at someone who is signed in.
  if (!ready) {
    return <EmptyState variant="page">Chargement du compte…</EmptyState>;
  }

  if (!profile) {
    return (
      <Note as="div">
        <strong className="font-black">Connexion requise.</strong> Connecte-toi
        pour accéder aux paramètres de ton compte.{" "}
        <Link href="/" className="font-black underline underline-offset-4">
          Retour à l&apos;accueil
        </Link>
      </Note>
    );
  }

  const isPartner = profile.audience === "partner";
  /* L'administration édite l'identité visuelle du site là où un salarié édite
     celle de sa carte : c'est le même onglet, parce que c'est la même
     question — « à quoi cela ressemble » — posée à la hauteur de chacun. */
  const isAdmin = profile.role === "admin";
  const profileTitle = isPartner
    ? "Informations de l'entreprise"
    : "Mon profil";
  const sections = SECTIONS.filter(
    (entry) =>
      (!entry.employeeOnly || !isPartner) && (!entry.partnerOnly || isPartner),
  ).map((entry, position) => ({
    ...entry,
    index: String(position + 1).padStart(2, "0"),
  }));
  // Guards the case where the audience changes while the panel is open.
  const shown = sections.some((entry) => entry.id === section)
    ? section
    : "profil";

  /* Ce que la pastille annonce. « partenaire » couvre les deux moments où le
     conventionnement n'est pas une réponse : la requête en cours, et un
     établissement absent du réseau — dans les deux cas, affirmer « en attente
     de confirmation » serait une déduction, pas une information. */
  /* Le rôle avant l'audience, comme `AccountSpace` : le profil d'un
     administrateur porte `audience: "employee"` — ce champ ne dit que « pas
     partenaire » — si bien que l'agent de l'administration se voyait remettre
     une pastille « Employé » au-dessus de ses propres paramètres. */
  const statut: keyof typeof STATUT_LABEL = isAdmin
    ? "administration"
    : !isPartner
      ? "employe"
      : !partnerLoaded
        ? "partenaire"
        : partnerEntry === null
          ? "partenaire"
          : partnerEntry.officiel
            ? "officiel"
            : "attente";

  return (
    <>
      <Breadcrumb
        trail={[{ label: "Accueil", href: "/" }, { label: "Paramètres" }]}
        className="mb-9"
      />

      <Display level={1} accent="du compte." className="mb-5">
        Paramètres
      </Display>
      <p className="text-cp-muted mb-10 max-w-[520px] text-sm leading-[1.55]">
        {isPartner
          ? "Gère les informations de ton entreprise et ton compte."
          : "Gère les informations de ton profil et ton compte."}
      </p>

      {/* Une seule pastille, qui dit le compte et son statut d'un même souffle
          — parce que pour un partenaire les deux ne se lisent pas séparément :
          savoir qu'on est « Partenaire » sans savoir si l&apos;administration a
          conventionné l'établissement n'apprend pas ce qu'on est venu vérifier.
          L'ochre reste réservé au conventionnement accordé ; l'attente est
          neutre, car ce n'est pas une distinction. */}
      <IdentityStrip
        name={displayNameOf(profile)}
        email={profile.email}
        className="mb-10"
      >
        <Chip
          tone={statut === "officiel" ? "official" : "plain"}
          className="ms-auto"
        >
          {STATUT_LABEL[statut]}
        </Chip>
      </IdentityStrip>

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
                    /* "true" et non "page" : commuter un panneau ne change pas
                       de document, et le rail de sections dit déjà "true". */
                    aria-current={active ? "true" : undefined}
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
            <Panel as="section">
              <Display level={2} scale="panel">
                {profileTitle}
              </Display>
              <ProfileForm profile={profile} onSave={updateProfile} />
            </Panel>
          )}

          {shown === "presentation" && (
            <Panel as="section">
              <Display level={2} scale="panel">
                Votre présentation
              </Display>
              <Panel.Lead>
                Le texte qui paraît sur votre fiche, sous votre photographie.
                Vous l&apos;écrivez, vous le mettez en forme, et vous y mettez
                l&apos;adresse de votre site.
              </Panel.Lead>
              <PresentationForm profile={profile} onSave={updateProfile} />
            </Panel>
          )}

          {shown === "style" &&
            (isAdmin ? (
              <Panel as="section">
                <Display level={2} scale="panel">
                  Style du site
                </Display>
                <Panel.Lead>
                  L&apos;identité visuelle de CartePro : le nom de la marque,
                  les deux polices, et les couleurs des thèmes clair et sombre.
                  Ce qui est enregistré ici est écrit dans{" "}
                  <code>backend/theme.json</code> et s&apos;applique à tous les
                  écrans, sans recompiler.
                </Panel.Lead>
                <ThemeForm />
              </Panel>
            ) : (
              <Panel as="section">
                <Display level={2} scale="panel">
                  Style de la carte
                </Display>
                <Panel.Lead>
                  Personnalise la carte affichée sur ton espace : couleur,
                  motif, texte et effet métallisé.
                </Panel.Lead>
                <CardStyleForm profile={profile} onSave={updateProfile} />
              </Panel>
            ))}

          {/* La vignette du compte, dans le même onglet que la carte : les
              deux répondent à « à quoi ressemble mon compte ». Deux panneaux
              et non un seul formulaire, parce que les deux s'enregistrent
              séparément — changer sa couleur d'avatar n'a pas à faire repartir
              le style de carte au serveur. */}
          {shown === "style" && (
            <Panel as="section" className="mt-8">
              <Display level={2} scale="panel">
                Vignette du compte
              </Display>
              <Panel.Lead>
                La couleur de l&apos;aplat sur lequel se pose votre initiale.
                Elle a été tirée au hasard à la création du compte.
              </Panel.Lead>
              <AvatarColorForm profile={profile} onSave={updateProfile} />
            </Panel>
          )}

          {shown === "securite" && (
            <Panel as="section">
              <Display level={2} scale="panel">
                Connexion et sécurité
              </Display>
              <Panel.Lead>
                L&apos;adresse email sert d&apos;identifiant de connexion et se
                modifie depuis «&nbsp;{profileTitle}&nbsp;». Le changement de
                mot de passe arrivera avec le backend.
              </Panel.Lead>
              <Button disabled className="mt-7">
                Changer le mot de passe
              </Button>
            </Panel>
          )}

          {shown === "danger" && (
            <Panel as="section">
              <Display level={2} scale="panel">
                Zone de danger
              </Display>
              <DeleteAccountCard onConfirm={deleteAccount} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
