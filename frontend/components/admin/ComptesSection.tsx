"use client";

import PartnerCatalogue, {
  estConventionne,
} from "@/components/espace/PartnerCatalogue";
import AccountsCatalogue from "./AccountsCatalogue";
import Display from "@/components/ui/Display";
import Micro from "@/components/ui/Micro";
import Screen from "@/components/ui/Screen";
import Slash from "@/components/ui/Slash";

/**
 * « Les comptes » : les deux côtés d'un paiement, un rang chacun.
 *
 * En haut les établissements conventionnés, en bas les comptes salariés, et une
 * tuile ouvre l'historique de son compte — `/recettes/<slug>` pour ce qu'un
 * établissement a encaissé, `/depenses/<id>` pour ce qu'un salarié a dépensé.
 * C'est la même question posée des deux côtés d'un même montant : celui qui
 * quitte un compte est celui qui arrive sur l'autre, et un agent qui instruit
 * une réclamation doit pouvoir partir de l'un comme de l'autre.
 *
 * **Une section de deux écrans**, et non deux sections. Les deux rangs sont un
 * seul sujet — les comptes du dispositif — donc un seul titre et une seule
 * entrée dans le rail ; mais deux rangs de tuiles ne tiennent pas dans une
 * fenêtre, d'où le `long`, qui pose un second point d'accroche à mi-section
 * plutôt que de laisser la moitié basse inatteignable.
 *
 * Le rang du haut **est** le catalogue du réseau, pas une copie : c'est
 * `PartnerCatalogue` en cadre `block`, avec un prédicat plus étroit — les
 * conventionnés seulement — et une autre destination. Un administrateur
 * regarde la même liste qu'un salarié, mais il ne vient pas y chercher la même
 * chose : la tuile mène aux recettes de l'établissement, quand celle du salarié
 * mène à sa fiche.
 *
 * Les mesures — suspendre, réactiver, clôturer — ne sont pas ici. Une tuile
 * nomme un compte, son état et son chiffre ; la décision se prend derrière, à
 * côté des chiffres qui la motivent, sur la page de l'historique.
 */
export default function ComptesSection() {
  return (
    <Screen
      id="comptes"
      /* `long`, `align="start"` et `density="offset"` : deux rangs plus leurs
         filtres montent à deux fenêtres, donc la section ne peut ni se centrer
         ni s'accrocher d'un seul point. */
      align="start"
      density="offset"
      long
      aria-labelledby="comptes-titre"
    >
      {/* `min-w-0` : l'écran est une colonne flex, et la taille minimale
          automatique d'un enfant flex est celle de son contenu. Le rang qui
          défile fait cinquante mille pixels de large — clippés, mais comptés —
          donc sans ce plancher à zéro le bloc entier s'étirait à sa largeur, et
          les quatre filtres du catalogue partaient hors de l'écran. */}
      <div className="min-w-0">
        <Micro as="p" tone="accent">
          Administration
          <Slash />
          Historique des paiements
        </Micro>

        <Display
          level={2}
          id="comptes-titre"
          accent="."
          br={false}
          className="mt-4"
        >
          Les comptes
        </Display>

        <p className="text-cp-muted mt-3 text-[13px]">
          Les deux côtés d’un paiement : ce qu’un établissement a encaissé, ce
          qu’un salarié a dépensé. Une tuile ouvre l’historique du compte.
        </p>

        <div className="mt-14 space-y-20">
          <PartnerCatalogue
            frame="block"
            id="comptes-partenaires"
            heading="Partenaires"
            keep={estConventionne}
            /* Une tuile mène aux recettes de l'établissement, pas à sa fiche :
               la fiche est ce qu'un salarié vient lire, et l'administration
               vient lire ce qui a été encaissé. */
            hrefOf={(partner) => `/recettes/${partner.id}`}
          />

          <AccountsCatalogue />
        </div>
      </div>
    </Screen>
  );
}
