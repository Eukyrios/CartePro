import Display from "@/components/ui/Display";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import Screen from "@/components/ui/Screen";
import Slash from "@/components/ui/Slash";
import type { ApiPartner } from "@/lib/api";

const DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

/**
 * L'écran qu'on voit d'abord sur la fiche d'un partenaire écarté : le refus, et
 * son motif.
 *
 * En première position, avant la photographie et avant la carte. Un
 * établissement dont la candidature a été refusée n'est pas un partenaire chez
 * qui on hésite à payer : c'est un dossier clos, et le lecteur doit l'apprendre
 * avant de regarder le reste. Enterrer l'information sous la fiche, ou la
 * réduire à une pastille, reviendrait à laisser croire qu'on peut y aller.
 *
 * Le motif est celui de la décision enregistrée — les mots de l'administration,
 * pas une reformulation. C'est ce que la table `decisions` garde, et ce que le
 * partenaire concerné a reçu.
 */
export default function PartnerRefusal({ entry }: { entry: ApiPartner }) {
  if (!entry.refus) return null;

  return (
    <Screen
      id="refus"
      height="below-bar"
      snap={false}
      rule={false}
      density="tight"
    >
      <div className="max-w-[70ch]">
        <Micro as="p" tone="official">
          Décision du Ministère
        </Micro>

        <Display level={1} accent="refusé." className="mt-4">
          Conventionnement
        </Display>

        <Note tone="danger" as="div" role="alert" className="mt-8">
          <strong className="font-black">
            {entry.nom} n&apos;est pas partenaire du dispositif.
          </strong>
          <p className="mt-3 text-[16px] leading-[1.6]">{entry.refus.motif}</p>
          <Micro as="p" tone="muted" className="mt-4">
            Décision du {DATE.format(new Date(entry.refus.at))}
            <Slash />
            aucun paiement possible dans cet établissement
          </Micro>
        </Note>

        <p className="text-cp-muted mt-8 max-w-[52ch] text-[15px] leading-[1.55]">
          La fiche reste consultable ci-dessous, telle que le réseau la porte.
          Elle ne vaut pas invitation à s&apos;y rendre avec la carte.
        </p>
      </div>
    </Screen>
  );
}
