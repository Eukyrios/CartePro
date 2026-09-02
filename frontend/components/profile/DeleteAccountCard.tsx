"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "flowbite-react";

type Props = {
  onConfirm: () => void;
};

/** Typed by hand before the deletion button unlocks. */
const CONFIRM_WORD = "SUPPRIMER";

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
      <Alert color="failure" className="mb-4">
        La suppression du compte est définitive : les données associées ne
        peuvent pas être récupérées.
      </Alert>

      <Button color="red" className="w-fit" onClick={() => setOpen(true)}>
        Supprimer mon compte
      </Button>

      <Modal show={open} size="md" onClose={close}>
        <ModalHeader>Supprimer le compte</ModalHeader>
        <ModalBody>
          <p className="text-body mb-4 text-sm">
            Cette action est irréversible. Le compte et les données associées
            seront définitivement supprimés.
          </p>
          <Label htmlFor="profile-delete-confirm">
            Tape {CONFIRM_WORD} pour confirmer
          </Label>
          <TextInput
            id="profile-delete-confirm"
            className="mt-2"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder={CONFIRM_WORD}
          />
        </ModalBody>
        <ModalFooter>
          <Button
            color="red"
            disabled={typed !== CONFIRM_WORD}
            onClick={onConfirm}
          >
            Supprimer définitivement
          </Button>
          <Button color="alternative" onClick={close}>
            Annuler
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
