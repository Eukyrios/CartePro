"use client";

import { useState } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "flowbite-react";
import TextField from "@/components/ui/TextField";
import { BTN_DANGER, BTN_OUTLINE, NOTE_DANGER } from "@/components/ui/surfaces";

type Props = {
  onConfirm: () => void;
};

/** Typed by hand before the deletion button unlocks. */
const CONFIRM_WORD = "SUPPRIMER";

/**
 * Square, flat treatment of Flowbite's Modal. Unlike the Card and Sidebar it
 * replaced, the dialog is kept: it owns the focus trap and the escape-to-close
 * behaviour, which are not worth rewriting for a coat of paint. Each override
 * carries its `dark:` twin, or the component's own dark variant wins over ours
 * in tailwind-merge and the panel comes back grey.
 */
const SHARP_MODAL = {
  root: { show: { on: "flex bg-black/60" } },
  content: {
    inner:
      "relative flex max-h-[90dvh] flex-col rounded-none border-2 border-cp-fg bg-cp-page shadow-none dark:bg-cp-page",
  },
  header: {
    base: "flex items-start justify-between rounded-none border-b border-cp-border p-5 dark:border-cp-border",
    title:
      "text-[20px] font-black tracking-[-0.04em] text-cp-fg dark:text-cp-fg",
  },
  body: { base: "flex-1 overflow-auto p-5" },
  footer: {
    base: "flex items-center gap-3 rounded-none border-t border-cp-border p-5 dark:border-cp-border",
  },
};

/**
 * Account deletion, behind two deliberate steps: a confirmation dialog, then a
 * button that only unlocks once CONFIRM_WORD is typed. Deletion is
 * irreversible, so an accidental click must not be enough to trigger it.
 */
export default function DeleteAccountCard({ onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  function close() {
    setOpen(false);
    setTyped("");
  }

  return (
    <>
      <p className={`${NOTE_DANGER} mt-5`}>
        La suppression du compte est définitive : les données associées ne
        peuvent pas être récupérées.
      </p>

      <button
        type="button"
        className={`${BTN_DANGER} mt-6`}
        onClick={() => setOpen(true)}
      >
        Supprimer mon compte
      </button>

      <Modal show={open} size="md" onClose={close} theme={SHARP_MODAL}>
        <ModalHeader>Supprimer le compte</ModalHeader>
        <ModalBody>
          <p className="text-cp-muted mb-5 text-[13px] leading-[1.55]">
            Cette action est irréversible. Le compte et les données associées
            seront définitivement supprimés.
          </p>
          {/* The shared field, so this input matches every other one. */}
          <TextField
            id="profile-delete-confirm"
            label={`Tape ${CONFIRM_WORD} pour confirmer`}
            value={typed}
            onChange={setTyped}
            autoComplete="off"
            placeholder={CONFIRM_WORD}
          />
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            className={BTN_DANGER}
            disabled={typed !== CONFIRM_WORD}
            onClick={onConfirm}
          >
            Supprimer définitivement
          </button>
          <button type="button" className={BTN_OUTLINE} onClick={close}>
            Annuler
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
