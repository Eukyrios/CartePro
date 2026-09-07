"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import TextField from "@/components/ui/TextField";
import { useDraft } from "@/components/forms/useDraft";
import { useApplyTheme, useTheme } from "@/components/theme/ThemeProvider";
import {
  saveTheme,
  type Theme,
  type ThemeColors,
} from "@/components/theme/theme";

/**
 * Les dix jetons de couleur, dans l'ordre où on les lit : le fond, puis
 * l'encre, puis les signaux.
 *
 * L'ordre n'est pas alphabétique — le fichier l'est, et c'est ce qui le rend
 * pénible à éditer : `accent` y tombe avant `page`, si bien qu'on cherche la
 * couleur de fond au milieu des signaux. Ici les jetons sont groupés par ce
 * qu'ils font, et chacun porte la phrase qui dit où il apparaît.
 */
const JETONS: readonly {
  cle: keyof ThemeColors;
  label: string;
  role: string;
}[] = [
  { cle: "page", label: "Page", role: "Le fond de toutes les pages." },
  { cle: "surface", label: "Surface", role: "Les panneaux posés sur la page." },
  { cle: "border", label: "Filet", role: "Les traits qui séparent." },
  { cle: "fg", label: "Texte", role: "Le texte courant et les titres." },
  { cle: "muted", label: "Texte discret", role: "Légendes, mentions, aides." },
  {
    cle: "ink",
    label: "Encre",
    role: "Le pied de page et les boutons pleins.",
  },
  {
    cle: "accent",
    label: "Accent",
    role: "La couleur d'identité : logotype, liens, titres d'accent.",
  },
  {
    cle: "official",
    label: "Officiel",
    role: "Ce dont l'administration se porte garant. Jamais l'accent.",
  },
  {
    cle: "positive",
    label: "Abouti",
    role: "Ce qui a réussi : montants encaissés.",
  },
  { cle: "alert", label: "Échec", role: "Ce qui a échoué : refus, erreurs." },
];

const THEMES: readonly {
  cle: "light" | "dark";
  label: string;
  hint: string;
}[] = [
  {
    cle: "light",
    label: "Thème clair",
    hint: "Ce que voit un visiteur par défaut.",
  },
  {
    cle: "dark",
    label: "Thème sombre",
    hint: "Aucune clarté unique ne tient sur du blanc et sur du presque noir.",
  },
];

/** Un hexadécimal à trois ou six chiffres — la même règle que le serveur. */
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Une couleur : la pastille qui ouvre le sélecteur, et l'hexadécimal en clair.
 *
 * Les deux, parce que les deux servent : la pastille pour choisir à l'œil, le
 * champ pour coller une valeur qu'on a déjà — c'est ce qu'on fait quand la
 * couleur vient d'une charte. Le champ accepte donc la frappe libre et ne se
 * plaint qu'à l'enregistrement, sinon il refuserait « #4a1 » pendant qu'on
 * tape « #4a1b6b ».
 */
