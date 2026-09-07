"use client";

import React, { useState } from "react";
import {
  JOURS,
  PRESENTATION_LIMITS,
  hasHoraires,
  isValidSiteWeb,
  siteWebLabel,
} from "@/components/forms/partnerFields";
import { useDraft } from "@/components/forms/useDraft";
import Button from "@/components/ui/Button";
import Markdown from "@/components/ui/Markdown";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import Slash from "@/components/ui/Slash";
import TextArea from "@/components/ui/TextArea";
import TextField from "@/components/ui/TextField";
import type { Profile } from "@/components/account/AccountProvider";
import type { Jour } from "@/components/forms/partnerFields";

/** Les jours en capitale d'attaque, pour les libellés de champs. */
const LABEL: Record<Jour, string> = {
  lundi: "Lundi",
  mardi: "Mardi",
  mercredi: "Mercredi",
  jeudi: "Jeudi",
  vendredi: "Vendredi",
  samedi: "Samedi",
  dimanche: "Dimanche",
};

/** Ce qu'on écrit dans le champ pour obtenir chaque effet. */
const AIDE: ReadonlyArray<[string, string]> = [
  ["**gras**", "gras"],
  ["*italique*", "italique"],
  ["__souligné__", "souligné"],
  ["~~barré~~", "barré"],
  ["`code`", "code"],
  ["# Titre", "titre"],
  ["- liste", "liste"],
  ["> citation", "citation"],
  ["[texte](https://…)", "lien"],
];

/**
 * Le formulaire de la présentation : ce qu'un partenaire écrit sur lui-même.
 *
 * Séparé du profil d'entreprise, et pas par goût du rangement : les deux
 * panneaux n'ont pas le même risque. Le profil porte la raison sociale et le
 * SIREN, que le réseau utilise pour retrouver la fiche ; celui-ci ne porte que
 * de la prose. Les mêler aurait fait d'une faute de frappe dans un texte de
 * présentation un échec de validation du SIREN, et inversement.
 *
 * L'aperçu est rendu par le même composant que la fiche publique — ce n'est pas
 * une imitation de l'affichage, c'est l'affichage. Un aperçu qui diverge du
 * résultat est pire que pas d'aperçu.
 */
