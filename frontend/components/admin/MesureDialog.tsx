"use client";

import { useState } from "react";
import { mesurer, type Compte, type GesteCompte } from "./api";
import { euros } from "./Charts";
import { GESTES } from "./mesures";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Note from "@/components/ui/Note";
import TextArea from "@/components/ui/TextArea";
import { MICRO } from "@/components/ui/surfaces";

/**
 * Le dialogue d'une mesure : ce qu'elle emporte, ce qui précède, et le motif.
 *
 * **Le motif est obligatoire, et c'est le serveur qui l'exige** (422 sans lui).
 * Le dialogue ne fait que le demander tôt : une mesure sans motif est une porte
 * murée, et la personne qui ne peut plus se connecter a le droit de savoir
 * pourquoi. Les mesures précédentes sont rappelées dessous — un compte suspendu
 * puis réactivé puis clôturé garde ses trois lignes, et l'agent qui décide lit
 * ce qu'a décidé le précédent.
 *
 * La clôture est traitée à part — bouton `danger`, portée écrite en toutes
 * lettres, et le solde restant rappelé. Fermer un compte qui porte encore de
 * l'argent public est une décision, pas une formalité ; le motif est l'endroit
 * où l'agent consigne ce qu'il advient du reliquat.
 *
 * Écrit ici plutôt que dans l'écran des comptes parce que les trois écrans qui
 * prennent une mesure — le tableau, la bande d'un partenaire, celle d'un
 * salarié — doivent la prendre dans les mêmes termes. `onDone` rend le message
 * du serveur : c'est l'appelant qui sait où l'afficher et quoi relire.
 */
export default function MesureDialog({
  visee,
  onClose,
  onDone,
}: {
  /** Le compte et le geste, ou rien : il n'y a pas de dialogue sans les deux. */
  visee: { compte: Compte; geste: GesteCompte | "retablir" } | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const geste = visee ? GESTES[visee.geste] : null;

  function fermer() {
    setMotif("");
    setErreur("");
    onClose();
  }

  async function confirmer() {
    if (!visee) return;
    setEnvoi(true);
    setErreur("");
    try {
      const message = await mesurer(visee.compte, visee.geste, motif);
      setMotif("");
      onDone(message);
    } catch (cause) {
      /* Le message du serveur, tel quel : c'est lui qui sait pourquoi il a
         refusé — motif vide, compte déjà dans cet état, clôture définitive. */
      setErreur(
        cause instanceof Error
          ? cause.message
          : "La mesure n’a pas pu être enregistrée.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modal
      open={visee !== null}
      onClose={fermer}
      title={geste?.titre ?? ""}
      meta={visee ? `${visee.compte.nom} · ${visee.compte.email}` : ""}
    >
      {visee && geste && (
        <div className="space-y-5">
          <p className="text-cp-muted text-[13px] leading-[1.55]">
            {geste.portee}
          </p>

          {/* Le solde, rappelé au moment de fermer : c'est le chiffre qui
              change la décision, et l'agent ne doit pas avoir à aller le
              chercher ailleurs. */}
          {visee.geste === "cloturer" && visee.compte.soldeCents > 0 && (
            <Note tone="danger" role="alert">
              <strong className="font-black">
                Ce compte porte encore {euros(visee.compte.soldeCents)} €.
              </strong>{" "}
              La clôture n’efface pas ce solde et ne le reverse pas : dites dans
              le motif ce qu’il advient du reliquat.
            </Note>
          )}

          {visee.compte.mesures.length > 0 && (
            <div>
              <p className={`${MICRO} text-cp-muted`}>Mesures précédentes</p>
              <ul className="mt-2 space-y-2">
                {visee.compte.mesures.map((mesure, n) => (
                  <li
                    key={`${mesure.at}-${n}`}
                    className="border-cp-border border-l-2 pl-3"
                  >
                    <p className={`${MICRO} text-cp-fg`}>
                      {mesure.sens}
                      {mesure.at && (
                        <span className="text-cp-muted">
                          {" "}
                          · {new Date(mesure.at).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </p>
                    <p className="text-cp-muted mt-1 text-[12px]">
                      {mesure.motif}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <TextArea
            id="mesure-motif"
            label="Motif écrit"
            value={motif}
            onChange={setMotif}
            rows={4}
            hint="Obligatoire. C’est ce que lira l’agent suivant, et ce qui justifie la mesure si elle est contestée."
            error={erreur || undefined}
          />

          <div className="flex flex-wrap gap-3">
            <Button
              variant={geste.ton === "danger" ? "danger" : "solid"}
              onClick={confirmer}
              disabled={envoi || motif.trim() === ""}
            >
              {envoi ? "Enregistrement…" : geste.verbe}
            </Button>
            <Button variant="outline" onClick={fermer}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
