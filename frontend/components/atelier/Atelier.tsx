"use client";

import { useState } from "react";
import * as UI from "@/components/ui";
import type { Partner } from "@/components/data/partners";
import { DISPLAY, MICRO } from "@/components/ui/surfaces";
import { Avatar, NameEmail } from "@/components/ui/IdentityStrip";
import PartnerPhoto from "@/components/ui/PartnerPhoto";
import type { ReactNode } from "react";

/**
 * L'atelier : un spécimen par élément de la bibliothèque, et un contrôle qui
 * se plaint tout seul.
 *
 * Le contrôle est le point : la page importe le baril `components/ui` en entier
 * et compare ses exports à la liste des spécimens. Tout composant exporté sans
 * spécimen s'affiche en rouge, en haut, dès le premier chargement — c'est le
 * seul mécanisme qui tient la bibliothèque et sa documentation ensemble dans un
 * dépôt sans lanceur de tests.
 *
 * Trois vérifications complémentaires, à passer à la main avant de livrer :
 *
 *   grep -rn 'text-\[9px\] font-black' components app
 *     → seulement surfaces.ts (MICRO). Tout le reste passe par <Micro>.
 *
 *   grep -rn 'text-\[clamp(' components app
 *     → surfaces.ts (DISPLAY), plus trois exceptions assumées, qui ne sont pas
 *       des titres : le chiffre filigrane du deck (StepsDeck), la phrase à
 *       taille d'affichage du solde (BalanceSection), et les trois tailles du
 *       ticket QR de l'accueil (PaymentQr), qui vivent dans un panneau à
 *       proportions fixes.
 *
 *   grep -rln 'flowbite' components/profile components/auth
 *     → seulement AuthModal, pour ses onglets : <dialog> ne donne rien pour
 *       une liste d'onglets, et le tabindex glissant est ce que les listes
 *       faites main ratent.
 */

type Specimen = { name: string; note?: string; render: () => ReactNode };

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="border-cp-border bg-cp-page border p-6">{children}</div>
  );
}

