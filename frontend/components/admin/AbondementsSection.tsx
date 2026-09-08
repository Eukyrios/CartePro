"use client";

import { useEffect, useMemo, useState } from "react";
import { fold } from "@/lib/text";
import {
  crediter,
  getAbondements,
  getComptes,
  type Abondement,
  type Compte,
} from "./api";
import { euros } from "./Charts";
import Button from "@/components/ui/Button";
import Display from "@/components/ui/Display";
import EmptyState from "@/components/ui/EmptyState";
import Micro from "@/components/ui/Micro";
import Note from "@/components/ui/Note";
import Screen from "@/components/ui/Screen";
import Slash from "@/components/ui/Slash";
import TextField from "@/components/ui/TextField";
import { LIST_WINDOW, MICRO } from "@/components/ui/surfaces";

/** Les montants qu'on saisit le plus, en centimes. */
const RACCOURCIS = [2500, 5000, 10000, 20000];

/**
 * Une clé d'idempotence pour une saisie.
 *
 * Tirée ici et non côté serveur, parce que c'est *le navigateur* qui peut
 * envoyer deux fois : un double-clic, un réseau qui repart, un onglet
 * rechargé. Une clé tirée à l'arrivée serait différente à chaque envoi et ne
 * protégerait de rien. Elle change quand la saisie change — nouveau montant ou
 * nouvelle sélection — et pas avant.
 *
 * `crypto.randomUUID` là où il existe ; le repli couvre les contextes non
 * sécurisés, où il n'est pas exposé.
 */
