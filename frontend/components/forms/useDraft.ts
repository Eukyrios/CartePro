"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Un brouillon local d'un objet enregistré ailleurs, et l'état de sa
 * sauvegarde.
 *
 * Deux formulaires implémentaient cela chacun de son côté — le profil et le
 * style de carte — avec la même comparaison JSON, le même `useEffect` de
 * resynchronisation, et **la même faute** : `onSave(draft); setSaved(true);`
 * alors que la fonction passée est asynchrone. Rien n'attendait, rien
 * n'attrapait, si bien qu'un 409 « email déjà utilisé » affichait
 * « Modifications enregistrées » et laissait une promesse rejetée dans la
 * console.
 *
 * Ici, `submit` attend et attrape : `saved` ne passe à vrai que si la promesse
 * aboutit, et `error` porte le message du serveur sinon.
 *
 * Et `saved` survit au rafraîchissement qui le mérite. La resynchronisation
 * ci-dessous efface l'état de sauvegarde quand la source change sous nos
 * pieds — mais une sauvegarde réussie *fait* changer la source, puisque le
 * contexte recharge le profil depuis la réponse du serveur. Le message
 * « enregistré » était donc effacé par la preuve même qu'il disait vrai, et
 * aucun des deux formulaires n'a jamais confirmé quoi que ce soit. `mine`
 * distingue notre propre écho d'un changement venu d'ailleurs.
 */
export function useDraft<T>(
  source: T,
  commit: (value: T) => Promise<void> | void,
) {
  const [draft, setDraft] = useState<T>(source);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /* Vrai le temps d'un tour : la prochaine source qui arrive est celle que nous
     venons d'enregistrer, et non une modification faite ailleurs. */
  const mine = useRef(false);

  /* Suit la source quand elle change sous nos pieds, pour qu'une sauvegarde
     faite ailleurs ne soit pas écrasée par un brouillon périmé. */
  useEffect(() => {
    setDraft(source);
    if (mine.current) {
      mine.current = false;
      return;
    }
    setSaved(false);
    setError(null);
  }, [source]);

  function set(next: T | ((current: T) => T)) {
    mine.current = false;
    setSaved(false);
    setError(null);
    setDraft(next);
  }

  function reset() {
    mine.current = false;
    setDraft(source);
    setSaved(false);
    setError(null);
  }

  async function submit(value: T = draft) {
    setSaving(true);
    setError(null);
    try {
      await commit(value);
      mine.current = true;
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "L'enregistrement a échoué. Réessayez.",
      );
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }

  return {
    draft,
    set,
    reset,
    submit,
    saved,
    error,
    saving,
    dirty: JSON.stringify(draft) !== JSON.stringify(source),
  };
}
