/**
 * The salarié's balance, history and payment tokens.
 *
 * WHAT THIS IS NOT: a backend. Every rule below is enforced here, in the
 * browser, which means it is enforced for the demonstration and not for real —
 * anyone with devtools can edit the stored state. Three of the required rules
 * genuinely cannot be honoured client-side, and are marked in place:
 *
 *   - the QR token is unsigned; signing has to happen server-side, or the
 *     signature proves nothing;
 *   - "zero and negative amounts refused by a database integrity constraint"
 *     is a CHECK constraint, and there is no database;
 *   - "refused server-side" for an over-balance debit is refused here instead.
 *
 * What this module does do is put all of them in one place and give them the
 * shape the server will have, so moving them is replacing this file's four
 * functions with fetches — no screen changes.
 *
 * Money is integer cents throughout. Floating-point euros do not survive being
 * added up.
 */

/** Where the ledger is kept between page loads, alongside the profile. */
const STORAGE_KEY = "ticket-tout.ledger";

/** A payment token lives five minutes, and is good for exactly one payment. */
export const QR_TTL_MS = 5 * 60 * 1000;

export type Transaction = {
  id: string;
  /** ISO 8601, so the stored form sorts and reads the same everywhere. */
  at: string;
  kind: "credit" | "debit";
  /** Always strictly positive: the kind carries the direction. */
  amountCents: number;
  /** The employer for a credit, the partner for a debit. */
  label: string;
  partnerId?: string;
};

export type QrToken = {
  /**
   * Le partenaire pour qui le jeton a été émis. Ce n'est pas une donnée
   * personnelle — c'est le commerçant — et cela permet à un écran de savoir si
   * le jeton en cours est le sien plutôt que de le déduire du montant.
   */
  partnerId?: string;
  /**
   * Random, and the whole of what the QR carries besides its expiry: no name,
   * no email, no employer, no amount — the partner's terminal resolves the
   * token against the backend, so nothing personal ever leaves the screen.
   */
  id: string;
  amountCents: number;
  issuedAt: number;
  expiresAt: number;
  usedAt?: number;
};

export type Ledger = {
  transactions: Transaction[];
  /** At most one token is live at a time; issuing a new one drops the old. */
  token: QrToken | null;
};

/** Refusals carry the reason, because the screen has to be able to say why. */
export type Refusal = { ok: false; reason: string };
export type Issued = { ok: true; token: QrToken };
export type Paid = { ok: true; transaction: Transaction };

/**
 * The starting ledger: one credit from the employer and two spends already
 * made, which is why the balance opens at 32,50 € — the figure the card has
 * always shown.
 */
function seed(): Ledger {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  return {
    transactions: [
      {
        id: "seed-credit",
        at: new Date(now - 21 * day).toISOString(),
        kind: "credit",
        amountCents: 5000,
        label: "Crédit employeur — Ministère",
      },
      {
        id: "seed-debit-1",
        at: new Date(now - 9 * day).toISOString(),
        kind: "debit",
        amountCents: 1250,
        label: "Chapelier Fontaine",
        partnerId: "chapelier-fontaine",
      },
      {
        id: "seed-debit-2",
        at: new Date(now - 3 * day).toISOString(),
        kind: "debit",
        amountCents: 500,
        label: "Crêperie d'Armor",
        partnerId: "creperie-armor",
      },
    ],
    token: null,
  };
}

let state: Ledger = seed();
let loaded = false;
const listeners = new Set<() => void>();

function read(): Ledger {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const stored = JSON.parse(raw) as Ledger;
    if (!Array.isArray(stored.transactions)) return seed();
    return { transactions: stored.transactions, token: stored.token ?? null };
  } catch {
    // Private windows and blocked site data throw on access.
    return seed();
  }
}

function write(next: Ledger) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Losing the demo ledger on reload beats breaking the page.
  }
  // Everything on screen reads the same snapshot, so one notification per
  // change is what keeps the balance, the history and the card in step.
  for (const listener of listeners) listener();
}

/** Reads the stored ledger once, on the client. Safe to call repeatedly. */
export function loadLedger() {
  if (loaded) return;
  loaded = true;
  state = read();
  for (const listener of listeners) listener();
}

export function subscribeLedger(listener: () => void) {
  listeners.add(listener);
  // Void, not Set.delete's boolean: useSyncExternalStore's contract.
  return () => {
    listeners.delete(listener);
  };
}

/** Stable between changes, which is what useSyncExternalStore requires. */
export function ledgerSnapshot(): Ledger {
  return state;
}

/** Server-rendered snapshot: the seed, never localStorage. */
export function ledgerServerSnapshot(): Ledger {
  return state;
}

