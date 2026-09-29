'use client';

// Overview: the Pi Network card (public data — no session needed, same BFF as /pulse)
// and the way to the full public Pulse. Silent when the Pulse cannot be read at all: the
// card itself already says "unavailable" per part when the service answers.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { PiNetworkCard } from '@/components/pulse/PiNetworkCard';
import type { PiNetwork, PiSupply } from '@/lib/pulse/network';

export function PiNetworkPanel() {
  const [data, setData] = useState<{ network?: PiNetwork; supply?: PiSupply } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/bff/analytics/pulse', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: { network?: PiNetwork; supply?: PiSupply } } | null) => {
        if (alive) setData(j?.data ?? {});
      })
      .catch(() => { if (alive) setData({}); });
    return () => { alive = false; };
  }, []);

  if (!data) return null;
  return (
    <section style={{ marginTop: 20 }}>
      <PiNetworkCard network={data.network} supply={data.supply} />
      <div style={{ textAlign: 'right', marginTop: 8 }}>
        <Link href="/pulse" style={{ fontSize: 12, color: TEC_COLORS.gold, textDecoration: 'none' }}>
          Open the public Pi Economy Pulse →
        </Link>
      </div>
    </section>
  );
}
