"""Verifie un export du journal d'audit — signature ET chainage — sans jamais
se connecter a la base. C'est le point : en cas de suspicion sur la base
elle-meme, une verification qui en depend ne vaut rien.

Deux controles distincts, et c'est deliberé :

  1. La signature HMAC de l'export. Elle protege le fichier exporte lui-meme
     entre sa generation et sa lecture par le controleur (transfert, copie,
     stockage). Elle ne prouve RIEN sur l'etat de la base au moment de
     l'export : un export honnetement regenere depuis une base alteree porte
     une signature parfaitement valide, puisqu'elle est refaite avec la
     vraie cle au moment de l'export.

  2. Le chainage SHA-256 entre enregistrements. Lui seul protege l'historique
     de la base : il est calcule a l'ecriture de chaque ligne (voir
     `audit_chain.py`, partage avec `services/audit_service.py`) et reste
     donc rompu meme dans un export tout frais et parfaitement signe, si la
     base sous-jacente a ete alteree entre-temps. C'est ce controle, pas le
     premier, qui detecte une alteration en base.

Deux formes de rupture, rendues distinctes en sortie :
  - alteration de contenu : l'empreinte recalculee d'un enregistrement ne
    correspond pas a son empreinte stockee → cet enregistrement precis a ete
    modifie apres coup.
  - suppression : deux id consecutifs dans l'export ne se suivent pas → un
    enregistrement intercalaire a disparu, designe par les deux id qui
    l'encadrent.

Usage :
    python verify_audit.py export.json --key <cle_hmac>
    python verify_audit.py export.json                # lit AUDIT_EXPORT_HMAC_KEY

Code de sortie : 0 = conforme, 1 = alteration detectee, 2 = erreur (fichier,
signature, ou format illisible).
"""
import argparse
import hashlib
import hmac
import json
import os
import sys

from audit_chain import GENESIS_PREV_HASH, compute_hash


def _lire_export(chemin):
    try:
        with open(chemin, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as erreur:
        print(f"ERREUR : impossible de lire {chemin} : {erreur}", file=sys.stderr)
        sys.exit(2)


def verifier_signature(export, cle):
    """Reproduit exactement la serialisation de `routes/audit.signer_export` :
    l'objet sans la cle « signature », trie et compact."""
    signature_recue = export.get("signature")
    if not signature_recue:
        return False, "aucune signature dans le fichier"

    sans_signature = {k: v for k, v in export.items() if k != "signature"}
    corps = json.dumps(sans_signature, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    attendue = hmac.new(cle.encode("utf-8"), corps.encode("utf-8"), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(attendue, signature_recue):
        return False, "signature HMAC invalide : le fichier exporte a ete modifie apres sa generation"
    return True, "signature HMAC valide"


def verifier_chaine(entries):
    """Renvoie (conforme: bool, message: str, enregistrement_en_cause: dict | None)."""
    attendu_prev = GENESIS_PREV_HASH
    id_precedent = None

    for entree in entries:
        # 1. Continuite des id : une suppression laisse un trou ici, avant
        # meme de recalculer quoi que ce soit.
        if id_precedent is not None and entree["id"] != id_precedent + 1:
            return False, (
                f"SUPPRESSION DETECTEE : id {id_precedent} suivi de {entree['id']} "
                f"— {entree['id'] - id_precedent - 1} enregistrement(s) manquant(s) "
                f"entre les deux."
            ), entree

        # 2. L'empreinte recalculee doit correspondre a celle stockee : sinon,
        # un champ de CET enregistrement a ete modifie apres son ecriture.
        recalculee = compute_hash(
            entree["prevHash"], entree["occurredAt"], entree["actorId"],
            entree["actorRole"], entree["action"], entree["targetType"],
            entree["targetId"], entree["payload"], entree["ip"],
        )
        if recalculee != entree["hash"]:
            return False, (
                f"ALTERATION DETECTEE sur l'enregistrement id={entree['id']} "
                f"(action={entree['action']!r}) : l'empreinte recalculee a partir "
                f"de son contenu actuel ne correspond pas a l'empreinte stockee. "
                f"Au moins un champ a ete modifie apres l'ecriture."
            ), entree

        # 3. Le chainage proprement dit : cet enregistrement doit reference
        # l'empreinte du precedent, telle que ce precedent l'a vraiment.
        if entree["prevHash"] != attendu_prev:
            return False, (
                f"CHAINAGE ROMPU avant l'enregistrement id={entree['id']} : "
                f"son prev_hash ne correspond pas a l'empreinte de "
                f"l'enregistrement precedent dans cet export."
            ), entree

        attendu_prev = entree["hash"]
        id_precedent = entree["id"]

    return True, f"chaine conforme sur {len(entries)} enregistrement(s)", None


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("fichier", help="export JSON produit par GET /api/v1/admin/audit/export")
    parser.add_argument("--key", dest="cle", default=None, help="cle HMAC (sinon : variable AUDIT_EXPORT_HMAC_KEY)")
    args = parser.parse_args()

    cle = args.cle or os.environ.get("AUDIT_EXPORT_HMAC_KEY")
    if not cle:
        print("ERREUR : cle HMAC absente (--key ou AUDIT_EXPORT_HMAC_KEY).", file=sys.stderr)
        sys.exit(2)

    export = _lire_export(args.fichier)
    if "entries" not in export:
        print("ERREUR : format d'export invalide (pas de champ « entries »).", file=sys.stderr)
        sys.exit(2)

    sig_ok, sig_message = verifier_signature(export, cle)
    print(f"Signature  : {'OK' if sig_ok else 'ECHEC'} — {sig_message}")

    chaine_ok, chaine_message, enregistrement = verifier_chaine(export["entries"])
    print(f"Chainage   : {'OK' if chaine_ok else 'ECHEC'} — {chaine_message}")
    if enregistrement is not None:
        print("Enregistrement en cause :")
        print(json.dumps(enregistrement, indent=2, ensure_ascii=False, sort_keys=True))

    if sig_ok and chaine_ok:
        print("\nVERDICT : CONFORME")
        sys.exit(0)
    else:
        print("\nVERDICT : NON CONFORME")
        sys.exit(1)


if __name__ == "__main__":
    main()
