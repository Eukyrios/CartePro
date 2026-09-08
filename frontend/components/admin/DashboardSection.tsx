"use client";

import { useEffect, useMemo, useState } from "react";
import { getTableauDeBord, type TableauDeBord } from "./api";
import { StatTile, TrendChart, euros } from "./Charts";
import FranceMap from "./FranceMap";
import Display from "@/components/ui/Display";
import EmptyState from "@/components/ui/EmptyState";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import Screen from "@/components/ui/Screen";
import Slash from "@/components/ui/Slash";
import { MICRO } from "@/components/ui/surfaces";

/** Ce que la répartition géographique classe : le montant, ou l'implantation. */
type Mesure = "montant" | "paiements" | "partenaires";

const MESURES: readonly { id: Mesure; label: string; aide: string }[] = [
  { id: "montant", label: "Montant encaissé", aide: "où le dispositif sert" },
  {
    id: "paiements",
    label: "Nombre de paiements",
    aide: "où l’on paie souvent",
  },
  {
    id: "partenaires",
    label: "Établissements",
    aide: "où le réseau est implanté",
  },
];

/**
 * Le tableau de bord national : ce que le dispositif a produit, en chiffres.
 *
 * Un seul appel sert l'écran entier. Six appels afficheraient six états de
 * chargement et pourraient montrer six instants différents du même dispositif,
 * si bien que les chiffres ne s'additionneraient plus — or la première chose
 * qu'on fait devant un tableau de bord, c'est les additionner.
 *
 * **La période est celle des données, pas celle de l'horloge.** Une fenêtre
 * glissante de trente jours, lue sur un jeu de démonstration daté de juin,
 * afficherait zéro partout — et un tableau de bord vide ne dit pas qu'il est
 * vide, il dit que le dispositif ne sert à rien. Les bornes sont donc écrites
 * sous le titre, et ce sont celles de la première et de la dernière écriture.
 *
 * Trois formes, chacune choisie pour ce que le lecteur doit faire :
 *
 * - **des tuiles** pour les chiffres de tête, parce qu'un nombre seul se lit
 *   plus vite qu'un graphique à une barre ;
 * - **une courbe** pour le volume, parce que la question est « est-ce que ça
 *   monte » et qu'aucun tableau ne répond à celle-là d'un coup d'œil ;
 * - **une carte de France** pour la géographie, en aplats par département, en
 *   regard de la courbe : « est-ce que ça monte » et « où », les deux
 *   questions qu'on pose devant un tableau de bord, côte à côte. La carte ne
 *   contredit pas la règle qui en interdisait une au catalogue : ce qui manque
 *   au réseau, ce sont des **coordonnées**, et une épingle en demanderait. Un
 *   aplat de département n'en demande aucune — il se déduit du code postal,
 *   que la fiche porte déjà. Elle est donc exacte au département près et ne
 *   prétend à rien de plus fin. Le classement chiffré, lui, est replié sous
 *   elle : un aplat dit *où* et non *combien*, et un chiffre exact se copie.
 *
 * Le sélecteur de mesure ne relance rien : les trois classements sont dans la
 * même réponse, parce que ce sont trois lectures des mêmes lignes.
 */
