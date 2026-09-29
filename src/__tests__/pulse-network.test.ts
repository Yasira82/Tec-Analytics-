import { describe, it, expect } from 'vitest';
import { describeNetwork } from '@/lib/pulse/network';

// The public Pulse's Pi Network section (2026-09-29). The service reads Pi's Horizon;
// this pins what the page SAYS — above all that "unavailable" is never shown as zeros.

const NOW = Date.parse('2026-09-29T17:41:00Z');
const SNAP = {
  available: true as const, readAt: '2026-09-29T17:40:50Z',
  latestLedger: 28963746, latestClosedAt: '2026-09-29T17:40:48Z',
  windowLedgers: 200, windowStartedAt: '2026-09-29T17:24:00Z',
  transactions: 1234, operations: 5678,
};

describe('describeNetwork', () => {
  it('shows the latest ledger, how recently it closed, and activity across the window', () => {
    expect(describeNetwork(SNAP, NOW)).toEqual({
      available: true,
      ledger: '#28,963,746',
      lastClosed: '12 s ago',
      window: 'last 200 ledgers · ~17 min',
      transactions: '1,234',
      operations: '5,678',
      readAt: '2026-09-29T17:40:50Z',
    });
  });

  it('unavailable, missing, or malformed → a sentence, never zeros', () => {
    for (const n of [null, undefined, { available: false as const, reason: 'unreachable' },
      { ...SNAP, latestClosedAt: 'garbage' }]) {
      const v = describeNetwork(n as never, NOW);
      expect(v.available).toBe(false);
      expect(v.message).toMatch(/unavailable/);
      expect(v).not.toHaveProperty('transactions');
    }
  });

  it('older data says so in minutes and hours', () => {
    expect(describeNetwork({ ...SNAP, latestClosedAt: '2026-09-29T17:30:00Z' }, NOW).lastClosed).toBe('11 min ago');
    expect(describeNetwork({ ...SNAP, latestClosedAt: '2026-09-29T15:30:00Z' }, NOW).lastClosed).toBe('2 h ago');
  });
});

import { describeSupply, billions } from '@/lib/pulse/network';

describe("describeSupply — Pi's own figures", () => {
  const PI = {
    available: true as const, readAt: '2026-09-29T16:01:20Z',
    circulatingSupply: 11243022455.380999, migratedMiningRewards: 11243022455.380999,
    totalLocked: 6123212503.437099, totalSupply: 17296957623.663074,
    updatedAt: '2026-09-29T15:01:44.613Z',
  };

  it('billions with two decimals — readable on a phone', () => {
    expect(billions(11243022455.380999)).toBe('11.24 B π');
    expect(describeSupply(PI)).toEqual({
      available: true, circulating: '11.24 B π', locked: '6.12 B π', total: '17.30 B π',
      updatedAt: '2026-09-29T15:01:44.613Z',
    });
  });

  it('unavailable or malformed → a sentence, never zeros', () => {
    for (const s of [null, undefined, { available: false as const }, { ...PI, totalLocked: -1 }, { ...PI, updatedAt: 'x' }]) {
      const v = describeSupply(s as never);
      expect(v.available).toBe(false);
      expect(v.message).toMatch(/unavailable/);
      expect(v).not.toHaveProperty('circulating');
    }
  });
});
