"use client";

import { useState } from "react";
import TextField from "@/components/ui/TextField";

type Props = {
  onConfirm: () => void;
};

/** Typed by hand before the deletion button unlocks. */
const CONFIRM_WORD = "SUPPRIMER";

/**
 * Account deletion, behind two deliberate steps: the form only appears once
 * asked for, and the button only unlocks once CONFIRM_WORD is typed. Deletion
 * is irreversible, so an accidental click must not be enough to trigger it.
 */
export default function DeleteAccountPanel({ onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  function cancel() {
    setConfirming(false);
    setTyped("");
  }

  if (!confirming) {
    return (
      <div className="mt-3">
        <p className="text-body mb-3 text-sm">
          La suppression du compte est définitive : les données associées ne
          peuvent pas être récupérées.
        </p>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-fg-danger border-default-medium hover:bg-neutral-secondary-medium rounded-base box-border border px-4 py-2.5 text-sm leading-5 font-medium"
        >
          Supprimer mon compte
        </button>
      </div>
    );
  }

  return (
    <div className="border-default-medium rounded-base mt-3 border p-4">
      <p className="text-heading mb-3 text-sm font-medium">
        Cette action est irréversible.
      </p>
      <TextField
        id="profile-delete-confirm"
        label={`Tape ${CONFIRM_WORD} pour confirmer`}
        value={typed}
        onChange={setTyped}
        autoComplete="off"
        placeholder={CONFIRM_WORD}
      />
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={typed !== CONFIRM_WORD}
          onClick={onConfirm}
          className="bg-danger hover:bg-danger-strong focus:ring-danger-medium rounded-base box-border border border-transparent px-4 py-2.5 text-sm leading-5 font-medium text-white shadow-xs focus:ring-4 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          Supprimer définitivement
        </button>
        <button
          type="button"
          onClick={cancel}
          className="text-heading hover:bg-neutral-secondary-medium border-default-medium rounded-base box-border border px-4 py-2.5 text-sm leading-5 font-medium"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