export default function PresentationForm({
  profile,
  onSave,
}: {
  profile: Profile;
  /** Asynchrone, et attendu : voir useDraft. */
  onSave: (profile: Profile) => Promise<void> | void;
}) {
  const { draft, set, reset, submit, saved, error, saving, dirty } = useDraft(
    profile,
    onSave,
  );
  const [siteError, setSiteError] = useState<string | undefined>();

  const { siteWeb, presentationTitre, presentationTexte, horaires } =
    draft.partner;

  function setPartner(field: string, value: string) {
    set((current) => ({
      ...current,
      partner: { ...current.partner, [field]: value },
    }));
    if (field === "siteWeb") setSiteError(undefined);
  }

  function setHoraire(jour: Jour, value: string) {
    set((current) => ({
      ...current,
      partner: {
        ...current.partner,
        horaires: { ...current.partner.horaires, [jour]: value },
      },
    }));
  }

  /** Le lundi recopié du mardi au vendredi : cinq champs identiques, une fois. */
  function appliquerEnSemaine() {
    const lundi = horaires.lundi;
    set((current) => ({
      ...current,
      partner: {
        ...current.partner,
        horaires: {
          ...current.partner.horaires,
          mardi: lundi,
          mercredi: lundi,
          jeudi: lundi,
          vendredi: lundi,
        },
      },
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidSiteWeb(siteWeb)) {
      setSiteError("Adresse invalide : un domaine, par exemple mon-site.fr");
      return;
    }
    await submit();
  }

  const tropLong = {
    titre: presentationTitre.length > PRESENTATION_LIMITS.titre,
    texte: presentationTexte.length > PRESENTATION_LIMITS.texte,
  };

  return (
    <form onSubmit={handleSubmit} className="mt-7">
      <TextField
        id="presentation-titre"
        label="Titre de la section"
        value={presentationTitre}
        onChange={(value) => setPartner("presentationTitre", value)}
        placeholder="Ce que nous faisons"
        maxLength={PRESENTATION_LIMITS.titre}
        error={
          tropLong.titre
            ? `Titre trop long : ${PRESENTATION_LIMITS.titre} caractères au maximum.`
            : undefined
        }
        hint="Le titre affiché au-dessus de votre texte sur votre fiche."
      />

      <TextArea
        id="presentation-texte"
        label="Votre présentation"
        value={presentationTexte}
        onChange={(value) => setPartner("presentationTexte", value)}
        rows={10}
        maxLength={PRESENTATION_LIMITS.texte}
        placeholder={
          "Une phrase sur ce que vous proposez.\n\n" +
          "- ce que les salariés y trouvent\n" +
          "- vos horaires, si elles comptent\n\n" +
          "**Bienvenue.**"
        }
        error={
          tropLong.texte
            ? `Texte trop long : ${PRESENTATION_LIMITS.texte} caractères au maximum.`
            : undefined
        }
        hint="Mise en forme Markdown, comme dans un salon de discussion."
        className="mt-7"
      />

      {/* Le mémo de syntaxe, sous le champ : c'est là qu'on le cherche quand on
          hésite, pas dans une aide séparée. */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {AIDE.map(([syntaxe, effet]) => (
          <li key={syntaxe} className="flex items-center gap-1.5">
            <code className="bg-cp-surface text-cp-fg px-1.5 py-0.5 font-mono text-[11px]">
              {syntaxe}
            </code>
            <Micro tone="muted">{effet}</Micro>
          </li>
        ))}
      </ul>

      <div className="mt-3 text-right">
        <Micro tone="muted">
          {presentationTexte.length}
          <Slash />
          {PRESENTATION_LIMITS.texte} caractères
        </Micro>
      </div>

      {/* Les sept jours, un champ chacun. Une case vide veut dire fermé, et
          c'est dit ici plutôt que deviné : sans cette phrase, un partenaire
          fermé le dimanche ne sait pas s'il doit écrire « Fermé ». */}
      <fieldset className="border-t-cp-fg mt-9 border-t-2 pt-6">
        <legend className="sr-only">Horaires d&apos;ouverture</legend>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Micro as="p" tone="accent">
            Horaires d&apos;ouverture
          </Micro>
          <Micro tone="muted">un champ vide vaut « fermé »</Micro>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {JOURS.map((jour) => (
            <TextField
              key={jour}
              id={`presentation-${jour}`}
              label={LABEL[jour]}
              value={horaires[jour]}
              onChange={(value) => setHoraire(jour, value)}
              placeholder="Fermé"
              maxLength={PRESENTATION_LIMITS.horaire}
            />
          ))}
        </div>

        <div className="mt-4">
          <Button
            onClick={appliquerEnSemaine}
            disabled={!horaires.lundi.trim()}
          >
            Appliquer le lundi au reste de la semaine
          </Button>
        </div>
      </fieldset>

      <TextField
        id="presentation-site"
        label="Site internet"
        value={siteWeb}
        onChange={(value) => setPartner("siteWeb", value)}
        placeholder="mon-entreprise.fr"
        inputMode="url"
        autoComplete="url"
        error={siteError}
        hint="Affiché sous votre présentation. Laissez vide si vous n'en avez pas."
        className="mt-7"
      />

      {/* L'aperçu : le composant de la fiche, pas une imitation. */}
      <div className="border-t-cp-fg mt-9 border-t-2 pt-6">
        <Micro as="p" tone="accent">
          Aperçu
        </Micro>
        {presentationTitre ||
        presentationTexte.trim() ||
        hasHoraires(horaires) ||
        siteWeb.trim() ? (
          <div className="border-cp-border bg-cp-surface mt-4 border p-5">
            {presentationTitre && (
              <h3 className="text-cp-fg mb-2 text-[22px] leading-[1.15] font-black tracking-[-0.03em]">
                {presentationTitre}
              </h3>
            )}
            <Markdown>{presentationTexte}</Markdown>

            {hasHoraires(horaires) && (
              <dl className="border-t-cp-border mt-5 border-t pt-3">
                {JOURS.map((jour) => (
                  <div
                    key={jour}
                    className="flex items-baseline justify-between gap-4 py-1"
                  >
                    <dt className="text-cp-muted text-[13px]">{LABEL[jour]}</dt>
                    <dd className="text-cp-fg text-[13px] tabular-nums">
                      {horaires[jour].trim() || "Fermé"}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {siteWeb.trim() && (
              <Micro as="p" tone="muted" className="mt-5">
                {siteWebLabel(siteWeb)}
              </Micro>
            )}
          </div>
        ) : (
          <Micro as="p" tone="muted" className="mt-4">
            Rien à afficher : la section ne paraîtra pas sur votre fiche tant
            qu&apos;elle est vide.
          </Micro>
        )}
      </div>

      {saved && (
        <Note tone="positive" role="status" className="mt-7">
          Présentation enregistrée.
        </Note>
      )}
      {error && (
        <Note tone="danger" role="alert" className="mt-7">
          {error}
        </Note>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="solid"
          disabled={!dirty || saving || tropLong.titre || tropLong.texte}
        >
          {saving ? "Enregistrement…" : "Enregistrer la présentation"}
        </Button>
        <Button
          disabled={!dirty || saving}
          onClick={() => {
            reset();
            setSiteError(undefined);
          }}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
