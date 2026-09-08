"use client";

import { useDraft } from "@/components/forms/useDraft";
import { Avatar } from "@/components/ui/IdentityStrip";
import Button from "@/components/ui/Button";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import { SwatchGrid } from "./CardStyleForm";
import { displayNameOf } from "@/components/account/AccountProvider";
import type { Profile } from "@/components/account/AccountProvider";

/**
 * Les neuf aplats possibles pour la vignette d'un compte.
 *
 * Ce sont ceux du serveur — `accounts.COULEURS_AVATAR` — et les deux listes
 * doivent bouger ensemble : le serveur accepte n'importe quel hexadécimal
 * valide, mais lui en proposer d'autres ici laisserait choisir une couleur sur
 * laquelle le blanc de l'initiale ne tient pas. Toutes celles-ci dépassent
 * 4,5:1 sur du blanc.
 */
const AVATAR_PRESETS = [
  "#4a1b6b",
  "#1b3a6b",
  "#1b6b67",
  "#17402a",
  "#6b3a1b",
  "#7c1d54",
  "#3a1b6b",
  "#6b1b1b",
  "#2f2f38",
];

/**
 * Le choix de la couleur de sa vignette.
 *
 * Le dispositif ne demande pas de photographie — il ne collectionne pas les
 * visages de ses bénéficiaires — donc un compte se reconnaît à son initiale
 * sur un aplat. Cet aplat est tiré au hasard à la création du compte, et c'est
 * ici qu'on le change : sans cet écran, la couleur serait imposée, et deux
 * comptes tirés sur la même teinte n'auraient aucun moyen de se distinguer.
 *
 * L'aperçu est le disque réel de la barre haute, pas une pastille dessinée
 * pour l'occasion : c'est le même composant, donc ce qu'on voit ici est
 * exactement ce qui s'affichera.
 */
export default function AvatarColorForm({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (profile: Profile) => void;
}) {
  const { draft, set, reset, submit, saved, dirty, saving, error } =
    useDraft<string>(profile.avatarColor, (couleur) =>
      onSave({ ...profile, avatarColor: couleur }),
    );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submit();
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Pas de sur-titre ici : le `Panel.Lead` du panneau dit déjà ce que
          c'est, et les deux lignes se touchaient. */}
      <div className="flex items-center gap-5">
        <Avatar name={displayNameOf(profile)} size="md" color={draft} />
        <p className="text-cp-muted max-w-[46ch] text-[14px] leading-[1.55]">
          Votre initiale sur cet aplat, dans la barre haute et dans les listes
          de l’administration. Aucune photographie n’est demandée.
        </p>
      </div>

      <div className="mt-6">
        <Micro as="p" tone="muted" className="mb-3">
          Couleur
        </Micro>
        <SwatchGrid
          name="avatar"
          value={draft}
          presets={AVATAR_PRESETS}
          onChange={(valeur) => set(() => valeur)}
        />
      </div>

      {error && (
        <Note tone="danger" role="alert" className="mt-6">
          {error}
        </Note>
      )}

      {saved && (
        <Note tone="positive" role="status" className="mt-6">
          Couleur enregistrée.
        </Note>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <Button variant="solid" type="submit" disabled={!dirty || saving}>
          {saving ? "Enregistrement…" : "Enregistrer la couleur"}
        </Button>
        {dirty && (
          <button
            type="button"
            onClick={reset}
            className="text-cp-fg cursor-pointer text-[15px] underline underline-offset-4"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
