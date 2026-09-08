import Link from "next/link";
import type { Compte } from "./api";
import type { ReactNode } from "react";

/**
 * Un compte salarié, comme quelque chose qu'on clique pour lire son historique.
 *
 * La tuile d'un partenaire porte une photographie ; un salarié n'en a pas, et
 * n'en aura pas — le dispositif ne collectionne pas les visages de ses
 * bénéficiaires. À la place, son initiale en très grand sur un aplat de la
 * couleur du texte, et son nom posé dessus comme sur la photographie d'une
 * tuile de partenaire. Les deux rangs se lisent donc du même rythme : un pavé
 * qui nomme, un pied qui précise.
 *
 * L'aplat est `--cp-fg` et le texte `--cp-page` : les deux jetons sont un
 * couple contrasté par construction, dans le thème clair comme dans le sombre.
 * Un aplat d'accent aurait demandé de vérifier le contraste du blanc dessus
 * dans chaque thème que l'administration peut enregistrer.
 *
 * Le pied est laissé à l'appelant, comme pour `PartnerTile` : le rang des
 * comptes y met l'état et le solde, et rien ne dit qu'un autre écran voudra
 * les mêmes.
 */
export default function CompteTile({
  compte,
  children,
  href,
  onClick,
  tabIndex,
}: {
  compte: Compte;
  children: ReactNode;
  href: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  /** -1 sur les copies décoratives d'un rang qui boucle. */
  tabIndex?: number;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      tabIndex={tabIndex}
      className="border-cp-border group hover:border-cp-fg focus-visible:outline-cp-accent flex h-full w-full cursor-pointer flex-col overflow-hidden border text-left focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <div className="bg-cp-fg relative aspect-[4/3] min-h-[150px] shrink-0 overflow-hidden">
        {/* L'initiale, décorative : le nom est écrit juste en dessous en vrai
            texte, donc la lire deux fois n'apprendrait rien. */}
        <span
          aria-hidden="true"
          className="text-cp-page/15 absolute inset-0 flex items-center justify-center text-[150px] leading-none font-black tracking-[-0.06em] transition-transform duration-500 group-hover:scale-[1.04]"
        >
          {compte.nom.charAt(0).toUpperCase()}
        </span>
        <h4 className="text-cp-page absolute inset-x-0 bottom-0 p-4 text-[17px] leading-[1.05] font-black tracking-[-0.03em]">
          {compte.nom}
        </h4>
      </div>
      {children}
    </Link>
  );
}
