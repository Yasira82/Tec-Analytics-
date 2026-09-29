// Pi Network numbers on the public Pulse — how the page words them.
//
// The service reads Pi's Horizon (tec-analytics-service pi-network.ts) and sends either
// the numbers or `available: false` with a reason. This file turns that into what the
// page says. Pure, so the wording is pinned by tests.
//
// Two rules carried over from the service:
//   • unavailable is said as unavailable — never shown as zeros;
//   • no supply figure: the numbers are activity (ledgers, transactions), not value.

export type PiNetwork =
  | {
      available:       true;
      readAt:          string;
      latestLedger:    number;
      latestClosedAt:  string;
      windowLedgers:   number;
      windowStartedAt: string;
      transactions:    number;
      operations:      number;
    }
  | { available: false; readAt?: string; reason?: string };

export interface NetworkView {
  available:  boolean;
  message?:   string;           // shown instead of the numbers when unavailable
  ledger?:    string;           // "#28,963,746"
  lastClosed?: string;          // "12 s ago"
  window?:    string;           // "last 200 ledgers · ~17 min"
  transactions?: string;
  operations?:   string;
  readAt?:    string;
}

const ago = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60)   return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60)   return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
};

const span = (ms: number): string => {
  const m = Math.max(1, Math.round(ms / 60_000));
  return m < 60 ? `~${m} min` : `~${Math.round(m / 60)} h`;
};

/** Anything that is not a well-formed available snapshot reads as unavailable. */
export function describeNetwork(n: PiNetwork | null | undefined, now: number): NetworkView {
  if (!n || n.available !== true) {
    return { available: false, message: 'Pi Network data is unavailable right now.' };
  }
  const closed = Date.parse(n.latestClosedAt);
  const start  = Date.parse(n.windowStartedAt);
  if (Number.isNaN(closed) || Number.isNaN(start)) {
    return { available: false, message: 'Pi Network data is unavailable right now.' };
  }
  return {
    available:    true,
    ledger:       `#${n.latestLedger.toLocaleString('en-US')}`,
    lastClosed:   ago(now - closed),
    window:       `last ${n.windowLedgers} ledgers · ${span(closed - start)}`,
    transactions: n.transactions.toLocaleString('en-US'),
    operations:   n.operations.toLocaleString('en-US'),
    readAt:       n.readAt,
  };
}
