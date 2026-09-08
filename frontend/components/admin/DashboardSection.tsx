"use client";

import { useEffect, useMemo, useState } from "react";
import { getTableauDeBord, type TableauDeBord } from "./api";
import { BarList, StatTile, TrendChart, euros, moisLisible } from "./Charts";
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
 * - **des barres horizontales** pour la géographie, et pas une carte. Le
 *   réseau n'a pas de coordonnées — il a une adresse, une ville et un code
 *   postal, et l'application le dit depuis le début. Une carte demanderait de
 *   géocoder, donc d'inventer une précision que la donnée n'a pas.
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
      .filter((b) => b.valeur > 0)
      .sort((a, b) => b.valeur - a.valeur);
  }, [data, mesure]);

  const periode = useMemo(() => {
    if (!data?.periode.debut || !data.periode.fin) return "";
    const debut = data.periode.debut.slice(0, 7);
    const fin = data.periode.fin.slice(0, 7);
    return debut === fin
      ? moisLisible(debut)
      : `${moisLisible(debut)} – ${moisLisible(fin)}`;
  }, [data]);

  return (
    <Screen
      id="tableau-de-bord"
      /* Premier écran de la page : il commence sous la barre haute et ne
         s'accroche pas — l'en-tête lui appartient, donc le rail y ramène en
         haut du document plutôt que sur une ancre. */
      height="below-bar"
      snap={false}
      rule={false}
      align="start"
      density="offset"
      long
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
          className="mt-4 mb-2"
        >
          Le dispositif
        </Display>

        {state === "loading" ? (
          <EmptyState>Chargement des chiffres…</EmptyState>
        ) : state === "error" || !data ? (
          <Note tone="danger" role="alert" className="mt-3">
            Les chiffres n&apos;ont pas pu être chargés. Rechargez la page ; si
            cela persiste, le serveur ne répond pas.
          </Note>
        ) : (
          <>
            <p className="text-cp-muted mb-8 text-[13px]">
              {/* La période est dite, et elle est celle des écritures. Un
                  tableau de bord qui ne dit pas sur quoi il porte laisse
                  croire qu'il porte sur aujourd'hui. */}
              Sur la période observée
              {periode && <> : {periode}</>}. Les montants sont ceux des
              paiements <strong className="font-black">validés</strong> — un
              paiement refusé n’a pas eu lieu et n’est écrit nulle part.
            </p>

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

            <div className="mt-12 grid gap-12 lg:grid-cols-2">
              {/* --- Le volume dans le temps --- */}
              <section aria-labelledby="volume-titre">
                <h3
                  id="volume-titre"
                  className="text-cp-fg text-[20px] font-black tracking-[-0.04em]"
                >
                  Volume mois par mois
                </h3>
                <p className="text-cp-muted mt-1 text-[13px]">
                  Nombre de paiements validés. Le montant du mois apparaît au
                  survol et dans le tableau.
                </p>
                <TrendChart
                  legende="Paiements validés par mois"
                  points={data.volume.serie.map((m) => ({
                    cle: m.mois,
                    valeur: m.nombre,
                    secondaire: m.montantCents,
                  }))}
                />
              </section>

              {/* --- La répartition géographique --- */}
              <section aria-labelledby="geo-titre">
                <h3
                  id="geo-titre"
                  className="text-cp-fg text-[20px] font-black tracking-[-0.04em]"
                >
                  Répartition géographique
                </h3>
                <p className="text-cp-muted mt-1 text-[13px]">
                  Par département, agrégé depuis le code postal des
                  établissements. Pas de carte : le réseau porte une adresse,
                  pas des coordonnées.
                </p>

                {/* Un seul rang de commandes au-dessus du tracé, et il ne
                    relance rien : les trois mesures sont déjà chargées. */}
                <div
                  className="mt-4 flex flex-wrap gap-2"
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
                      className={`${MICRO} border-2 px-3 py-2 transition-colors ${
                        mesure === option.id
                          ? "border-cp-fg bg-cp-fg text-cp-page"
                          : "border-cp-border text-cp-muted hover:border-cp-fg hover:text-cp-fg"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <BarList
                  legende={`Répartition par département — ${MESURES.find((m) => m.id === mesure)?.label}`}
                  barres={barres}
                  /* Six départements en regard du tracé, le reste d'un clic :
                     la colonne de droite tenait dix-huit lignes de trois
                     lignes chacune, soit quatre fois la hauteur de la courbe
                     d'à côté — la grille finissait en une colonne interminable
                     et un trou de la même taille. Six, parce que c'est ce
                     qu'un classement dit vraiment : où le dispositif sert le
                     plus. */
                  plafond={6}
                  formatte={(v) =>
                    mesure === "montant"
                      ? `${euros(v, 0)} €`
                      : v.toLocaleString("fr-FR")
                  }
                />
              </section>
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}
