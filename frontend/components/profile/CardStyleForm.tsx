"use client";

import React, { useEffect, useState } from "react";
import { Alert, Button, RangeSlider } from "flowbite-react";
import CreditCard3D, {
  hexToRgba,
  patternLayer,
} from "@/components/home/CreditCard3D";
import { DEFAULT_CARD_STYLE } from "@/components/account/AccountProvider";
import type {
  CardPattern,
  CardStyle,
  Profile,
} from "@/components/account/AccountProvider";

type Props = {
  profile: Profile;
  onSave: (profile: Profile) => void;
};

const PATTERNS: { value: CardPattern; label: string }[] = [
  { value: "waves", label: "Vagues" },
  { value: "dots", label: "Points" },
  { value: "grid", label: "Grille" },
  { value: "none", label: "Aucun" },
];

const CARD_PRESETS = [
  "#1b3a6b",
  "#0a0a0b",
  "#14532d",
  "#7c2d12",
  "#4c1d95",
  "#155e75",
  "#9f1239",
  "#3f3f46",
];
const TEXT_PRESETS = ["#ffffff", "#0a0a0b", "#f5d0a9", "#bfdbfe"];

/** The tick drawn on the chosen tile. */
function CheckMark() {
  return (
    <span className="bg-primary-700 absolute -end-1 -top-1 flex size-5 items-center justify-center rounded-full text-white shadow">
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-3">
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

/** One labelled block of controls, separated by a rule like Discord's rows. */
function SettingBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-default-medium border-t pt-6">
      <h3 className="text-heading text-xs font-bold tracking-[0.08em] uppercase">
        {title}
      </h3>
      {hint && <p className="text-body mt-1 text-xs">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SwatchGrid({
  name,
  value,
  presets,
  onChange,
}: {
  name: string;
  value: string;
  presets: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {presets.map((preset) => {
        const selected = value.toLowerCase() === preset.toLowerCase();
        return (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            aria-label={preset}
            aria-pressed={selected}
            className={`border-default-medium relative size-11 cursor-pointer rounded-lg border transition ${
              selected ? "ring-primary-700 ring-2 ring-offset-2" : ""
            }`}
            style={{ backgroundColor: preset }}
          >
            {selected && <CheckMark />}
          </button>
        );
      })}

      {/* Custom colour, styled as one more tile rather than a bare input. */}
      <label className="border-default-medium hover:bg-neutral-secondary-medium relative flex size-11 cursor-pointer items-center justify-center rounded-lg border border-dashed">
        <span className="sr-only">{name} personnalisée</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="text-body size-4"
        >
          <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
        </svg>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

/**
 * "Style" — lets an employé restyle their card. Laid out the way Discord's
 * Appearance pane is: the preview on top, then blocks of swatch tiles and rows
 * separated by rules, rather than a column of form fields.
 *
 * Edits are held in a draft so the preview follows them live, and nothing is
 * committed until Enregistrer.
 */
export default function CardStyleForm({ profile, onSave }: Props) {
  const [draft, setDraft] = useState<CardStyle>(profile.cardStyle);
  const [saved, setSaved] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(profile.cardStyle);

  // Follow the saved style if it changes underneath.
  useEffect(() => {
    setDraft(profile.cardStyle);
  }, [profile.cardStyle]);

  function set<K extends keyof CardStyle>(key: K, value: CardStyle[K]) {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ ...profile, cardStyle: draft });
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      {/* Preview first, as the thing every control below is changing. */}
      <div className="bg-neutral-secondary-medium border-default-medium flex justify-center rounded-lg border p-6">
        <div className="w-full max-w-[380px]">
          {/* The draft is passed explicitly so the preview shows unsaved edits
              rather than the stored style the card would otherwise read. */}
          <CreditCard3D style={draft} />
        </div>
      </div>

      <div className="mt-8 grid gap-6">
        <SettingBlock
          title="Couleur de la carte"
          hint="La couleur de fond imprimée sur la carte."
        >
          <SwatchGrid
            name="Couleur de la carte"
            value={draft.color}
            presets={CARD_PRESETS}
            onChange={(value) => set("color", value)}
          />
        </SettingBlock>

        <SettingBlock
          title="Couleur du texte"
          hint="Utilisée aussi pour le motif et le reflet."
        >
          <SwatchGrid
            name="Couleur du texte"
            value={draft.text}
            presets={TEXT_PRESETS}
            onChange={(value) => set("text", value)}
          />
        </SettingBlock>

        <SettingBlock title="Motif">
          <div className="flex flex-wrap gap-3">
            {PATTERNS.map((pattern) => {
              const selected = draft.pattern === pattern.value;
              return (
                <button
                  key={pattern.value}
                  type="button"
                  onClick={() => set("pattern", pattern.value)}
                  aria-pressed={selected}
                  className={`border-default-medium relative w-24 cursor-pointer overflow-hidden rounded-lg border text-left transition ${
                    selected ? "ring-primary-700 ring-2 ring-offset-2" : ""
                  }`}
                >
                  {/* Each tile previews its own texture in the chosen colours. */}
                  <span
                    className="block h-14 w-full"
                    style={{
                      backgroundColor: draft.color,
                      ...patternLayer(pattern.value, draft.text),
                    }}
                  />
                  <span className="text-body block px-2 py-1.5 text-[11px] font-medium">
                    {pattern.label}
                  </span>
                  {selected && <CheckMark />}
                </button>
              );
            })}
          </div>
        </SettingBlock>

        <SettingBlock title="Effet métallisé">
          <div className="flex flex-wrap items-center gap-4">
            <RangeSlider
              id="card-metalness"
              className="min-w-[220px] flex-1"
              min={0}
              max={100}
              step={5}
              value={draft.metalness}
              onChange={(e) => set("metalness", Number(e.target.value))}
            />
            <span className="text-heading w-12 text-right text-sm font-medium tabular-nums">
              {draft.metalness}%
            </span>
            <span
              aria-hidden="true"
              className="border-default-medium h-8 w-20 rounded border"
              style={{
                backgroundColor: draft.color,
                backgroundImage: `linear-gradient(105deg, transparent 28%, ${hexToRgba(
                  draft.text,
                  String(draft.metalness / 100),
                )} 45%, transparent 62%)`,
              }}
            />
          </div>
          <p className="text-body mt-2 text-xs">
            0 % pour une carte mate, 100 % pour un reflet métallique marqué.
          </p>
        </SettingBlock>
      </div>

      {saved && (
        <Alert color="success" className="mt-6">
          Style enregistré.
        </Alert>
      )}

      <div className="border-default-medium mt-6 flex flex-wrap items-center gap-3 border-t pt-6">
        <Button type="submit" disabled={!dirty}>
          Enregistrer le style
        </Button>
        <Button
          type="button"
          color="light"
          disabled={!dirty}
          onClick={() => {
            setDraft(profile.cardStyle);
            setSaved(false);
          }}
        >
          Annuler
        </Button>
        <Button
          type="button"
          color="light"
          onClick={() => {
            setSaved(false);
            setDraft(DEFAULT_CARD_STYLE);
          }}
        >
          Réinitialiser
        </Button>
      </div>
    </form>
  );
}