function ColorRow({
  jeton,
  value,
  onChange,
}: {
  jeton: (typeof JETONS)[number];
  value: string;
  onChange: (value: string) => void;
}) {
  const valide = HEX.test(value.trim());
  return (
    <div className="border-cp-border flex flex-wrap items-center gap-x-4 gap-y-2 border-t py-3">
      <label
        className="border-cp-border relative size-9 shrink-0 cursor-pointer border"
        style={{ backgroundColor: valide ? value : "transparent" }}
      >
        <span className="sr-only">{jeton.label}</span>
        <input
          type="color"
          /* Le sélecteur natif n'accepte que #rrggbb : une valeur en cours de
             frappe le ferait retomber sur #000000 et écraserait la saisie. */
          value={valide && value.length === 7 ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <div className="min-w-0 flex-1">
        <Micro as="p">{jeton.label}</Micro>
        <p className="text-cp-muted mt-0.5 text-[11px]">{jeton.role}</p>
      </div>
      <input
        aria-label={`${jeton.label} — valeur hexadécimale`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className={`border-cp-border bg-cp-page text-cp-fg w-[7.5rem] shrink-0 border px-2 py-1.5 font-mono text-[13px] tabular-nums ${
          value && !valide ? "border-fg-danger text-fg-danger" : ""
        }`}
      />
    </div>
  );
}

/**
 * L'écran de style de l'administration : le thème du site, éditable.
 *
 * Ce que `backend/theme.json` contient, champ par champ — le nom de marque, les
 * deux polices, et les dix jetons de couleur dans chacun des deux thèmes. Le
 * fichier reste la source ; cet écran l'écrit à travers `PUT /api/theme`, donc
 * l'éditer à la main continue de marcher et dit la même chose.
 *
 * Ce que l'écran **n'**édite pas : les chemins de logotype. Ils désignent des
 * fichiers de `frontend/public`, et un champ de texte qui les pointerait sans
 * pouvoir les téléverser ne ferait que casser l'image. Le logotype par défaut
 * est du texte et suit `brand.name` — voir `components/brand/Logotype`.
 *
 * Enregistrer applique le thème sur-le-champ, sans recharger : c'est tout
 * l'intérêt d'un écran par rapport au fichier. Ce que le serveur refuse remonte
 * nommé, et rien n'est écrit dans ce cas.
 */
export default function ThemeForm() {
  const theme = useTheme();
  const applyTheme = useApplyTheme();
  const [refused, setRefused] = useState<string | null>(null);

  const {
    draft,
    set: setDraft,
    reset,
    submit,
    saved,
    error,
    saving,
    dirty,
  } = useDraft<Theme>(theme, async (next) => {
    setRefused(null);
    /* Le thème relu par le serveur, pas le brouillon : c'est celui-là qui est
       servi, et il a pu retirer une clé vide. */
    applyTheme(await saveTheme(next));
  });

  function setColor(
    mode: "light" | "dark",
    cle: keyof ThemeColors,
    valeur: string,
  ) {
    setDraft((current) => ({
      ...current,
      colors: {
        ...current.colors,
        [mode]: { ...current.colors[mode], [cle]: valeur },
      },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    /* Vérifié ici aussi, pour nommer la faute avant l'aller-retour. Le serveur
       refait le même contrôle : c'est lui qui écrit, donc c'est lui qui décide. */
    const fautif = THEMES.flatMap(({ cle: mode, label }) =>
      JETONS.filter(({ cle }) => {
        const valeur = draft.colors[mode][cle];
        return valeur !== undefined && !HEX.test(valeur.trim());
      }).map(({ label: jeton }) => `${label} — ${jeton}`),
    );
    if (fautif.length) {
      setRefused(
        `Couleur incomplète : ${fautif.join(", ")}. Un hexadécimal comme #4a1b6b est attendu.`,
      );
      return;
    }
    await submit();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <div className="border-cp-border border-t pt-6">
        <Micro as="h3">Nom de la marque</Micro>
        <p className="text-cp-muted mt-1.5 text-[11px]">
          Il porte le logotype, les titres d’onglet et le pied de page. Le
          logotype est du texte : ce nom est ce qui s’y affiche.
        </p>
        <div className="mt-4 max-w-[420px]">
          <TextField
            id="theme-nom"
            label="Nom"
            value={draft.brand.name ?? ""}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                brand: { ...current.brand, name: value },
              }))
            }
            placeholder="CartePro"
          />
        </div>
      </div>

      <div className="border-cp-border mt-8 border-t pt-6">
        <Micro as="h3">Polices</Micro>
        <p className="text-cp-muted mt-1.5 text-[11px]">
          Une famille déjà déclarée en <code>@font-face</code> dans{" "}
          <code>globals.css</code>, ou une police installée chez le lecteur.
          Rien ici ne peut télécharger une police : pour en ajouter une, posez
          le <code>.woff2</code> dans <code>public/fonts</code> et déclarez-la
          là-bas.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <TextField
            id="theme-sans"
            label="Sans — titres et interface"
            value={draft.fonts.sans ?? ""}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                fonts: { ...current.fonts, sans: value },
              }))
            }
            placeholder='"Archivo", Arial, Helvetica, sans-serif'
          />
          <TextField
            id="theme-serif"
            label="Serif — texte courant"
            value={draft.fonts.serif ?? ""}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                fonts: { ...current.fonts, serif: value },
              }))
            }
            placeholder='"Spectral", Georgia, "Times New Roman", serif'
          />
        </div>
      </div>

      {THEMES.map(({ cle: mode, label, hint }) => (
        <div key={mode} className="border-cp-border mt-8 border-t pt-6">
          <Micro as="h3">{label}</Micro>
          <p className="text-cp-muted mt-1.5 text-[11px]">{hint}</p>
          <div className="mt-4">
            {JETONS.map((jeton) => (
              <ColorRow
                key={jeton.cle}
                jeton={jeton}
                value={draft.colors[mode][jeton.cle] ?? ""}
                onChange={(valeur) => setColor(mode, jeton.cle, valeur)}
              />
            ))}
          </div>
        </div>
      ))}

      {saved && (
        <Note tone="positive" role="status" className="mt-7">
          Thème enregistré. Le site l’a pris à l’instant, sans recharger.
        </Note>
      )}
      {(refused || error) && (
        <Note tone="danger" role="alert" className="mt-7">
          {refused ?? error}
        </Note>
      )}

      <div className="border-cp-border mt-7 flex flex-wrap items-center gap-3 border-t pt-7">
        <Button type="submit" variant="solid" disabled={!dirty || saving}>
          {saving ? "Enregistrement…" : "Enregistrer le thème"}
        </Button>
        <Button
          disabled={!dirty || saving}
          onClick={() => {
            setRefused(null);
            reset();
          }}
        >
          Annuler
        </Button>
        <p className="text-cp-muted text-[11px]">
          Un champ laissé vide reprend la valeur compilée dans{" "}
          <code>globals.css</code>.
        </p>
      </div>
    </form>
  );
}
