"use client";

import { useEffect, useId, useRef } from "react";
import Display from "./Display";
import IconButton from "./IconButton";
import Micro from "./Micro";
import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * A modal dialog, on the platform's own `<dialog>`.
 *
 * Opened with `showModal()` and never by the `open` attribute, because that is
 * the difference between a dialog and a div: Escape, the focus trap, the
 * `::backdrop`, the inert page behind and the focus returning to whatever
 * opened it all come from the method, not the element.
 *
 * This replaced two hand-built overlays. One of them — the auth dialog — had no
 * Escape key, no focus trap and no `role="dialog"`, so the QR dialog was more
 * accessible than the sign-in form. A closed `<dialog>` also stays mounted,
 * which is how half-typed fields survive a close without the "render nothing
 * while shut" workaround that used to guard them.
 *
 * What it does not do: lock the page's scroll. The background is inert but a
 * wheel still moves it; a caller that minds adds `overflow-hidden` to `<html>`.
 */
const SIZES = {
  sm: "w-[min(92vw,360px)]",
  md: "w-[min(92vw,440px)]",
  lg: "w-[min(92vw,560px)]",
  xl: "w-[min(92vw,720px)]",
  /** Le formulaire d'inscription partenaire : dix champs sur deux colonnes. */
  "2xl": "w-[min(92vw,1024px)]",
} as const;

type Props = {
  open: boolean;
  /** Called for every way out: Escape, the backdrop, the close button. */
  onClose: () => void;
  children: ReactNode;
  /** The heavy half of the dialog's title. */
  title?: ReactNode;
  /** Its serif half, on the second line. */
  accent?: ReactNode;
  /** A micro-type line under the title: who, and how much. */
  meta?: ReactNode;
  size?: keyof typeof SIZES;
  /**
   * The id of an existing heading, for a dialog that titles itself in its own
   * body rather than through `title`.
   */
  labelledBy?: string;
  className?: string;
};

export default function Modal({
  open,
  onClose,
  children,
  title,
  accent,
  meta,
  size = "md",
  labelledBy,
  className,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy ?? (title ? headingId : undefined)}
      onClose={onClose}
      onClick={(event) => {
        /* A click on the backdrop has the dialog itself as its target; a click
           anywhere inside has the panel. */
        if (event.target === ref.current) onClose();
      }}
      className={cx(
        "border-cp-fg bg-cp-page text-cp-fg m-auto max-h-[90dvh] overflow-y-auto border-2 p-0 backdrop:bg-black/70",
        SIZES[size],
        className,
      )}
    >
      <div className="p-7 sm:p-8">
        <div className="flex items-start justify-between gap-6">
          {title !== undefined ? (
            <div>
              <Display level={2} scale="panel" accent={accent} id={headingId}>
                {title}
              </Display>
              {meta && (
                <Micro as="p" tone="muted" className="mt-2">
                  {meta}
                </Micro>
              )}
            </div>
          ) : (
            <div />
          )}
          <IconButton label="Fermer" variant="ghost" onClick={onClose}>
            ✕
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  );
}
