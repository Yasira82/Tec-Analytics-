'use client';

// TEC Analytics — Pi Economy Pulse (C-122 §5.2). A PUBLIC, de-identified board for the
// whole Pi community: "is the Pi economy active?" No login required. It shows AGGREGATE
// activity signals only — total transactions, weekly growth, active merchants, daily
// activity. Deliberately NOT a price/market chart and NOT money-as-truth (C-105): these
// are activity signals, never financial or valuation figures. Charts are inline + Pi-Browser
// safe (no libraries). Small cohorts are suppressed server-side (k-anonymity).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { describeNetwork, describeSupply, type PiNetwork, type PiSupply } from '@/lib/pulse/network';

interface Pulse {
  generatedAt:       string;
  totalTransactions: number;
  transactions7d:    number;
  growthPct:         number;
  activeMerchants:   number | null;
  cohortFloor:       number;
  activityByDay:     { date: string; transactions: number }[];
  network?:          PiNetwork;   // Pi's public Horizon — see lib/pulse/network.ts
  supply?:           PiSupply;    // Pi's own Mainnet supply figures
}

const gold = TEC_COLORS.gold;
const sub  = TEC_COLORS.subtext;

export default function PiEconomyPulse() {
  const [pulse, setPulse]   = useState<Pulse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    fetch('/api/bff/analytics/pulse', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: Pulse } | null) => {
        if (!alive) return;
        if (!j || !j.data) { setStatus('error'); return; }
        setPulse(j.data); setStatus('ready');
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text, padding: '40px 22px', fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 34 }}>💓</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: gold, margin: '6px 0 4px' }}>Pi Economy Pulse</h1>
          <p style={{ fontSize: 13, color: sub, margin: 0, lineHeight: 1.5 }}>
            Live activity across the TEC · Pi economy. Aggregate signals only — <strong>not price or financial data</strong>.
          </p>
        </header>

        {status === 'loading' && <Center>Loading the pulse…</Center>}
        {status === 'error'   && <Center>The pulse is unavailable right now. Please check back soon.</Center>}

        {status === 'ready' && pulse && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <Stat label="Total transactions" value={pulse.totalTransactions.toLocaleString()} />
              <Stat label="Transactions · 7d" value={pulse.transactions7d.toLocaleString()} />
              <TrendStat pct={pulse.growthPct} />
              <Stat
                label="Active merchants · 30d"
                value={pulse.activeMerchants == null ? '—' : pulse.activeMerchants.toLocaleString()}
                hint={pulse.activeMerchants == null ? `hidden below ${pulse.cohortFloor}` : undefined}
              />
            </div>

            <div style={{ ...card, marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Daily activity <span style={{ color: sub, fontWeight: 400 }}>· last {pulse.activityByDay.length} days</span></div>
              <DailyBars series={pulse.activityByDay} />
            </div>

            <NetworkSection network={pulse.network} supply={pulse.supply} />

            <p style={{ fontSize: 11, color: sub, textAlign: 'center', marginTop: 18, lineHeight: 1.6 }}>
              De-identified aggregate signals · updated {new Date(pulse.generatedAt).toLocaleString()}.<br />
              Individual merchants and users are never shown. Activity, not value — this is not investment information.
            </p>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link href="/app" style={{ fontSize: 13, color: gold, textDecoration: 'none', border: `1px solid ${gold}55`, borderRadius: 10, padding: '9px 18px' }}>
            Merchant? See your own analytics →
          </Link>
        </div>
      </div>
    </main>
  );
}

// Pi Network activity, read from Pi's public Horizon API by the service. Activity only:
// no supply, no price. Unavailable is said as unavailable — never shown as zeros.
function NetworkSection({ network, supply }: { network?: PiNetwork; supply?: PiSupply }) {
  const v = describeNetwork(network, Date.now());
  const sv = describeSupply(supply);
  return (
    <div style={{ ...card, marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>
        Pi Network <span style={{ color: sub, fontWeight: 400 }}>· live from the Pi blockchain</span>
      </div>
      {!v.available ? (
        <div style={{ fontSize: 12.5, color: sub, marginTop: 10 }}>{v.message}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 12 }}>
          <Stat label="Latest ledger" value={v.ledger!} hint={`closed ${v.lastClosed}`} />
          <Stat label="Transactions" value={v.transactions!} hint={v.window} />
          <Stat label="Operations" value={v.operations!} hint={v.window} />
        </div>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 16 }}>
        Mainnet supply <span style={{ color: sub, fontWeight: 400 }}>· as reported by Pi</span>
      </div>
      {!sv.available ? (
        <div style={{ fontSize: 12.5, color: sub, marginTop: 8 }}>{sv.message}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 10 }}>
          <Stat label="Circulating" value={sv.circulating!} />
          <Stat label="Locked" value={sv.locked!} />
          <Stat label="Total supply" value={sv.total!} hint={`Pi, updated ${new Date(sv.updatedAt!).toLocaleString()}`} />
        </div>
      )}
      <div style={{ fontSize: 10.5, color: sub, marginTop: 10 }}>
        Read from Pi&apos;s public Horizon API and Pi&apos;s Mainnet supply figures{v.readAt ? ` at ${new Date(v.readAt).toLocaleTimeString()}` : ''}. Network activity — not supply, not price.
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ ...card, textAlign: 'center', color: sub, fontSize: 13 }}>{children}</div>;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={card}>
      <div style={statLabel}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {hint && <div style={{ fontSize: 10.5, color: sub, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function TrendStat({ pct }: { pct: number }) {
  const up = pct > 0, flat = pct === 0;
  const color = flat ? sub : up ? '#22C55E' : '#EF4444';
  const arrow = flat ? '→' : up ? '▲' : '▼';
  return (
    <div style={card}>
      <div style={statLabel}>Week over week</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color, fontVariantNumeric: 'tabular-nums' }}>{arrow} {Math.abs(pct)}%</div>
    </div>
  );
}

function DailyBars({ series }: { series: Pulse['activityByDay'] }) {
  const max = Math.max(1, ...series.map((d) => d.transactions));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72, marginTop: 12 }}>
        {series.map((d) => (
          <div key={d.date} title={`${d.date} — ${d.transactions}`} style={{
            flex: 1,
            height: `${Math.max(3, (d.transactions / max) * 100)}%`,
            background: d.transactions > 0 ? gold : `${gold}22`,
            borderRadius: 2, minWidth: 4,
          }} />
        ))}
      </div>
      {series.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: sub }}>
          <span>{series[0]?.date.slice(5)}</span>
          <span>{series[series.length - 1]?.date.slice(5)}</span>
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.border}`, borderRadius: 12, padding: 16 };
const statLabel: React.CSSProperties = { fontSize: 11, color: TEC_COLORS.subtext, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 };
