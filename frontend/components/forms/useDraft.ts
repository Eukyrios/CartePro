"use client";

import { useEffect, useState } from "react";

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
 */
export function useDraft<T>(
  source: T,
  commit: (value: T) => Promise<void> | void,
) {
  const [draft, setDraft] = useState<T>(source);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* Suit la source quand elle change sous nos pieds, pour qu'une sauvegarde
     faite ailleurs ne soit pas écrasée par un brouillon périmé. */
  useEffect(() => {
    setDraft(source);
    setSaved(false);
    setError(null);
  }, [source]);

  function set(next: T | ((current: T) => T)) {
    setSaved(false);
    setError(null);
    setDraft(next);
  }

  function reset() {
    setDraft(source);
    setSaved(false);
    setError(null);
  }

  async function submit(value: T = draft) {
    setSaving(true);
    setError(null);
    try {
      await commit(value);
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