export default function Atelier() {
  const [text, setText] = useState("Crêperie");
  const [choice, setChoice] = useState("");
  const [open, setOpen] = useState(false);
  const [markdown, setMarkdown] = useState(
    "# Ce que nous faisons\n\n" +
      "Un manège **couvert**, ouvert *toute l'année*, à vingt minutes de la gare.\n\n" +
      "- baptêmes à poney pour les plus jeunes\n" +
      "- balades encadrées en forêt\n\n" +
      "> Fermé le lundi.\n\n" +
      "Réservations sur [notre site](https://poney-dream-78.fr) ou au `01 34 xx xx xx`.",
  );
  /* Un spécimen écrit ici, et non pris dans le réseau : l'atelier montre des
     composants, pas des données. Il ne doit rien demander au serveur pour
     s'afficher, et un partenaire inventé fait aussi bien l'affaire qu'un
     vrai — c'est même plus honnête, puisque c'est un mannequin. */
  const partner: Partner = {
    id: "atelier-specimen",
    name: "Crêperie d'Armor",
    categoryId: "restauration",
    address: "3 quai des Sables",
    city: "Vannes",
    postcode: "56000",
    photo: "/partenaires/creperie-armor.svg",
    amountCents: 1200,
    official: true,
    real: false,
  };

  const GROUPS: { title: string; specimens: Specimen[] }[] = [
    {
      title: "Typographie",
      specimens: [
        {
          name: "Display",
          note: "Cinq échelles, et la seule place où un clamp() de titre peut s'écrire. Une sixième ligne ici voudrait dire une sixième échelle.",
          render: () => (
            <div className="grid gap-6">
              {(Object.keys(DISPLAY) as (keyof typeof DISPLAY)[]).map(
                (scale) => (
                  <div key={scale}>
                    <UI.Micro tone="muted" className="mb-2 block">
                      {scale}
                    </UI.Micro>
                    <UI.Display level={2} scale={scale} accent="autrement.">
                      Dépenser
                    </UI.Display>
                  </div>
                ),
              )}
              <div>
                <UI.Micro tone="muted" className="mb-2 block">
                  accent sur la même ligne (br=false)
                </UI.Micro>
                <UI.Display level={2} accent="." br={false}>
                  Le réseau
                </UI.Display>
              </div>
            </div>
          ),
        },
        {
          name: "Micro",
          render: () => (
            <div className="flex flex-wrap items-baseline gap-5">
              <UI.Micro>fg</UI.Micro>
              <UI.Micro tone="muted">muted</UI.Micro>
              <UI.Micro tone="accent">accent</UI.Micro>
              <UI.Micro tone="official">official</UI.Micro>
            </div>
          ),
        },
        {
          name: "Slash",
          note: "Toujours aria-hidden : de la ponctuation en couleur, pas un mot.",
          render: () => (
            <UI.Micro>
              Le rang défile
              <UI.Slash />
              glissez-le
            </UI.Micro>
          ),
        },
      ],
    },
    {
      title: "Surfaces",
      specimens: [
        {
          name: "Panel",
          render: () => (
            <UI.Panel>
              <UI.Display level={3} scale="panel">
                Mon profil
              </UI.Display>
              <UI.Panel.Lead>
                La ligne muette sous un titre de panneau.
              </UI.Panel.Lead>
            </UI.Panel>
          ),
        },
        {
          name: "Note",
          render: () => (
            <div className="grid gap-3">
              <UI.Note>Connexion requise pour accéder à cet espace.</UI.Note>
              <UI.Note tone="danger" role="alert">
                Paiement refusé : 25,00 € dépassent votre solde.
              </UI.Note>
              <UI.Note tone="positive" role="status">
                Modifications enregistrées.
              </UI.Note>
            </div>
          ),
        },
        {
          name: "Chip",
          note: "Une seule taille : le même mot à trois tailles, c'était trois prétentions différentes à l'officialité. Trois teintes : garanti, neutre, en retrait.",
          render: () => (
            <div className="flex flex-wrap gap-3">
              <UI.Chip>Employé</UI.Chip>
              <UI.Chip tone="official">
                Partenaire Officiel de l&apos;administration
              </UI.Chip>
              <UI.Chip tone="muted">Fiche de démonstration</UI.Chip>
            </div>
          ),
        },
        {
          name: "SimulationNotice",
          render: () => (
            <UI.SimulationNotice>
              Simulation — ce QR ne débite rien de réel
            </UI.SimulationNotice>
          ),
        },
        {
          name: "EmptyState",
          render: () => (
            <div className="grid gap-4">
              <UI.EmptyState>
                Aucun partenaire ne correspond à cette recherche.
              </UI.EmptyState>
              <UI.EmptyState variant="page">
                Chargement de votre espace…
              </UI.EmptyState>
            </div>
          ),
        },
        {
          name: "HatchedPanel",
          note: "Ce qu'un partenaire voit à la place de la carte de paiement : le contenu reste visible, barré, et la raison est du vrai texte par-dessus. Cacher l'objet laisserait « où est ma carte ? » sans réponse.",
          render: () => (
            <UI.HatchedPanel
              className="max-w-[420px]"
              reason={
                <>
                  Cette carte appartient aux salariés. En tant que partenaire,
                  vous <strong className="font-black">encaissez</strong>.
                </>
              }
              action={<UI.Button>Encaisser un paiement</UI.Button>}
            >
              <div className="bg-cp-surface border-cp-border h-[220px] border" />
            </UI.HatchedPanel>
          ),
        },
        {
          name: "BlueprintFrame",
          render: () => (
            <div className="grid gap-5 sm:grid-cols-2">
              <UI.BlueprintFrame className="max-w-[220px]">
                <UI.Micro tone="muted">coarse</UI.Micro>
              </UI.BlueprintFrame>
              <UI.BlueprintFrame pitch="fine" className="max-w-[220px]">
                <UI.Micro tone="muted">fine</UI.Micro>
              </UI.BlueprintFrame>
            </div>
          ),
        },
      ],
    },
    {
      title: "Commandes",
      specimens: [
        {
          name: "Button",
          render: () => (
            <div className="flex flex-wrap items-center gap-3">
              <UI.Button variant="solid">Enregistrer</UI.Button>
              <UI.Button>Annuler</UI.Button>
              <UI.Button variant="danger">Supprimer</UI.Button>
              <UI.Button href="/espace" arrow>
                Mon espace
              </UI.Button>
              <UI.Button variant="solid" disabled>
                Désactivé
              </UI.Button>
            </div>
          ),
        },
        {
          name: "IconButton",
          render: () => (
            <div className="flex flex-wrap items-center gap-3">
              <UI.IconButton label="Précédent">←</UI.IconButton>
              <UI.IconButton label="Suivant">→</UI.IconButton>
              <UI.IconButton label="Fermer" variant="ghost">
                ✕
              </UI.IconButton>
              <UI.IconButton label="Précédent" disabled>
                ←
              </UI.IconButton>
            </div>
          ),
        },
        {
          name: "TextField",
          render: () => (
            <UI.FieldGrid>
              <UI.TextField
                id="atelier-nom"
                label="Nom ou adresse"
                value={text}
                onChange={setText}
                hint="L'indication est lue par un lecteur d'écran."
              />
              <UI.TextField
                id="atelier-siren"
                label="SIREN"
                value="123"
                onChange={() => {}}
                error="SIREN invalide : 9 chiffres."
              />
            </UI.FieldGrid>
          ),
        },
        {
          name: "TextArea",
          note: "Les classes de TextField, une hauteur à soi. `aria-describedby` porte l'indication et l'erreur.",
          render: () => (
            <div className="grid gap-6">
              <UI.TextArea
                id="atelier-presentation"
                label="Votre présentation"
                value={markdown}
                onChange={setMarkdown}
                rows={7}
                hint="Mise en forme Markdown, comme dans un salon de discussion."
              />
              <UI.TextArea
                id="atelier-presentation-erreur"
                label="Texte refusé"
                value="…"
                onChange={() => {}}
                rows={2}
                error="Texte trop long : 1200 caractères au maximum."
              />
            </div>
          ),
        },
        {
          name: "Markdown",
          note: "Le sous-ensemble de Discord, rendu en éléments React — jamais en HTML fabriqué depuis la chaîne. Éditez le champ ci-dessus pour voir le rendu suivre.",
          render: () => (
            <div className="grid gap-6 lg:grid-cols-2">
              <UI.Markdown>{markdown}</UI.Markdown>
              {/* Ce que le rendu refuse : un protocole exécutable reste du
                  texte, il ne devient pas un lien. */}
              <UI.Markdown>
                {"Un lien piégé — [cliquez](javascript:alert(1)) — reste du texte.\n\n" +
                  "```\nun bloc de code\n  garde ses espaces\n```"}
              </UI.Markdown>
            </div>
          ),
        },
        {
          name: "SelectField",
          render: () => (
            <UI.FieldGrid>
              <UI.SelectField
                id="atelier-cat"
                label="Catégorie"
                value={choice}
                onChange={setChoice}
                options={[
                  { value: "loisirs", label: "Loisirs" },
                  { value: "culture", label: "Culture" },
                ]}
                placeholder="Toutes les catégories"
              />
              <UI.SelectField
                id="atelier-vide"
                label="Liste vide"
                value=""
                onChange={() => {}}
                options={[]}
                placeholder="—"
                emptyLabel="Aucune catégorie disponible"
              />
            </UI.FieldGrid>
          ),
        },
        {
          name: "FieldGrid",
          note: "Démontré par les deux spécimens de champs ci-dessus.",
          render: () => (
            <UI.FieldGrid>
              <Frame>colonne</Frame>
              <Frame>colonne</Frame>
            </UI.FieldGrid>
          ),
        },
        {
          name: "FilterGrid",
          render: () => (
            <UI.FilterGrid>
              <Frame>1</Frame>
              <Frame>2</Frame>
              <Frame>3</Frame>
              <Frame>4</Frame>
            </UI.FilterGrid>
          ),
        },
        {
          name: "Modal",
          note: "Un <dialog> natif : Échap, piège de focus et fond cliquable viennent de showModal().",
          render: () => (
            <>
              <UI.Button variant="solid" onClick={() => setOpen(true)}>
                Ouvrir la modale
              </UI.Button>
              <UI.Modal
                open={open}
                onClose={() => setOpen(false)}
                title="Votre QR"
                accent="de paiement."
                meta="Poney Dream 78 / 25,00 €"
              >
                <UI.Note className="mt-6">
                  Le contenu de la modale. Échap ferme, le fond aussi.
                </UI.Note>
              </UI.Modal>
            </>
          ),
        },
      ],
    },
    {
      title: "Composites",
      specimens: [
        {
          name: "Breadcrumb",
          render: () => (
            <UI.Breadcrumb
              trail={[
                { label: "Mon espace", href: "/espace" },
                { label: "Le réseau", href: "/espace#reseau" },
                { label: "Payer" },
              ]}
            />
          ),
        },
        {
          name: "ResultCount",
          render: () => (
            <div className="grid gap-8">
              <UI.ResultCount
                count={13}
                noun={["partenaire", "partenaires"]}
                zero="Aucun partenaire"
                onReset={() => {}}
              />
              <UI.ResultCount
                count={0}
                noun={["partenaire", "partenaires"]}
                zero="Aucun partenaire"
              />
            </div>
          ),
        },
        {
          name: "Pager",
          render: () => (
            <div className="grid gap-6">
              <UI.Pager
                onPrev={() => {}}
                onNext={() => {}}
                prevLabel="Page précédente"
                nextLabel="Page suivante"
                position={[2, 5]}
              />
              <UI.Pager
                onPrev={() => {}}
                onNext={() => {}}
                prevLabel="Partenaire précédent"
                nextLabel="Partenaire suivant"
                atStart
                hint="Le rang défile, glissez-le"
              />
            </div>
          ),
        },
        {
          name: "IdentityStrip",
          note: "Deux tailles conservées : une rangée de menu et un bandeau pleine largeur ne sont pas le même contexte.",
          render: () => (
            <div className="grid gap-6">
              <UI.IdentityStrip
                name="Camille Durand"
                email="camille.durand@administration.gouv.fr"
              >
                <UI.Chip className="ms-auto">Employé</UI.Chip>
              </UI.IdentityStrip>
              <div className="border-cp-fg w-52 border-2 p-4">
                <div className="flex items-center gap-3">
                  <Avatar name="Camille Durand" size="sm" />
                  <NameEmail
                    name="Camille Durand"
                    email="camille@administration.gouv.fr"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          ),
        },
        {
          name: "PartnerPhoto",
          note: "Cadre à ratio fixe, image en object-cover, nom du partenaire posé dessus sur un dégradé — parce que du blanc sur une photographie inconnue n'est pas un contraste sur lequel compter.",
          render: () => (
            <div className="grid gap-5 sm:grid-cols-2">
              <PartnerPhoto partner={partner} />
              <PartnerPhoto
                partner={partner}
                withName={false}
                className="aspect-[3/2] min-h-[150px]"
              />
            </div>
          ),
        },
        {
          name: "PartnerTile",
          render: () => (
            <div className="max-w-[320px]">
              <UI.PartnerTile partner={partner}>
                <div className="flex flex-1 flex-wrap items-baseline gap-x-4 gap-y-2 p-4">
                  <UI.Micro tone="accent">Loisirs</UI.Micro>
                  <address className="text-cp-muted basis-full text-[13px] leading-[1.5] not-italic">
                    {partner.address}
                    <br />
                    {partner.postcode} {partner.city}
                  </address>
                </div>
              </UI.PartnerTile>
            </div>
          ),
        },
        {
          name: "QrCode",
          note: "Le ticket blanc dans les deux thèmes. Il n'encode rien de scannable, et aucun écran ne prétend le contraire.",
          render: () => (
            <div className="grid gap-5 sm:grid-cols-3">
              <QrSpecimen label="materialise">
                <UI.QrCode seed="atelier-1" motion="materialise" />
              </QrSpecimen>
              <QrSpecimen label="materialise, éteint">
                <UI.QrCode seed="atelier-2" motion="materialise" dimmed />
              </QrSpecimen>
              <QrSpecimen label="dissolve (survolez)">
                <UI.QrCode
                  motion="dissolve"
                  label="QR de démonstration"
                ></UI.QrCode>
              </QrSpecimen>
            </div>
          ),
        },
      ],
    },
    {
      title: "Coquilles",
      specimens: [
        {
          name: "Screen",
          note: "Rognée à 260px ici : une coquille fait un écran de haut. Le padding, la hauteur, le filet et l'ancre de défilement sont à elle ; on ne lui passe que des gabarits de grille.",
          render: () => (
            <div className="border-cp-border h-[260px] overflow-hidden border border-dashed">
              <UI.Screen id="atelier-screen" snap={false} gap={6}>
                <UI.Display level={2}>
                  Une coquille
                  <br />
                  <em className="text-cp-accent font-serif font-normal">
                    de section.
                  </em>
                </UI.Display>
              </UI.Screen>
            </div>
          ),
        },
        {
          name: "PageMain",
          note: "La colonne principale : centrée, plafonnée à max-w-7xl, avec ses gouttières.",
          render: () => (
            <div className="border-cp-border border border-dashed">
              <UI.PageMain>
                <Frame>le contenu de la page</Frame>
              </UI.PageMain>
            </div>
          ),
        },
      ],
    },
  ];

  const documented = new Set(
    GROUPS.flatMap((group) => group.specimens.map((s) => s.name)),
  );
  const missing = Object.keys(UI).filter((name) => !documented.has(name));

  return (
    <div className="py-12">
      <UI.Display level={1} scale="page" accent="l'interface.">
        L&apos;atelier de
      </UI.Display>
      <p className="text-cp-muted mt-6 max-w-[580px] text-sm leading-[1.55]">
        Chaque élément de <code>components/ui</code>, avec toutes ses variantes.
        Un écran ne réinvente pas ce qui est ici ; s&apos;il lui manque quelque
        chose, cela se rajoute ici d&apos;abord.
      </p>

      {missing.length > 0 && (
        <UI.Note tone="danger" role="alert" className="mt-8">
          <strong className="font-black">
            {missing.length} export
            {missing.length > 1 ? "s" : ""} sans spécimen :
          </strong>{" "}
          {missing.join(", ")}. Ajoutez-leur un spécimen dans ce fichier.
        </UI.Note>
      )}

      {GROUPS.map((group) => (
        <section key={group.title} className="mt-16">
          <UI.Display level={2} accent="." br={false}>
            {group.title}
          </UI.Display>
          <div className="mt-8 grid gap-12">
            {group.specimens.map((specimen) => (
              <div key={specimen.name}>
                <div className="border-t-cp-fg mb-6 border-t-2 pt-3">
                  <UI.Micro as="h3">{specimen.name}</UI.Micro>
                  {specimen.note && (
                    <p className="text-cp-muted mt-2 max-w-[620px] text-[13px] leading-[1.5]">
                      {specimen.note}
                    </p>
                  )}
                </div>
                {specimen.render()}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Un ticket QR sur fond bleu, comme sur la page d'accueil. */
function QrSpecimen({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-primary-700 grid gap-3 p-5">
      <span className={`text-white ${MICRO}`}>{label}</span>
      {children}
    </div>
  );
}