export default function DashboardSection() {
  const [data, setData] = useState<TableauDeBord | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [mesure, setMesure] = useState<Mesure>("montant");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    getTableauDeBord()
      .then((rows) => {
        if (cancelled) return;
        setData(rows);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  const barres = useMemo(() => {
    if (!data) return [];
    return data.geographie
      .map((d) => ({
        cle: d.code,
        libelle: `${d.nom}`,
        detail: d.code,
        valeur:
          mesure === "montant"
            ? d.montantCents
            : mesure === "paiements"
              ? d.nombre
              : d.partenaires,
        appoint:
          mesure === "partenaires"
            ? d.villes.join(", ")
            : `${d.partenaires} établissement${d.partenaires > 1 ? "s" : ""} · ${d.villes.join(", ")}`,
      }))
      .sort((a, b) => b.valeur - a.valeur);
  }, [data, mesure]);

  /* La hauteur de la courbe : ce qui reste du premier écran.
   *
   * C'est ce qui reste de la fenêtre sous tout ce qui la précède — barre
   * haute, titre, chiffres de tête, en-tête de colonne et rang de commandes.
   * La constante est mesurée, pas devinée : c'est la hauteur cumulée de ces
   * blocs. Les bornes tiennent les extrêmes — une France de 150 px ne se lit
   * plus, et au-delà de 480 px il n'y a rien de plus à voir, le découpage
   * s'arrêtant au département.
   *
   * La carte n'y est plus : elle a son écran et sa propre hauteur. */
  const hauteurTrace = "clamp(200px, calc(100dvh - 500px), 460px)";

  /* Le même formateur des deux côtés : la carte et le classement affichent la
     même mesure, et deux copies finiraient par ne plus dire pareil. */
  const formatteMesure = (v: number) =>
    mesure === "montant" ? `${euros(v, 0)} €` : v.toLocaleString("fr-FR");

  return (
    <>
      <Screen
        id="tableau-de-bord"
        /* Premier écran de la page : il commence sous la barre haute et ne
         s'accroche pas — l'en-tête lui appartient, donc le rail y ramène en
         haut du document plutôt que sur une ancre. */
        height="below-bar"
        snap={false}
        rule={false}
        align="start"
        /* `tight` et non `offset`, parce que c'est le seul écran qui vit sous
           la barre haute : les autres ouvrent sur du vide, lui ouvre sur 76 px
           de barre, et l'offset de 12vh venait s'y ajouter — d'où deux fois
           plus de blanc au-dessus de son titre qu'au-dessus des autres. C'est
           le cas que `tight` décrit. Il rend aussi la centaine de pixels qui
           manquait pour que l'écran tienne dans la fenêtre. */
        density="tight"
        aria-labelledby="tableau-titre"
      >
        <div>
          <Micro as="p" tone="accent">
            Administration
            <Slash />
            Tableau de bord national
          </Micro>

          <Display
            level={1}
            id="tableau-titre"
            accent="en chiffres."
            /* Assez pour que la jambe du « f » de « chiffres » ne touche pas le
             filet des chiffres de tête, pas plus : sur cet écran, chaque pixel
             repris au blanc va à la carte. */
            className="mt-4 mb-6"
          >
            Le dispositif
          </Display>

          {state === "loading" ? (
            <EmptyState>Chargement des chiffres…</EmptyState>
          ) : state === "error" || !data ? (
            <Note tone="danger" role="alert" className="mt-3">
              Les chiffres n&apos;ont pas pu être chargés. Rechargez la page ;
              si cela persiste, le serveur ne répond pas.
            </Note>
          ) : (
            <>
              {/* Les chiffres de tête. Quatre, pas douze : un tableau de bord
                qui met tout au même niveau ne hiérarchise rien. */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
                <StatTile
                  label="Paiements validés"
                  value={data.volume.nombre.toLocaleString("fr-FR")}
                  detail={`${euros(data.volume.moyenneCents)} € en moyenne`}
                />
                <StatTile
                  label="Volume encaissé"
                  value={`${euros(data.volume.montantCents, 0)} €`}
                  detail="Crédit employeur dépensé chez les partenaires"
                />
                <StatTile
                  label="Partenaires actifs"
                  value={`${data.partenaires.actifs}`}
                  detail={`sur ${data.partenaires.conventionnes} conventionnés — un conventionné qui n’a jamais encaissé n’est pas actif`}
                />
                <StatTile
                  label="Comptes salariés"
                  value={`${data.comptes.parStatut["actif"] ?? 0}`}
                  detail={`actifs sur ${data.comptes.total} — ${data.comptes.parStatut["suspendu"] ?? 0} suspendu(s), ${data.comptes.parStatut["clôturé"] ?? 0} clôturé(s)`}
                />
              </div>

              {/* --- Le volume dans le temps ---

                Toute la largeur : douze mois dans une demi-colonne se
                touchaient, et une série annuelle se lit d'abord en longueur.
                La géographie a repris son écran, elle ne la partage plus. */}
              <div className="mt-8">
                <section aria-labelledby="volume-titre">
                  <h3
                    id="volume-titre"
                    className="text-cp-fg text-[20px] font-black tracking-[-0.04em]"
                  >
                    Volume mois par mois
                  </h3>
                  <p className="text-cp-muted mt-1 text-[13px]">
                    Nombre de paiements validés sur l’année. Le montant du mois
                    apparaît au survol du point.
                  </p>
                  <TrendChart
                    legende="Paiements validés par mois"
                    hauteur={hauteurTrace}
                    points={data.volume.serie.map((m) => ({
                      cle: m.mois,
                      valeur: m.nombre,
                      secondaire: m.montantCents,
                    }))}
                  />
                </section>
              </div>
            </>
          )}
        </div>
      </Screen>

      {state === "ready" && data && (
        <GeoScreen
          mesure={mesure}
          setMesure={setMesure}
          barres={barres}
          formatteMesure={formatteMesure}
        />
      )}
    </>
  );
}

/**
 * La répartition géographique, sur son propre écran.
 *
 * Deux écrans plutôt qu'un, et c'est mesuré : le titre, les quatre chiffres de
 * tête et la courbe occupent 618 px avant elle, quelle que soit la fenêtre.
 * Partagée avec eux dans une fenêtre de 800 px, la carte tombait à 228 px de
 * haut — une France de la taille d'une vignette — et la courbe, réduite à une
 * demi-largeur, ne tenait plus ses douze mois. Chacune a la place qu'il lui
 * faut ; l'écran suivant est à un cran de défilement.
 *
 * Montée seulement une fois les chiffres là : elle n'a rien à peindre avant,
 * et un écran vide qui s'accroche au défilement est un écran qu'on traverse
 * sans savoir pourquoi.
 */
function GeoScreen({
  mesure,
  setMesure,
  barres,
  formatteMesure,
}: {
  mesure: Mesure;
  setMesure: (m: Mesure) => void;
  barres: readonly {
    cle: string;
    libelle: string;
    detail?: string;
    valeur: number;
    appoint?: string;
  }[];
  formatteMesure: (valeur: number) => string;
}) {
  return (
    <Screen
      id="carte"
      height="below-bar"
      align="start"
      density="offset"
      aria-labelledby="geo-titre"
    >
      <div>
        {/* Tout l'appareil de l'écran — surtitre, titre, phrase, commandes —
            tient dans une gouttière à gauche, et la carte prend la hauteur
            entière à droite.

            Posé au-dessus d'elle comme sur les autres écrans, le titre coûtait
            170 px sur toute la largeur : de la hauteur prise à la carte pour
            une bande de texte qui n'en avait pas besoin. Or c'est la hauteur
            qui manque à une France — son tracé est plus haut que large, donc
            la largeur, elle, restait inemployée. Descendu dans la gouttière,
            il ne coûte plus rien à personne. */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div>
            <Micro as="p" tone="accent">
              Administration
              <Slash />
              Tableau de bord national
            </Micro>

            <Display
              level={2}
              id="geo-titre"
              accent="géographique."
              className="mt-4 mb-5"
            >
              Répartition
            </Display>

            <p className="text-cp-muted text-[13px]">
              Par département, depuis le code postal des établissements.
            </p>
            <div
              className="mt-4 flex flex-col items-stretch gap-2"
              role="group"
              aria-label="Classer la répartition par"
            >
              {MESURES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMesure(option.id)}
                  aria-pressed={mesure === option.id}
                  title={option.aide}
                  className={`${MICRO} border-2 px-3 py-2 text-left transition-colors ${
                    mesure === option.id
                      ? "border-cp-fg bg-cp-fg text-cp-page"
                      : "border-cp-border text-cp-muted hover:border-cp-fg hover:text-cp-fg"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <FranceMap
            legende={`Répartition par département — ${MESURES.find((m) => m.id === mesure)?.label}`}
            valeurs={barres.map((barre) => ({
              code: barre.cle,
              nom: barre.libelle,
              valeur: barre.valeur,
              appoint: barre.appoint,
            }))}
            formatte={formatteMesure}
            /* La hauteur entière de l'écran, une fois ses marges retirées :
               plus rien ne la précède, le titre étant passé à gauche. La
               constante est mesurée — barre haute, plus les marges hautes et
               basses de l'écran. Les bornes tiennent les extrêmes : sous
               340 px la France ne se lit plus, et au-delà de 760 px il n'y a
               rien de plus à voir, le découpage s'arrêtant au département. */
            hauteur="clamp(340px, calc(100dvh - 250px), 760px)"
          />
        </div>
      </div>
    </Screen>
  );
}
