"use client";

import { useEffect, useMemo, useState } from "react";
import { MICRO } from "@/components/ui/surfaces";

/**
 * La carte de France du tableau de bord : un aplat par département.
 *
 * Elle remplace une liste de barres, et la raison de départ contre une carte
 * ne s'applique pas ici. Ce qui manque au réseau, ce sont des **coordonnées** :
 * un partenaire porte une adresse, une ville et un code postal, donc on ne peut
 * pas poser une épingle sans géocoder, c'est-à-dire sans inventer une précision
 * que la donnée n'a pas. Un aplat par département n'en demande aucune — il se
 * déduit du code postal, que la fiche porte déjà. La carte est donc exacte au
 * département près, et elle ne prétend à rien de plus fin.
 *
 * **Une teinte, cinq marches.** Une échelle séquentielle se lit par la clarté,
 * pas par la couleur : la teinte de la marque à cinq opacités croissantes, et
 * rien d'autre. Un dégradé arc-en-ciel donnerait un ordre que personne ne lit
 * dans le même sens. Comme les marches sont des opacités de `--cp-accent`
 * posées sur `--cp-page`, elles suivent le thème sombre sans branche : sur fond
 * clair, plus c'est foncé, plus c'est haut ; sur fond sombre, plus c'est clair.
 *
 * **Trois états, et non deux.** « Aucun établissement » et « un établissement
 * qui n'a rien encaissé » sont deux faits différents : dans le premier cas la
 * question ne se pose pas, dans le second la réponse est zéro. Les peindre
 * pareil ferait mentir la carte sur l'implantation du réseau. Ni l'un ni
 * l'autre ne prend la première marche de l'échelle, réservée à une valeur non
 * nulle.
 *
 * **Chaque aplat porte un `<title>`.** C'est le nom accessible natif d'une
 * forme SVG : un lecteur d'écran l'annonce, et un navigateur l'affiche au
 * repos du pointeur. La valeur d'un département n'est donc pas enfermée dans
 * l'infobulle dessinée, qui n'est qu'un confort de lecture par-dessus.
 *
 * **Le fond ne vient pas du réseau à l'exécution de l'application.** Il est
 * fabriqué une fois par `tools/build-carte.py` dans `public/carte/`, et servi
 * comme n'importe quelle image. Il est chargé ici et non importé, pour qu'il
 * ne pèse pas sur le paquet de la page d'accueil, que tout visiteur télécharge.
 */

/** Le fond de carte, tel que `tools/build-carte.py` l'écrit. */
type FondDeCarte = {
  largeur: number;
  hauteur: number;
  source: string;
  departements: { code: string; nom: string; d: string }[];
};

export type ValeurDepartement = {
  /** Deux chiffres, comme le rend l'API. */
  code: string;
  nom: string;
  valeur: number;
  /** La ligne du survol, sous le nom. */
  appoint?: string;
};

/**
 * La Corse porte le code postal 20 et deux départements, 2A et 2B.
 *
 * L'API agrège sur le code postal, donc elle rend « 20 » ; le fond de carte,
 * lui, découpe la Corse-du-Sud et la Haute-Corse. Les deux formes reçoivent
 * donc la même valeur, et le survol le dit — plutôt que de laisser une île en
 * blanc alors qu'elle a des partenaires, ou de prétendre savoir laquelle des
 * deux a encaissé.
 */
const CORSE = ["2A", "2B"];
const codeApi = (codeCarte: string) =>
  CORSE.includes(codeCarte) ? "20" : codeCarte;

/** Cinq marches : ni deux, qui n'ordonnent rien, ni dix, qu'on ne distingue plus. */
const MARCHES = [0.16, 0.34, 0.54, 0.76, 1] as const;

