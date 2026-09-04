"use client";

import { useState } from "react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Note from "@/components/ui/Note";
import Panel from "@/components/ui/Panel";

type Props = {
  onConfirm: () => void;
};

/** Typed by hand before the deletion button unlocks. */
const CONFIRM_WORD = "SUPPRIMER";

/**
 * Account deletion, behind two deliberate steps: a confirmation dialog, then a
 * button that only unlocks once CONFIRM_WORD is typed. Deletion is
 * irreversible, so an accidental click must not be enough to trigger it.
 *
 * Sur la modale de la bibliothèque, c'est-à-dire sur un `<dialog>` natif. Elle
 * était rendue par celle de Flowbite, gardée pour son piège de focus et sa
 * touche Échap — que la plateforme fournit désormais — au prix d'un objet de
 * thème de vingt-sept lignes dont le seul rôle était d'annuler les arrondis,
 * l'ombre et les gris `dark:` de Flowbite. Supprimer ce thème *est* le gain.
 *
 * Ce qui se perd : la transition d'entrée, et le verrou de défilement de
 * l'arrière-plan — un `<dialog>` modal rend la page inerte mais la laisse
 * défiler.
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
      <Note tone="danger" className="mt-5">
        La suppression du compte est définitive : les données associées ne
        peuvent pas être récupérées.
      </Note>

      <Button variant="danger" className="mt-6" onClick={() => setOpen(true)}>
        Supprimer mon compte
      </Button>

      <Modal open={open} onClose={close} title="Supprimer" accent="le compte.">
        <Panel.Lead className="mb-5">
          Cette action est irréversible. Le compte et les données associées
          seront définitivement supprimés.
        </Panel.Lead>
        {/* The shared field, so this input matches every other one. */}
        <TextField
          id="profile-delete-confirm"
          label={`Tape ${CONFIRM_WORD} pour confirmer`}
          value={typed}
          onChange={setTyped}
          autoComplete="off"
          placeholder={CONFIRM_WORD}
        />
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button
            variant="danger"
            disabled={typed !== CONFIRM_WORD}
            onClick={onConfirm}
          >
            Supprimer définitivement
          </Button>
          <Button onClick={close}>Annuler</Button>
        </div>
      </Modal>
    </>
  );
}
