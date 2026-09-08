"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MICRO } from "@/components/ui/surfaces";

/**
 * Les deux tracés du tableau de bord national, en SVG et en HTML nus.
 *
 * Aucune bibliothèque : le dépôt n'en embarque pas, et deux formes — une
 * courbe et une liste de barres — n'en justifient pas une. Elles suivent les
 * mêmes règles que le reste de l'interface, et quelques-unes qui leur sont
 * propres :
 *
 * - **une seule série par tracé**, donc une seule teinte : `--cp-accent`, celle
 *   de la marque. Pas de légende — un cartouche à une pastille ne ferait que
 *   répéter le titre — et pas de palette catégorielle, qu'il aurait fallu
 *   valider contre les dyschromatopsies ;
 * - **les couleurs sont des variables CSS**, jamais des littéraux. Le thème
 *   sombre les redéfinit, donc les tracés le suivent sans branche ;
 * - **des angles droits**, contre l'usage courant qui arrondit le bout des
 *   barres. La maquette est carrée de bout en bout — `rounded-none` partout,
 *   filets de 2px — et une barre au bout arrondi y serait le seul objet mou ;
 * - **on n'étiquette pas tous les points.** Le dernier et le plus haut, et
 *   l'axe porte le reste. Une valeur sur chaque point ne se lit plus ;
 * - **chaque point et chaque aplat porte un `<title>`**, le nom accessible
 *   natif d'une forme SVG : un lecteur d'écran l'annonce, un navigateur
 *   l'affiche au repos du pointeur. Aucune valeur n'est enfermée dans
 *   l'infobulle dessinée, qui n'est qu'un confort de lecture par-dessus.
 */

