"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account/AccountProvider";
import { usePartnerEntry } from "@/components/account/usePartnerEntry";
import SectionNav from "@/components/layout/SectionNav";
import PartnerCatalogue from "@/components/espace/PartnerCatalogue";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import HatchedPanel from "@/components/ui/HatchedPanel";
import Note from "@/components/ui/Note";
import EncaissementSection from "./EncaissementSection";
import ReceiptsSection from "./ReceiptsSection";
import type { RailSection } from "@/components/layout/SectionNav";

/**
 * Les écrans de l'espace partenaire, dans l'ordre, pour le rail latéral.
 * Numérotés depuis 01 comme toute liste numérotée du design.
 */
const SECTIONS: readonly RailSection[] = [
  { id: "encaissement", index: "01", label: "Encaisser" },
  { id: "reseau", index: "02", label: "Réseau" },
  { id: "recettes", index: "03", label: "Recettes" },
];

/**
 * L'espace partenaire : un écran plein par sujet, qui s'accroche au défilement
 * comme la page d'accueil, avec le même rail pour sauter de l'un à l'autre.
 *
 * Deux de ses trois écrans sont ceux du salarié — le réseau, la liste des
 * opérations — parce que ce sont les mêmes objets vus de l'autre côté du
 * comptoir. Seul l'encaissement est propre au partenaire.
 *
 * Pas d'écran « Ma carte » : un partenaire n'en a pas à dépenser, et un plein
 * écran pour montrer une carte barrée coûtait un défilement pour n'apprendre
 * rien. La carte reste sur la fiche d'un partenaire, où elle explique pourquoi
 * le bouton de paiement n'y est pas.
 *
 * Le catalogue est le même composant que dans l'espace salarié, sans
 * adaptation : un partenaire regarde le réseau dont il fait partie.
 *
 * Encaisser et compter ses recettes supposent un établissement conventionné :
 * tant que le Ministère ne l'a pas accepté, les deux écrans s'affichent barrés
 * (voir `gate` plus bas). Le réseau, lui, reste ouvert — consulter le
 * catalogue ne demande l'accord de personne, et c'est ce qui donne au
 * partenaire en attente une raison d'être là.
 */
export default function PartnerSpace() {
  const { profile, ready } = useAccount();
  /* Sa fiche au réseau : le slug que l'encaissement envoie, le tarif proposé,
     et le conventionnement qui décide de tout le reste. Les paramètres posent
     la même question au même endroit — voir account/usePartnerEntry. */
  const { entry: me, loaded } = usePartnerEntry();
  /* Incrémenté à chaque encaissement réussi : c'est le lien entre l'écran qui
     encaisse et celui qui compte. */
  const [encaissements, setEncaissements] = useState(0);

  if (!ready) {
    return <EmptyState variant="page">Chargement de votre espace…</EmptyState>;
  }

  if (!profile) {
    return (
      <Note as="div">
        <strong className="font-black">Connexion requise.</strong>{" "}
        Connectez-vous avec un compte partenaire pour accéder à votre espace.{" "}
        <Link href="/" className="font-black underline underline-offset-4">
          Retour à l&apos;accueil
        </Link>
      </Note>
    );
  }

  /* Ce qui manque au compte pour encaisser, s'il manque quelque chose.
     — "unlisted"   : aucune fiche au catalogue. L'établissement n'est pas
                      référencé du tout, et la raison sociale est la première
                      chose à vérifier — d'où un bouton vers les paramètres.
     — "unofficial" : une fiche, mais pas le conventionnement. Il n'y a rien à
                      faire qu'attendre, donc pas d'action : un bouton qui
                      n'avance à rien se lit comme une porte, alors que c'en
                      est une fermée.
     Rien avant `loaded` : barrer l'espace le temps d'une requête ferait
     clignoter un refus à un partenaire parfaitement en règle. */
  const gate = !loaded
    ? null
    : me === null
      ? "unlisted"
      : me.officiel
        ? null
        : "unofficial";

  /* Le même panneau que la carte de la fiche partenaire : l'écran reste
     visible dessous, hachuré, et la raison se lit par-dessus. Montrer
     l'encaissement inutilisable répond à « où est-ce ? » ; l'escamoter
     laisserait la question entière. */
  const barrer = (screen: React.ReactNode, quoi: string) =>
    gate === null ? (
      screen
    ) : (
      <HatchedPanel
        /* Un écran plein se barre jusqu'aux bords de la fenêtre : les
           hachures arrêtées à la colonne de contenu laissaient deux bandes
           blanches, et la page ne se lisait plus comme fermée. */
        bleed
        reason={
          gate === "unlisted" ? (
            <>
              Votre établissement n&apos;est pas encore référencé au réseau, et{" "}
              {quoi} en a besoin. Vérifiez que la raison sociale de vos
              paramètres est exactement celle du réseau.
            </>
          ) : (
            <>
              Votre compte attend le{" "}
              <strong className="font-black">conventionnement</strong> du
              Ministère : un administrateur doit accepter votre établissement
              comme Partenaire Officiel pour ouvrir {quoi}.
            </>
          )
        }
        action={
          gate === "unlisted" ? (
            <Button href="/parametres" arrow>
              Vérifier ma fiche
            </Button>
          ) : undefined
        }
      >
        {screen}
      </HatchedPanel>
    );

  return (
    <>
      {barrer(
        <EncaissementSection
          partnerId={me?.id ?? null}
          defaultAmountCents={me?.amountCents ?? 0}
          onEncaisse={() => setEncaissements((count) => count + 1)}
        />,
        "l\u2019encaissement",
      )}

      <PartnerCatalogue />

      {/* `access` coupe la requête et vide la liste : sans lui, l'écran barré
          affichait de vraies recettes sous les hachures, ce qui contredisait
          la raison affichée par-dessus — et lançait l'appel quand même. */}
      {barrer(
        <ReceiptsSection
          refreshKey={encaissements}
          access={!loaded ? "pending" : gate === null ? "open" : "locked"}
        />,
        "le tableau de vos recettes",
      )}

      <SectionNav sections={SECTIONS} />
    </>
  );
}
