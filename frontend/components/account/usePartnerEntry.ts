"use client";

import { useEffect, useState } from "react";
import { api, type ApiPartner } from "@/lib/api";
import { useAccount } from "./AccountProvider";

/**
 * La fiche du partenaire connecté, telle que le réseau la porte.
 *
 * C'est là que vivent son slug — l'identifiant que l'encaissement doit envoyer
 * — son tarif, et surtout son **conventionnement** : `officiel` est la réponse
 * du Ministère, et rien d'autre ne la donne. Le compte, lui, ne porte que le
 * profil déclaré par le partenaire.
 *
 * Extrait parce que deux écrans posent la même question et devaient y répondre
 * pareil : l'espace partenaire, qui barre l'encaissement et les recettes tant
 * que le conventionnement manque, et les paramètres, qui l'annoncent. Ils la
 * posaient différemment — l'espace interrogeait le serveur, les paramètres
 * cherchaient dans la liste locale de `data/partners` — si bien qu'à la
 * première divergence entre la base et cette liste, la page aurait affiché
 * « Partenaire Officiel » au-dessus d'un espace verrouillé.
 *
 * `loaded` est distinct de `entry !== null` : sans lui, « pas encore chargé »
 * et « absent du réseau » se confondent, et un appelant refuserait l'accès le
 * temps d'une requête.
 *
 * La jointure se fait par la raison sociale, faute d'identifiant de partenaire
 * dans le profil du compte. Elle disparaîtra quand le backend en donnera un.
 */
export function usePartnerEntry(): {
  entry: ApiPartner | null;
  loaded: boolean;
} {
  const { profile } = useAccount();
  const [entry, setEntry] = useState<ApiPartner | null>(null);
  const [loaded, setLoaded] = useState(false);

  const raison =
    profile?.audience === "partner" ? profile.partner.raisonSociale : null;

  useEffect(() => {
    if (raison === null) {
      setEntry(null);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    api<ApiPartner[]>("/api/partenaires/catalogue")
      .then((partners) => {
        if (cancelled) return;
        setEntry(
          partners.find(
            (partner) =>
              partner.nom.localeCompare(raison, "fr", {
                sensitivity: "base",
              }) === 0,
          ) ?? null,
        );
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [raison]);

  return { entry, loaded };
}