/** Une valeur monétaire en centimes, telle que l'écran l'imprime. */
export function euros(cents: number, decimales = 2): string {
  return (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** « 2026-06 » → « juin 2026 ». */
export function moisLisible(cle: string): string {
  const [annee, mois] = cle.split("-").map(Number);
  if (!annee || !mois) return cle;
  return new Date(Date.UTC(annee, mois - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * « 2026-06 » → « juin », « 2026-07 » → « juil. ».
 *
 * L'abréviation de la locale, et non les trois premières lettres : juin et
 * juillet donnent tous deux « jui », et deux mois voisins portant la même
 * étiquette rendent l'axe illisible — c'est exactement le cas du jeu de
 * démonstration.
 */
export function moisCourt(cle: string): string {
  const [annee, mois] = cle.split("-").map(Number);
  if (!annee || !mois) return cle;
  return new Date(Date.UTC(annee, mois - 1, 1)).toLocaleDateString("fr-FR", {
    month: "short",
    timeZone: "UTC",
  });
}

/** Un pas « rond » : 1, 2, 2,5 ou 5 fois une puissance de dix. */
function pasRond(brut: number): number {
  const puissance = 10 ** Math.floor(Math.log10(brut));
  const n = brut / puissance;
  const choix = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return choix * puissance;
}

/**
 * L'échelle verticale : quatre pas ronds qui couvrent la plus haute valeur.
 *
 * Calculée, et non prise comme `max` divisé en quatre : un maximum de 62
 * donnerait des graduations à 15,5 — 0, 18, 35, 53, 70 après arrondi, une
 * suite que personne ne lit. Ici le pas vaut 20 et l'axe porte 0, 20, 40, 60,
 * 80.
 */
function echelle(max: number): { haut: number; pas: number } {
  if (max <= 0) return { haut: 4, pas: 1 };
  const pas = pasRond(max / 4);
  return { haut: pas * 4, pas };
}

export type PointTendance = { cle: string; valeur: number; secondaire: number };

/* -------------------------------------------------------------------------
 * La courbe : un volume mois par mois
 * ---------------------------------------------------------------------- */

const L = { g: 52, d: 16, h: 24, b: 34 };
/** Sous cette largeur les mois se chevauchent : la boîte défile plutôt. */
const LARGEUR_MINIMALE = 560;

/**
 * Le volume dans le temps, une série, en aire lavée sous une ligne de 2px.
 *
 * **Le repère est en pixels, pas en unités abstraites.** La boîte est mesurée,
 * et le `viewBox` reçoit sa taille exacte : une unité vaut un pixel. C'est ce
 * qui permet de commander la hauteur du tracé — un `viewBox` fixe imposait son
 * rapport, donc la hauteur découlait de la largeur de la colonne et on ne
 * pouvait pas la choisir. Au passage, les libellés ne grandissent plus avec le
 * tracé : ils gardent leur corps, comme le reste de l'interface.
 */
export function TrendChart({
  points,
  legende,
  formatte = (v: number) => String(v),
  hauteur = "260px",
}: {
  points: readonly PointTendance[];
  /** Ce que la série mesure : le titre du tracé, puisqu'il n'y a pas de légende. */
  legende: string;
  formatte?: (valeur: number) => string;
  /**
   * La hauteur du tracé, en CSS. Même raison que pour la carte : sur un écran
   * qui doit tenir dans la fenêtre, c'est l'appelant qui sait ce qui reste.
   */
  hauteur?: string;
}) {
  const [survol, setSurvol] = useState<number | null>(null);
  const gradient = useId().replace(/:/g, "");
  const boite = useRef<HTMLDivElement>(null);
  /* Une taille de départ crédible : le premier rendu, côté serveur comme au
     montage, se fait avant toute mesure. Sans elle le tracé naîtrait plat. */
  const [taille, setTaille] = useState({ w: 720, h: 260 });

  useEffect(() => {
    const element = boite.current;
    if (!element) return;
    const observateur = new ResizeObserver(([entree]) => {
      const cadre = entree.contentRect;
      setTaille({
        w: Math.max(Math.round(cadre.width), LARGEUR_MINIMALE),
        h: Math.max(Math.round(cadre.height), 140),
      });
    });
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  const { w: W, h: H } = taille;

  if (points.length === 0) {
    return (
      <p className="text-cp-muted mt-4 text-[13px]">
        Aucune écriture sur la période : il n’y a pas de courbe à tracer.
      </p>
    );
  }

  const { haut, pas: marche } = echelle(
    Math.max(...points.map((p) => p.valeur)),
  );
  const graduations = [0, 1, 2, 3, 4].map((n) => n * marche);
  const large = W - L.g - L.d;
  const tall = H - L.h - L.b;
  /* Un seul mois ne fait pas une courbe : on le pose au milieu plutôt que de
     diviser par zéro. */
  const pas = points.length > 1 ? large / (points.length - 1) : 0;
  const x = (i: number) => L.g + (points.length > 1 ? i * pas : large / 2);
  const y = (v: number) => L.h + tall - (v / haut) * tall;

  const ligne = points.map((p, i) => `${x(i)},${y(p.valeur)}`).join(" ");
  const aire = `${L.g},${L.h + tall} ${ligne} ${x(points.length - 1)},${L.h + tall}`;

  const dernier = points.length - 1;
  const sommet = points.reduce(
    (best, p, i) => (p.valeur > points[best].valeur ? i : best),
    0,
  );
  /* Le dernier point et le plus haut — et un seul si c'est le même. L'axe
     porte les autres : une étiquette par point ne se lit plus.

     Sauf un dernier point à zéro : depuis que la série couvre l'année entière,
     elle finit en décembre, et étiqueter « 0 » sur l'axe des zéros n'apprend
     rien qu'on n'y lise déjà. */
  const etiquetes = [...new Set([sommet, dernier])].filter(
    (i) => points[i].valeur > 0,
  );

  return (
    <figure className="mt-5">
      <div
        ref={boite}
        className="relative overflow-x-auto"
        style={{ height: hauteur }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block"
          width={W}
          height={H}
          role="img"
          aria-label={`${legende}, de ${moisLisible(points[0].cle)} à ${moisLisible(points[dernier].cle)}. Chaque point porte son mois et sa valeur.`}
        >
          <defs>
            {/* Le lavis sous la ligne : la teinte de la série à 10 %, jamais un
                aplat saturé qui pèserait plus que la donnée. */}
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0"
                stopColor="var(--cp-accent)"
                stopOpacity="0.16"
              />
              <stop
                offset="1"
                stopColor="var(--cp-accent)"
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>

          {/* Les filets : un pas rond, en trait plein d'un cheveu. Jamais en
              pointillé — un pointillé attire l'œil que la donnée réclame. */}
          {graduations.map((valeur) => (
            <g key={valeur}>
              <line
                x1={L.g}
                x2={W - L.d}
                y1={y(valeur)}
                y2={y(valeur)}
                stroke="var(--cp-border)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={L.g - 8}
                y={y(valeur) + 3}
                textAnchor="end"
                className={MICRO}
                fill="var(--cp-muted)"
              >
                {formatte(valeur)}
              </text>
            </g>
          ))}

          <polygon points={aire} fill={`url(#${gradient})`} />
          <polyline
            points={ligne}
            fill="none"
            stroke="var(--cp-accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {points.map((p, i) => (
            <g key={p.cle}>
              {/* Le marqueur, cerclé de la couleur du fond : il reste lisible
                  là où il croise la ligne. */}
              <circle
                cx={x(i)}
                cy={y(p.valeur)}
                r={survol === i ? 5.5 : 4}
                fill="var(--cp-accent)"
                stroke="var(--cp-page)"
                strokeWidth="2"
              >
                {/* Le nom accessible du point : c'est lui qui remplace le
                    tableau replié qui accompagnait le tracé. Un lecteur
                    d'écran l'annonce, un navigateur l'affiche au repos du
                    pointeur, et la valeur n'est donc pas réservée au survol
                    dessiné. */}
                <title>
                  {`${moisLisible(p.cle)} — ${formatte(p.valeur)} · ${euros(p.secondaire)} €`}
                </title>
              </circle>
              <text
                x={x(i)}
                y={H - 12}
                textAnchor="middle"
                className={MICRO}
                fill={survol === i ? "var(--cp-fg)" : "var(--cp-muted)"}
              >
                {moisCourt(p.cle)}
              </text>
              {etiquetes.includes(i) && (
                <text
                  x={x(i)}
                  y={y(p.valeur) - 12}
                  /* Le premier point est collé à l'axe : centrer son
                     étiquette la ferait chevaucher la graduation. Elle part
                     donc vers la droite, celle du dernier vers la gauche. */
                  textAnchor={
                    i === 0 && points.length > 1
                      ? "start"
                      : i === dernier && points.length > 1
                        ? "end"
                        : "middle"
                  }
                  className={MICRO}
                  fill="var(--cp-fg)"
                >
                  {formatte(p.valeur)}
                </text>
              )}
              {/* La cible de survol : toute la hauteur de la bande, pour
                  qu'on n'ait pas à viser un point de 8 pixels. */}
              <rect
                x={x(i) - (pas || large) / 2}
                y={L.h}
                width={pas || large}
                height={tall}
                fill="transparent"
                onMouseEnter={() => setSurvol(i)}
                onMouseLeave={() => setSurvol(null)}
              />
            </g>
          ))}
        </svg>

        {survol !== null && (
          <div
            className="border-cp-fg bg-cp-page pointer-events-none absolute top-0 border-2 px-3 py-2"
            style={{
              left: `${(x(survol) / W) * 100}%`,
              transform:
                survol > points.length / 2
                  ? "translateX(-100%)"
                  : "translateX(0)",
            }}
          >
            <p className={`${MICRO} text-cp-muted`}>
              {moisLisible(points[survol].cle)}
            </p>
            <p className="text-cp-fg mt-1 text-[15px] font-black tracking-[-0.02em]">
              {formatte(points[survol].valeur)}
            </p>
            <p className="text-cp-muted text-[12px]">
              {euros(points[survol].secondaire)} €
            </p>
          </div>
        )}
      </div>
    </figure>
  );
}

/* -------------------------------------------------------------------------
 * La liste de barres : une répartition, la plus grande en haut
 * ---------------------------------------------------------------------- */

export type Barre = {
  cle: string;
  libelle: string;
  /** Sous le libellé, en petit : ce qui situe la ligne. */
  detail?: string;
  valeur: number;
  /** Ce que le survol ajoute. */
  appoint?: string;
};

/**
 * Une répartition en barres horizontales, triée du plus grand au plus petit.
 *
 * Horizontales parce que les libellés sont longs — « Bouches-du-Rhône » ne
 * tient pas sous une colonne — et en HTML plutôt qu'en SVG : le texte s'y
 * replie tout seul et la ligne reste sélectionnable.
 *
 * Ce n'est pas une carte, et ce n'en sera pas une : le réseau porte une
 * adresse, une ville et un code postal, pas des coordonnées. Une carte
 * demanderait de géocoder, donc d'inventer une précision que la donnée n'a
 * pas, et répondrait moins bien à « où encaisse-t-on le plus » qu'une liste
 * ordonnée.
 */
export function BarList({
  barres,
  formatte = (v: number) => String(v),
  legende,
  plafond,
}: {
  barres: readonly Barre[];
  formatte?: (valeur: number) => string;
  legende: string;
  /**
   * Combien de lignes la liste montre avant de se replier. Sans plafond, elle
   * montre tout.
   *
   * Une répartition compte autant de lignes que le réseau a d’implantations —
   * dix-huit départements aujourd’hui, trois lignes de texte chacun. Posée à
   * côté d’un tracé de deux cent soixante-dix pixels dans une grille à deux
   * colonnes, elle en fait quatre fois la hauteur : une colonne file vers le
   * bas, l’autre laisse un trou aussi grand qu’elle. Le plafond garde ce
   * qu’on lit d’un classement — son haut — et le reste s’ouvre d’un clic.
   */
  plafond?: number;
}) {
  const liste = useId().replace(/:/g, "");
  const [tout, setTout] = useState(false);

  if (barres.length === 0) {
    return (
      <p className="text-cp-muted mt-4 text-[13px]">
        Aucun établissement localisé : il n’y a rien à répartir.
      </p>
    );
  }

  /* L’échelle porte sur toutes les barres, y compris celles que le plafond
     cache : calculée sur les visibles, la plus longue repartirait de la pleine
     largeur à chaque ouverture, et les longueurs déjà lues changeraient de
     sens sans que la donnée ait bougé. */
  const max = Math.max(...barres.map((b) => b.valeur), 1);
  const cachees = plafond ? Math.max(barres.length - plafond, 0) : 0;
  const visibles = tout || cachees === 0 ? barres : barres.slice(0, plafond);

  return (
    <>
      <ul id={liste} className="mt-5 space-y-3" aria-label={legende}>
        {visibles.map((barre) => (
          <li key={barre.cle} className="group">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-cp-fg text-[14px] font-black tracking-[-0.02em]">
                {barre.libelle}
                {barre.detail && (
                  <span className="text-cp-muted ml-2 text-[12px] font-normal tracking-normal">
                    {barre.detail}
                  </span>
                )}
              </p>
              {/* La valeur au bout, en chiffres tabulaires : les lignes
                s'alignent, donc elles se comparent sans les lire. */}
              <p className="text-cp-fg shrink-0 text-[13px] tabular-nums">
                {formatte(barre.valeur)}
              </p>
            </div>
            <div
              className="bg-cp-surface mt-1.5 h-3 w-full"
              role="img"
              aria-label={`${barre.libelle} : ${formatte(barre.valeur)}${barre.appoint ? `, ${barre.appoint}` : ""}`}
            >
              <div
                className="bg-cp-accent h-3 transition-[width] duration-500"
                style={{ width: `${Math.max((barre.valeur / max) * 100, 1)}%` }}
              />
            </div>
            {barre.appoint && (
              <p className="text-cp-muted mt-1 text-[12px]">{barre.appoint}</p>
            )}
          </li>
        ))}
      </ul>

      {/* Le dépliant dit ce qu’il cache, en nombre : « voir la suite » ne
          laisse pas deviner s’il reste deux lignes ou vingt. */}
      {cachees > 0 && (
        <button
          type="button"
          onClick={() => setTout((ouvert) => !ouvert)}
          aria-expanded={tout}
          aria-controls={liste}
          className={`${MICRO} text-cp-muted hover:text-cp-fg mt-4 cursor-pointer`}
        >
          {tout ? "Replier la liste" : `Voir les ${cachees} autres`}
        </button>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------
 * La tuile de chiffre
 * ---------------------------------------------------------------------- */

/**
 * Un chiffre qui mène la lecture : libellé, valeur, et une précision dessous.
 *
 * Pas un graphique à une barre — un nombre seul se lit plus vite qu'une barre
 * qu'il faut rapporter à une échelle.
 */
export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="border-cp-border border-t-2 pt-3">
      <p className={`${MICRO} text-cp-muted`}>{label}</p>
      <p className="text-cp-fg mt-2 text-[clamp(28px,3.2vw,40px)] leading-[0.9] font-black tracking-[-0.05em] tabular-nums">
        {value}
      </p>
      {detail && <p className="text-cp-muted mt-2 text-[12px]">{detail}</p>}
    </div>
  );
}