function nouvelleCle(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** « 12,50 » ou « 12.50 » → 1250 centimes. NaN si la saisie ne veut rien dire. */
function enCentimes(saisie: string): number {
  const propre = saisie.replace(/\s/g, "").replace(",", ".");
  if (!/^\d*\.?\d{0,2}$/.test(propre) || propre === "" || propre === ".") {
    return NaN;
  }
  return Math.round(Number(propre) * 100);
}

/**
 * La gestion des abondements employeurs : créditer les comptes salariés.
 *
 * C'est le seul écran de l'application qui **crée** de l'argent sur un compte —
 * tout le reste en dépense — et sa forme en découle.
 *
 * **Une clé d'idempotence part avec chaque saisie.** Elle est tirée au montage
 * du formulaire et renouvelée quand la saisie change, jamais à l'envoi : un
 * double-clic renvoie donc la *même* clé, le serveur reconnaît la saisie et
 * rend ce qu'il avait déjà écrit au lieu de créditer une seconde fois. Le
 * bouton se désarme pendant l'envoi, mais ce n'est qu'un confort : c'est la clé
 * qui protège, parce qu'un onglet rechargé ne voit pas un bouton désarmé.
 *
 * **On crédite plusieurs comptes à la fois**, parce que c'est le geste réel :
 * une dotation se verse à une promotion, pas à une personne. Le lot est
 * atomique côté serveur — un seul compte fermé et rien n'est écrit —, donc
 * l'écran n'a jamais à afficher un demi-résultat.
 *
 * **Les comptes fermés ne sont pas sélectionnables.** Le serveur les refuse
 * (409) ; les présenter cochables reviendrait à proposer un geste qu'on sait
 * voué à l'échec.
 */
export default function AbondementsSection() {
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [lignes, setLignes] = useState<Abondement[]>([]);
  const [plafond, setPlafond] = useState(500_000);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const [recherche, setRecherche] = useState("");
  const [choisis, setChoisis] = useState<ReadonlySet<number>>(new Set());
  const [montant, setMontant] = useState("50,00");
  const [cle, setCle] = useState(nouvelleCle);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [avis, setAvis] = useState("");

  const charger = async () => {
    const [tousComptes, versements] = await Promise.all([
      getComptes(),
      getAbondements(60),
    ]);
    setComptes(tousComptes);
    setLignes(versements.abondements);
    setPlafond(versements.plafondCents);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([getComptes(), getAbondements(60)])
      .then(([tousComptes, versements]) => {
        if (cancelled) return;
        setComptes(tousComptes);
        setLignes(versements.abondements);
        setPlafond(versements.plafondCents);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  /* Seuls les comptes actifs se créditent. Les autres sont comptés sous la
     liste plutôt que masqués en silence : « il en manque deux » est une
     question qu'on se pose, et l'écran doit y répondre. */
  const creditables = useMemo(
    () => comptes.filter((c) => c.statut === "actif"),
    [comptes],
  );
  const fermes = comptes.length - creditables.length;

  const visibles = useMemo(() => {
    const wanted = fold(recherche);
    if (!wanted) return creditables;
    return creditables.filter(
      (c) => fold(c.nom).includes(wanted) || fold(c.email).includes(wanted),
    );
  }, [creditables, recherche]);

  const cents = enCentimes(montant);
  const valide =
    Number.isFinite(cents) && cents > 0 && cents <= plafond && choisis.size > 0;
  const total = Number.isFinite(cents) ? cents * choisis.size : 0;

  /* Toute modification de la saisie repart sur une clé neuve : deux dotations
     différentes ne doivent pas se prendre l'une pour l'autre. */
  const modifier = (action: () => void) => {
    action();
    setCle(nouvelleCle());
    setAvis("");
    setErreur("");
  };

  const basculer = (id: number) =>
    modifier(() =>
      setChoisis((actuels) => {
        const suivant = new Set(actuels);
        if (suivant.has(id)) suivant.delete(id);
        else suivant.add(id);
        return suivant;
      }),
    );

  const toutBasculer = () =>
    modifier(() =>
      setChoisis((actuels) =>
        actuels.size === visibles.length
          ? new Set<number>()
          : new Set(visibles.map((c) => c.id)),
      ),
    );

  const verser = async () => {
    if (!valide || envoi) return;
    setEnvoi(true);
    setErreur("");
    try {
      const reponse = await crediter([...choisis], cents, cle);
      setAvis(
        reponse.rejoue
          ? `${reponse.message} Cette saisie avait déjà été enregistrée : rien n’a été crédité une seconde fois.`
          : reponse.message,
      );
      setChoisis(new Set());
      setCle(nouvelleCle());
      await charger();
    } catch (cause) {
      setErreur(
        cause instanceof Error
          ? cause.message
          : "Le versement n’a pas pu être enregistré.",
      );
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Screen
      id="abondements"
      /* Dernier écran de l'espace : il laisse la place du pied de page, et les
         deux ensemble font exactement une fenêtre. */
      height="screen-minus-footer"
      align="start"
      density="offset"
      long
      aria-labelledby="abondements-titre"
    >
      <div>
        <Micro as="p" tone="accent">
          Administration
          <Slash />
          Abondements employeurs
        </Micro>

        <Display
          level={2}
          id="abondements-titre"
          accent="les comptes."
          className="mt-4 mb-8"
        >
          Créditer
        </Display>

        {state === "loading" ? (
          <EmptyState>Chargement des comptes…</EmptyState>
        ) : state === "error" ? (
          <Note tone="danger" role="alert">
            Les comptes n&apos;ont pas pu être chargés. Rechargez la page ; si
            cela persiste, le serveur ne répond pas.
          </Note>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* --- La saisie --- */}
            <section aria-labelledby="saisie-titre">
              <h3
                id="saisie-titre"
                className="text-cp-fg text-[20px] font-black tracking-[-0.04em]"
              >
                Nouvelle dotation
              </h3>

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <TextField
                  id="abondement-montant"
                  label="Montant par compte"
                  value={montant}
                  onChange={(value) => modifier(() => setMontant(value))}
                  inputMode="decimal"
                  className="w-44"
                  error={
                    montant !== "" && !Number.isFinite(cents)
                      ? "Montant illisible."
                      : Number.isFinite(cents) && cents > plafond
                        ? `Plafond de saisie : ${euros(plafond, 0)} €.`
                        : undefined
                  }
                />
                <div className="flex flex-wrap gap-2 pb-1">
                  {RACCOURCIS.map((valeur) => (
                    <button
                      key={valeur}
                      type="button"
                      onClick={() =>
                        modifier(() =>
                          setMontant(euros(valeur).replace(".", ",")),
                        )
                      }
                      className={`${MICRO} border-cp-border text-cp-muted hover:border-cp-fg hover:text-cp-fg border-2 px-3 py-2`}
                    >
                      {euros(valeur, 0)} €
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-end justify-between gap-4">
                <TextField
                  id="abondement-recherche"
                  label="Filtrer les comptes"
                  value={recherche}
                  onChange={setRecherche}
                  placeholder="Nom ou adresse"
                  type="search"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={toutBasculer}
                  disabled={visibles.length === 0}
                  className={`${MICRO} text-cp-accent decoration-cp-accent mb-3 underline underline-offset-4 hover:decoration-2 disabled:opacity-30`}
                >
                  {choisis.size === visibles.length && visibles.length > 0
                    ? "Tout décocher"
                    : "Tout cocher"}
                </button>
              </div>

              {visibles.length === 0 ? (
                <EmptyState>
                  Aucun compte actif ne correspond à cette recherche.
                </EmptyState>
              ) : (
                <div
                  className={`border-cp-border mt-3 border-t-2 ${LIST_WINDOW}`}
                >
                  <ul>
                    {visibles.map((compte) => (
                      <li
                        key={compte.id}
                        className="border-cp-border hover:bg-cp-surface border-b"
                      >
                        <label className="flex cursor-pointer items-center gap-3 py-3">
                          <input
                            type="checkbox"
                            checked={choisis.has(compte.id)}
                            onChange={() => basculer(compte.id)}
                            className="accent-cp-accent size-4 shrink-0"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="text-cp-fg block truncate text-[14px] font-black tracking-[-0.02em]">
                              {compte.nom}
                            </span>
                            <span className="text-cp-muted block truncate text-[12px]">
                              {compte.email}
                            </span>
                          </span>
                          <span className="text-cp-muted shrink-0 text-[13px] tabular-nums">
                            {euros(compte.soldeCents)} €
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {fermes > 0 && (
                <p className="text-cp-muted mt-3 text-[12px]">
                  {fermes} compte{fermes > 1 ? "s" : ""} suspendu ou clôturé
                  {fermes > 1 ? "s" : ""} n’apparaî{fermes > 1 ? "ssent" : "t"}{" "}
                  pas : un compte fermé ne se crédite pas, son titulaire ne
                  pourrait rien en dépenser.
                </p>
              )}

              <div className="border-cp-fg mt-6 border-t-2 pt-4">
                <p className={`${MICRO} text-cp-muted`}>Total du versement</p>
                <p className="text-cp-fg mt-1 text-[28px] leading-none font-black tracking-[-0.05em] tabular-nums">
                  {euros(total)} €
                </p>
                <p className="text-cp-muted mt-2 text-[12px]">
                  {choisis.size} compte{choisis.size > 1 ? "s" : ""} ×{" "}
                  {Number.isFinite(cents) ? euros(cents) : "—"} €
                </p>

                {erreur && (
                  <Note tone="danger" role="alert" className="mt-4">
                    {erreur}
                  </Note>
                )}
                {avis && (
                  <Note tone="positive" role="status" className="mt-4">
                    {avis}
                  </Note>
                )}

                <Button
                  variant="solid"
                  onClick={verser}
                  disabled={!valide || envoi}
                  className="mt-4"
                >
                  {envoi ? "Versement…" : "Créditer les comptes"}
                </Button>
              </div>
            </section>

            {/* --- Ce qui a été versé --- */}
            <section aria-labelledby="versements-titre">
              <h3
                id="versements-titre"
                className="text-cp-fg text-[20px] font-black tracking-[-0.04em]"
              >
                Derniers versements
              </h3>
              <p className="text-cp-muted mt-1 mb-4 text-[13px]">
                Les soixante plus récents, du dernier au premier.
              </p>

              {lignes.length === 0 ? (
                <EmptyState>Aucun versement enregistré.</EmptyState>
              ) : (
                <div className={LIST_WINDOW}>
                  <table className="border-t-cp-fg w-full border-t-2 text-left">
                    <caption className="sr-only">
                      Abondements versés, du plus récent au plus ancien.
                    </caption>
                    <thead className="bg-cp-page sticky top-0">
                      <tr className={`border-cp-border border-b ${MICRO}`}>
                        <th scope="col" className="py-3 font-black">
                          Compte
                        </th>
                        <th
                          scope="col"
                          className="hidden py-3 font-black sm:table-cell"
                        >
                          Date
                        </th>
                        <th scope="col" className="py-3 text-right font-black">
                          Montant
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((ligne) => (
                        <tr
                          key={ligne.id}
                          className="border-cp-border hover:bg-cp-surface border-b"
                        >
                          <td className="text-cp-fg py-3 pr-4 text-[14px] font-black tracking-[-0.02em]">
                            {ligne.salarie}
                            <span className="text-cp-muted mt-1 block text-[12px] font-normal tracking-normal">
                              {ligne.employeur}
                            </span>
                          </td>
                          <td className="text-cp-muted hidden py-3 pr-4 text-[13px] sm:table-cell">
                            {ligne.at
                              ? new Date(ligne.at).toLocaleDateString("fr-FR")
                              : "—"}
                          </td>
                          <td className="text-cp-positive py-3 text-right text-[13px] font-black tabular-nums">
                            + {euros(ligne.montantCents)} €
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </Screen>
  );
}
