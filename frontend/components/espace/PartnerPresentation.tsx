"use client";

import {
  JOURS,
  hasHoraires,
  siteWebHref,
  siteWebLabel,
} from "@/components/forms/partnerFields";
import { Arrow } from "@/components/brand/Marks";
import Display from "@/components/ui/Display";
import Markdown from "@/components/ui/Markdown";
import Micro from "@/components/ui/Micro";
import Screen from "@/components/ui/Screen";
import type { ApiPartner } from "@/lib/api";

/** Les jours en capitale d'attaque, pour l'affichage seul. */
const LABEL: Record<string, string> = {
  lundi: "Lundi",
  mardi: "Mardi",
  mercredi: "Mercredi",
  jeudi: "Jeudi",
  vendredi: "Vendredi",
  samedi: "Samedi",
  dimanche: "Dimanche",
};

/**
 * Y a-t-il quelque chose à montrer ?
 *
 * Exporté parce que `PartnerFiche` pose la même question pour décider s'il y a
 * une section à lister dans le rail. Deux réponses différentes à cette
 * question donneraient une entrée de rail menant à une section absente.
 */
export function hasPresentation(entry: ApiPartner): boolean {
  return Boolean(
    entry.presentationTitre.trim() ||
    entry.presentationTexte.trim() ||
    entry.siteWeb.trim() ||
    hasHoraires(entry.horaires),
  );
}

/**
 * Ce que le partenaire dit de lui-même, sur sa propre fiche.
 *
 * Le seul contenu de l'application qu'un partenaire écrit et que tout le monde
 * lit. Il vient de son profil — il le saisit dans ses paramètres — et c'est
 * `PartnerFiche` qui le lit et le passe ici, parce que le rail a besoin de la
 * même réponse.
 *
 * La section a quatre cases, et pas une de plus : un titre, un texte, la
 * semaine, une adresse de site. C'est délibérément rigide. Un pavé de prose
 * libre laissait chaque partenaire réinventer la présentation de ses horaires
 * — au fil du texte, en liste, oubliés — et un lecteur ne pouvait pas
 * apprendre « c'est ouvert le samedi ? » d'un coup d'œil. Ici la semaine est
 * une table, à la même place sur toutes les fiches, et le texte n'a plus à
 * porter ce qu'une table dit mieux.
 *
 * Le jour courant est marqué. La section ne s'affiche qu'après la réponse du
 * réseau, donc jamais sur le serveur : lire l'heure ici ne peut pas produire
 * un rendu qui diffère de celui de l'hydratation.
 *
 * Le texte est du Markdown rendu par `ui/Markdown`, qui n'accepte que le
 * sous-ensemble d'un salon de discussion et ne fabrique jamais de HTML depuis
 * la chaîne de l'auteur. C'est le même composant que l'aperçu des paramètres,
 * pour que ce que le partenaire voit en écrivant soit ce qui s'affiche ici.
 */
export default function PartnerPresentation({ entry }: { entry: ApiPartner }) {
  const { presentationTitre, presentationTexte, siteWeb, horaires } = entry;
  const semaine = hasHoraires(horaires);

  /* getDay() compte depuis dimanche ; JOURS commence lundi. */
  const aujourdhui = JOURS[(new Date().getDay() + 6) % 7];

  return (
    /* `density="tight"` et rien d'autre : le contenu est centré, donc la marge
       verticale ne joue que lorsqu'il dépasse la fenêtre — c'est-à-dire sur un
       téléphone, où les 4rem de la densité normale poussaient la semaine hors
       de l'écran. Aucun `py-*` en className : `Screen` possède sa marge, et une
       classe ajoutée ne la remplace pas, elle se dispute avec elle. */
    <Screen
      id="presentation"
      height="screen-minus-footer"
      rule={false}
      density="tight"
      className="border-t-cp-fg border-t-2"
    >
      {/* Le titre est celui du partenaire quand il en a donné un ; sinon la
          section garde le sien, pour que la hiérarchie de la page tienne.

          Pas de sur-titre au-dessus : le nom du partenaire est déjà le titre
          de la page, deux écrans plus haut, et le répéter ici ne disait rien
          que le lecteur ne savait pas. */}
      <Display level={2} accent="." br={false}>
        {presentationTitre.trim() || "Présentation"}
      </Display>

      <div className="mt-6 grid items-start gap-8 lg:mt-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:gap-16">
        {/* Gauche : le texte, dans une mesure qui se lit. */}
        <div className="max-w-[62ch]">
          <Markdown>{presentationTexte}</Markdown>
        </div>

        {/* Droite : la semaine et l'adresse — les deux choses qu'on vient
            chercher, toujours au même endroit d'une fiche à l'autre. */}
        <div className="border-t-cp-fg border-t-2 pt-5">
          {semaine && (
            <>
              <Micro as="p" tone="muted">
                Horaires d&apos;ouverture
              </Micro>
              {/* Une liste de définitions, parce que c'en est une : un jour,
                  ce qu'il vaut. Un tableau demanderait des en-têtes que
                  personne n'a besoin de lire. */}
              <dl className="mt-4">
                {JOURS.map((jour) => {
                  const valeur = horaires[jour].trim();
                  const courant = jour === aujourdhui;
                  return (
                    <div
                      key={jour}
                      className={`border-cp-border flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b py-2.5 ${
                        courant ? "text-cp-fg" : ""
                      }`}
                    >
                      <dt
                        className={`text-[14px] ${
                          courant ? "text-cp-fg font-black" : "text-cp-muted"
                        }`}
                      >
                        {LABEL[jour]}
                        {courant && (
                          <span className="text-cp-accent ms-2 text-[10px] font-black tracking-[0.14em] uppercase">
                            aujourd&apos;hui
                          </span>
                        )}
                      </dt>
                      <dd
                        className={`text-[14px] tabular-nums ${
                          valeur
                            ? courant
                              ? "text-cp-fg font-black"
                              : "text-cp-fg"
                            : "text-cp-muted"
                        }`}
                      >
                        {valeur || "Fermé"}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </>
          )}

          {siteWeb.trim() && (
            <p className={semaine ? "mt-6" : ""}>
              {!semaine && (
                <Micro as="span" tone="muted" className="mb-3 block">
                  Site internet
                </Micro>
              )}
              <a
                href={siteWebHref(siteWeb)}
                target="_blank"
                rel="noopener noreferrer"
                className="group focus-visible:outline-cp-accent text-cp-fg inline-flex items-center text-[17px] leading-none font-black tracking-[-0.02em] underline underline-offset-[6px] focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {siteWebLabel(siteWeb)}
                <Arrow className="text-cp-accent" />
              </a>
            </p>
          )}
        </div>
      </div>
    </Screen>
  );
}
