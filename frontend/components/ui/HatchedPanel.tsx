import Micro from "./Micro";
import { cx } from "./cx";
import type { ReactNode } from "react";

/**
 * Ce qui se voit à la place d'un écran auquel on n'a pas droit : le contenu
 * reste là, en dessous, et des hachures le barrent.
 *
 * Écrit pour l'espace partenaire, où la carte de paiement s'affiche sans être
 * utilisable — un partenaire encaisse, il ne paie pas. Montrer la carte grisée
 * plutôt que de l'escamoter répond à la question avant qu'elle soit posée :
 * « où est ma carte ? » a une réponse visible, « pourquoi n'y a-t-il rien
 * ici ? » n'en a pas.
 *
 * `aria-hidden` sur les hachures et sur le contenu barré : un lecteur d'écran
 * n'a que faire d'une carte qu'on ne peut pas utiliser, il lui faut la raison.
 * Celle-ci est donc du vrai texte, au-dessus des rayures.
 */
export default function HatchedPanel({
  children,
  reason,
  action,
  bleed = false,
  className,
}: {
  /** Ce qui est barré. Décoratif dès lors qu'il est inutilisable. */
  children: ReactNode;
  /** Pourquoi c'est barré. Le seul contenu que l'assistance technique lit. */
  reason: ReactNode;
  /** Ce qu'il faut faire à la place, s'il y a quelque chose à faire. */
  action?: ReactNode;
  /**
   * Les hachures débordent la colonne pour couvrir la largeur de la fenêtre.
   *
   * Pour un écran plein : barré à l'intérieur de la seule colonne de contenu,
   * il laissait deux bandes blanches sur les côtés, et l'écran se lisait comme
   * un panneau posé sur une page ouverte plutôt que comme une page fermée. Le
   * contenu, lui, reste dans la colonne — c'est la fermeture qui va au bord,
   * pas ce qu'elle recouvre.
   *
   * Suppose un ancêtre qui rogne l'axe horizontal (`PageMain` le fait avec
   * `overflow-x-clip`), sans quoi les 100vw ajoutent la largeur de la barre de
   * défilement au document.
   */
  bleed?: boolean;
  className?: string;
}) {
  return (
    /* `isolate` crée un contexte d'empilement propre au panneau : sans lui, un
       contenu qui pose ses propres z-index — la carte et son étiquette en
       posent — passait par-dessus les hachures et par-dessus la raison, qui se
       retrouvait cachée derrière l'objet qu'elle barre. Les deux couches
       au-dessus sont donc numérotées, et elles le sont dans ce contexte. */
    <div className={cx("relative isolate", className)}>
      <div
        className="pointer-events-none relative z-0 select-none h-full"
        aria-hidden="true"
      >
        {children}
      </div>

      <div
        aria-hidden="true"
        className={cx(
          "hatched pointer-events-none absolute inset-y-0 z-10",
          bleed ? "left-1/2 w-screen -translate-x-1/2" : "inset-x-0",
        )}
      />

      <div className="absolute inset-0 z-20 grid place-items-center p-6">
        <div className="border-cp-fg bg-cp-page max-w-[min(100%,26rem)] border-2 px-6 py-5 text-center">
          <Micro as="p" tone="official">
            Accès restreint
          </Micro>
          <p className="text-cp-fg mt-3 text-[15px] leading-[1.45]">{reason}</p>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </div>
    </div>
  );
}
