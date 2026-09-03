"use client";

import React, { useEffect, useState } from "react";
import {
  BTN_OUTLINE,
  BTN_SOLID,
  NOTE_POSITIVE,
} from "@/components/ui/surfaces";
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
  { value: "stripes", label: "Rayures" },
  { value: "crosshatch", label: "Croisillons" },
  { value: "rings", label: "Cercles" },
  { value: "checker", label: "Damier" },
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
    <span className="bg-cp-accent absolute -end-1 -top-1 flex size-4 items-center justify-center text-white">
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
    <div className="border-cp-border border-t pt-6">
      <h3 className="text-cp-fg text-[9px] font-black tracking-[0.16em] uppercase">
        {title}
      </h3>
      {hint && <p className="text-cp-muted mt-1.5 text-[11px]">{hint}</p>}
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
            className={`border-cp-border relative size-11 cursor-pointer rounded-none border transition ${
              selected ? "outline-cp-fg outline-2 outline-offset-2" : ""
            }`}
            style={{ backgroundColor: preset }}
          >
            {selected && <CheckMark />}
          </button>
        );
      })}

      {/* Custom colour, styled as one more tile rather than a bare input. */}
      <label className="border-cp-border hover:bg-cp-surface relative flex size-11 cursor-pointer items-center justify-center rounded-none border border-dashed">
        <span className="sr-only">{name} personnalisée</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="text-cp-muted size-4"
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
      {/* Preview first, as the thing every control below is changing. One card
          only: this panel styles the card, so the resting state is what needs
          checking. The payment state belongs to the salarié space, next to the
          wording that explains it. The draft is passed explicitly so the
          preview shows unsaved edits rather than the stored style. */}
      <div className="bg-cp-surface border-cp-border flex justify-center rounded-none border p-6">
        <div className="w-full max-w-[380px]">
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
                  className={`border-cp-border relative w-24 cursor-pointer overflow-hidden rounded-none border text-left transition ${
                    selected ? "outline-cp-fg outline-2 outline-offset-2" : ""
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
                  <span className="text-cp-fg block px-2 py-1.5 text-[9px] font-black tracking-[0.12em] uppercase">
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
            {/* A bare range input rather than Flowbite's RangeSlider, which
                brings a rounded grey track and its own dark variant. */}
            <input
              id="card-metalness"
              type="range"
              aria-label="Effet métallisé"
              className="accent-cp-accent bg-cp-border h-1 min-w-[220px] flex-1 appearance-none rounded-none"
              min={0}
              max={100}
              step={5}
              value={draft.metalness}
              onChange={(e) => set("metalness", Number(e.target.value))}
            />
            <span className="text-cp-fg w-12 text-right text-[13px] font-black tabular-nums">
              {draft.metalness}%
            </span>
            <span
              aria-hidden="true"
              className="border-cp-border h-8 w-20 rounded-none border"
              style={{
                backgroundColor: draft.color,
                backgroundImage: `linear-gradient(105deg, transparent 28%, ${hexToRgba(
                  draft.text,
                  String(draft.metalness / 100),
                )} 45%, transparent 62%)`,
              }}
            />
          </div>
          <p className="text-cp-muted mt-2.5 text-[11px]">
            0 % pour une carte mate, 100 % pour un reflet métallique marqué.
          </p>
        </SettingBlock>
      </div>

      {saved && <p className={`${NOTE_POSITIVE} mt-7`}>Style enregistré.</p>}

      <div className="border-cp-border mt-7 flex flex-wrap items-center gap-3 border-t pt-7">
        <button type="submit" disabled={!dirty} className={BTN_SOLID}>
          Enregistrer le style
        </button>
        <button
          type="button"
          className={BTN_OUTLINE}
          disabled={!dirty}
          onClick={() => {
            setDraft(profile.cardStyle);
            setSaved(false);
          }}
        >
          Annuler
        </button>
        <button
          type="button"
          className={BTN_OUTLINE}
          onClick={() => {
            setSaved(false);
            setDraft(DEFAULT_CARD_STYLE);
          }}
        >
          Réinitialiser
        </button>
      </div>
    </form>
  );
}