/**
 * Credits minus debits. Cannot be negative: every debit that would take it
 * below zero is refused before it is recorded, so the sum is the invariant
 * rather than something to clamp after the fact.
 */
export function balanceCents(ledger: Ledger = state): number {
  return ledger.transactions.reduce(
    (total, entry) =>
      entry.kind === "credit"
        ? total + entry.amountCents
        : total - entry.amountCents,
    0,
  );
}

/** Newest first, which is the only order a history is ever read in. */
export function history(ledger: Ledger = state): readonly Transaction[] {
  return [...ledger.transactions].sort((a, b) => b.at.localeCompare(a.at));
}

export function tokenState(
  token: QrToken | null,
  now: number = Date.now(),
): "none" | "active" | "used" | "expired" {
  if (!token) return "none";
  if (token.usedAt) return "used";
  if (now >= token.expiresAt) return "expired";
  return "active";
}

/** 1234 -> "12,34 €", in the French convention. */
export function formatEuros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/**
 * La validité intrinsèque d'un montant : un nombre entier de centimes,
 * strictement positif. C'est la contrainte que portera un CHECK en base, et
 * elle vaut à l'émission comme au paiement.
 */
function refuseAmount(amountCents: number): string | null {
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
    return "Le montant doit être un nombre d'euros et de centimes.";
  }
  if (amountCents <= 0) {
    return "Le montant doit être strictement supérieur à zéro.";
  }
  return null;
}

/**
 * Le solde, jugé au moment de payer et non à l'émission.
 *
 * Émettre un QR n'est pas débiter : un terminal produit un code, et c'est sa
 * présentation qui est acceptée ou refusée. Séparer les deux permet au QR
 * d'être toujours émis, sans rien céder sur la règle — le solde ne peut pas
 * devenir négatif, et le refus dit pourquoi.
 */
function refuseAgainstBalance(amountCents: number): string | null {
  const available = balanceCents();
  if (amountCents > available) {
    return `Paiement refusé : ${formatEuros(amountCents)} dépasse votre solde de ${formatEuros(amountCents - available)}. Solde disponible : ${formatEuros(available)}.`;
  }
  return null;
}

/** Random enough for a demo token, and carrying nothing about the holder. */
function newId(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Émet un jeton de paiement, en remplaçant celui qui serait encore en cours.
 * Instantané ici ; les deux secondes annoncées sont au serveur de les tenir.
 *
 * Le solde n'est pas consulté : un montant valide donne toujours un QR. Ce
 * qu'il vaut face au solde se décide dans payWithToken.
 */
export function issueToken(
  amountCents: number,
  partnerId?: string,
): Issued | Refusal {
  const reason = refuseAmount(amountCents);
  if (reason) return { ok: false, reason };

  const issuedAt = Date.now();
  const token: QrToken = {
    id: newId(),
    partnerId,
    amountCents,
    issuedAt,
    expiresAt: issuedAt + QR_TTL_MS,
  };
  write({ ...state, token });
  return { ok: true, token };
}

export function cancelToken() {
  if (state.token) write({ ...state, token: null });
}

/**
 * Spends the live token: single use, and only while it is live. The balance is
 * re-checked at this point rather than trusted from issue time, because a
 * token issued five minutes ago may no longer be affordable.
 */
export function payWithToken(
  tokenId: string,
  partner: { id: string; name: string },
): Paid | Refusal {
  const token = state.token;
  const status = tokenState(token);

  if (!token || token.id !== tokenId) {
    return { ok: false, reason: "Ce QR n'est plus celui en cours." };
  }
  if (status === "used") {
    return { ok: false, reason: "Ce QR a déjà servi : il est à usage unique." };
  }
  if (status === "expired") {
    return {
      ok: false,
      reason: "Ce QR a expiré : il est valable cinq minutes.",
    };
  }

  // Les deux contrôles au moment qui compte : le montant lui-même, puis le
  // solde tel qu'il est maintenant — il a pu bouger depuis l'émission.
  const invalid = refuseAmount(token.amountCents);
  if (invalid) return { ok: false, reason: invalid };
  const overBalance = refuseAgainstBalance(token.amountCents);
  if (overBalance) return { ok: false, reason: overBalance };

  const now = Date.now();
  const transaction: Transaction = {
    id: newId(),
    at: new Date(now).toISOString(),
    kind: "debit",
    amountCents: token.amountCents,
    label: partner.name,
    partnerId: partner.id,
  };
  write({
    transactions: [...state.transactions, transaction],
    token: { ...token, usedAt: now },
  });
  return { ok: true, transaction };
}

/** Puts the demonstration back to its starting state. */
export function resetLedger() {
  loaded = true;
  write(seed());
}