export default function FranceMap({
  valeurs,
  formatte = (v: number) => String(v),
  legende,
  hauteur = "min(54vh, 600px)",
}: {
  valeurs: readonly ValeurDepartement[];
  formatte?: (valeur: number) => string;
  /** Ce que la carte mesure : elle n'a pas de titre à elle. */
  legende: string;
  /**
   * La hauteur du tracé, en CSS. C'est **la hauteur** qui commande et non la
   * largeur : la carte doit tenir dans l'écran qui la porte, sinon il faut
   * défiler pour voir le sud du pays — et sur une carte, défiler revient à en
   * cacher la moitié. La largeur suit ensuite le rapport du tracé, donc rien
   * n'est déformé et il ne reste pas de bandes vides sur les côtés.
   *
   * Une propriété et non une classe : `cx` ne fusionne pas, donc un
   * `className` passé par l'appelant s'ajouterait à la hauteur de base au lieu
   * de la remplacer. C'est la règle que `ui/cx.ts` énonce — ce qu'un appelant
   * doit faire varier est une propriété.
   *
   * Attendu : une expression `clamp()` calée sur ce qui occupe l'écran
   * au-dessus de la carte, pour qu'elle prenne la place qui reste et pas plus.
   */
  hauteur?: string;
}) {
  const [fond, setFond] = useState<FondDeCarte | null>(null);
  const [etat, setEtat] = useState<"chargement" | "prêt" | "erreur">(
    "chargement",
  );
  const [survol, setSurvol] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    fetch("/carte/departements.json")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((data: FondDeCarte) => {
        if (annule) return;
        setFond(data);
        setEtat("prêt");
      })
      .catch(() => !annule && setEtat("erreur"));
    return () => {
      annule = true;
    };
  }, []);

  const parCode = useMemo(() => {
    const table = new Map<string, ValeurDepartement>();
    for (const v of valeurs) table.set(v.code, v);
    return table;
  }, [valeurs]);

  const max = useMemo(
    () => Math.max(...valeurs.map((v) => v.valeur), 0),
    [valeurs],
  );

  /**
   * La marche d'un département : -1 sans établissement, 0 avec mais à zéro sur
   * la mesure, puis 1 à 5 sur l'échelle.
   */
  const marche = (valeur: number | undefined) => {
    if (valeur === undefined) return -1;
    if (valeur <= 0 || max <= 0) return 0;
    const part = valeur / max;
    return MARCHES.findIndex((seuil) => part <= seuil) + 1 || MARCHES.length;
  };

  /* Sans donnée, l'aplat prend le panneau et non le fond de la page : posée
     sur la page elle-même, la France n'était plus une silhouette mais un trou
     cerné d'un filet, et le pays cessait de se lire d'un coup d'œil. Un cran
     d'élévation suffit, et il reste franchement en deçà de la première
     marche de l'échelle. */
  const remplissage = (rang: number) =>
    rang === -1
      ? "var(--cp-surface)"
      : rang === 0
        ? "var(--cp-border)"
        : "var(--cp-accent)";

  /* Les départements que le fond ne porte pas — l'outre-mer — sont listés
     sous la carte plutôt que posés au hasard dessus. */
  const horsCarte = useMemo(() => {
    if (!fond) return [];
    const dessines = new Set(fond.departements.map((d) => codeApi(d.code)));
    return valeurs.filter((v) => !dessines.has(v.code));
  }, [fond, valeurs]);

  if (etat === "chargement") {
    return (
      <p className="text-cp-muted mt-5 text-[13px]">
        Chargement du fond de carte…
      </p>
    );
  }
  if (etat === "erreur" || !fond) {
    return (
      <p className="text-cp-muted mt-5 text-[13px]">
        Le fond de carte n’a pas pu être chargé. Les chiffres du dispositif
        restent lisibles au-dessus.
      </p>
    );
  }

  const survole = survol ? parCode.get(codeApi(survol)) : null;
  const nomSurvole = fond.departements.find((d) => d.code === survol)?.nom;

  return (
    <figure className="mt-5">
      <div className="relative">
        <svg
          viewBox={`0 0 ${fond.largeur} ${fond.hauteur}`}
          className="mx-auto block w-auto max-w-full"
          style={{ height: hauteur }}
          role="img"
          aria-label={`${legende}. Carte des départements : chaque département porte son nom et sa valeur.`}
        >
          {fond.departements.map((departement) => {
            const valeur = parCode.get(codeApi(departement.code));
            const rang = marche(valeur?.valeur);
            const actif = survol === departement.code;
            return (
              <path
                key={departement.code}
                d={departement.d}
                fill={remplissage(rang)}
                fillOpacity={rang <= 0 ? 1 : MARCHES[rang - 1]}
                /* Le filet sépare deux aplats voisins de marches proches : sans
                   lui, deux départements limitrophes se lisent comme un seul. */
                stroke={actif ? "var(--cp-fg)" : "var(--cp-border)"}
                strokeWidth={actif ? 2 : 0.75}
                vectorEffect="non-scaling-stroke"
                onMouseEnter={() => setSurvol(departement.code)}
                onMouseLeave={() => setSurvol(null)}
              >
                <title>
                  {departement.nom}
                  {valeur
                    ? ` — ${formatte(valeur.valeur)}`
                    : " — aucun établissement conventionné"}
                </title>
              </path>
            );
          })}
        </svg>

        {survole && (
          <div className="border-cp-fg bg-cp-page pointer-events-none absolute top-0 left-0 border-2 px-3 py-2">
            <p className={`${MICRO} text-cp-muted`}>
              {nomSurvole} · {survol}
            </p>
            <p className="text-cp-fg mt-1 text-[15px] font-black tracking-[-0.02em]">
              {formatte(survole.valeur)}
            </p>
            {survole.appoint && (
              <p className="text-cp-muted mt-0.5 max-w-[28ch] text-[12px]">
                {survole.appoint}
              </p>
            )}
          </div>
        )}
        {survol && !survole && (
          <div className="border-cp-border bg-cp-page pointer-events-none absolute top-0 left-0 border-2 px-3 py-2">
            <p className={`${MICRO} text-cp-muted`}>
              {nomSurvole} · {survol}
            </p>
            <p className="text-cp-muted mt-1 text-[13px]">
              Aucun établissement conventionné
            </p>
          </div>
        )}
      </div>

      {horsCarte.length > 0 && (
        <div className="border-cp-border mt-4 border-t pt-3">
          <p className={`${MICRO} text-cp-muted`}>
            Hors du fond de carte — l’outre-mer n’y figure pas
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            {horsCarte.map((v) => (
              <li key={v.code} className="text-cp-fg text-[13px]">
                {v.nom}{" "}
                <span className="tabular-nums">{formatte(v.valeur)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}
