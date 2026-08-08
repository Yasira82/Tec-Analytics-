'use client';

// TEC Analytics — Merchant Intelligence (C-105 §6). Analytics' core value for any Pi
// merchant: derived insight from YOUR OWN activity — when you're busiest (peak hour),
// the trend (week-over-week), a daily activity sparkline, and your activity mix.
//
// The numbers are the same computed truth (own-scope only, never cross-merchant, never
// financial truth — the owning services own the money). FREE shows a 14-day view; Merchant
// Pro widens it to 90 days (the window is chosen server-side from the live subscription;
// Analytics never stores billing — P5). Charts are inline + Pi-Browser safe (no libraries).
import { useEffect, useState } from 'react';
import { TEC_COLORS } from '@yasser172/tec-ui';

interface Intel {
  windowDays:   number;
  sampled:      boolean;
  totalEvents:  number;
  totalPayments: number;
  peakHour:     number | null;
  peakHours:    number[];
  weekOverWeek: { thisWeek: number; lastWeek: number; changePct: number };
  dailySeries:  { date: string; count: number }[];
  topActivity:  { type: string; count: number }[];
}

const surface = TEC_COLORS.surface;
const border  = TEC_COLORS.border;
const gold     = TEC_COLORS.gold;
const sub      = TEC_COLORS.subtext;

export function MerchantIntelligence() {
  const [intel, setIntel]   = useState<Intel | null>(null);
  const [isPro, setIsPro]   = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    fetch('/api/bff/analytics/me/intelligence', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { isPro?: boolean; data?: Intel } | null) => {
        if (!alive) return;
        if (!j || !j.data) { setStatus('error'); return; }
        setIsPro(Boolean(j.isPro));
        setIntel(j.data);
        setStatus(j.data.totalEvents > 0 ? 'ready' : 'empty');
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, []);

  if (status === 'loading') return null;

  return (
    <section style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: TEC_COLORS.text, margin: 0 }}>🧭 Merchant intelligence</h2>
        <span style={{ fontSize: 11, color: sub }}>
          your own activity · last {intel?.windowDays ?? 14} days{isPro ? '' : ' (Pro: 90)'}
        </span>
        {isPro && <span style={proTag}>PRO</span>}
      </div>

      {status === 'error' && (
        <div style={cardBox}><span style={{ fontSize: 13, color: TEC_COLORS.error }}>Couldn’t load your intelligence. Please retry.</span></div>
      )}

      {status === 'empty' && (
        <div style={cardBox}>
          <div style={{ fontSize: 13, color: TEC_COLORS.text, fontWeight: 600 }}>No activity yet</div>
          <p style={{ fontSize: 12, color: sub, margin: '6px 0 0', lineHeight: 1.5 }}>
            As you transact in Pi, your peak hours, trend, and activity mix appear here — computed from your own activity only.
          </p>
        </div>
      )}

      {status === 'ready' && intel && (
        <>
          {/* Trend + totals row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <TrendCard wow={intel.weekOverWeek} />
            <MiniStat label="Events" value={intel.totalEvents} hint={`last ${intel.windowDays}d`} />
            <MiniStat label="Payments" value={intel.totalPayments} hint={`last ${intel.windowDays}d`} />
            <MiniStat
              label="Peak hour"
              value={intel.peakHour == null ? '—' : `${String(intel.peakHour).padStart(2, '0')}:00`}
              hint="UTC · busiest"
            />
          </div>

          {/* When you're active — hour-of-day histogram */}
          <div style={{ ...cardBox, marginTop: 12 }}>
            <ChartTitle>When you’re active <span style={{ color: sub, fontWeight: 400 }}>· hour of day (UTC)</span></ChartTitle>
            <HourHistogram hours={intel.peakHours} peak={intel.peakHour} />
          </div>

          {/* Daily activity sparkline */}
          <div style={{ ...cardBox, marginTop: 12 }}>
            <ChartTitle>Daily activity <span style={{ color: sub, fontWeight: 400 }}>· last {intel.dailySeries.length} days</span></ChartTitle>
            <DailyBars series={intel.dailySeries} />
          </div>

          {/* Activity mix */}
          {intel.topActivity.length > 0 && (
            <div style={{ ...cardBox, marginTop: 12 }}>
              <ChartTitle>Activity mix</ChartTitle>
              <ActivityMix items={intel.topActivity} total={intel.totalEvents} />
            </div>
          )}

          {!isPro && (
            <div style={{ ...cardBox, marginTop: 12, borderColor: `${gold}44` }}>
              <span style={{ fontSize: 12.5, color: sub }}>
                <strong style={{ color: gold }}>Merchant Pro</strong> widens this to a <strong>90-day</strong> window
                (and unlocks CSV export) — deeper trends, same trusted numbers.
              </span>
            </div>
          )}
          {intel.sampled && (
            <p style={{ fontSize: 11, color: sub, margin: '8px 2px 0' }}>
              Showing the most recent 5,000 events in the window.
            </p>
          )}
        </>
      )}
    </section>
  );
}

// ── Trend card (week-over-week) ────────────────────────────────────────────
function TrendCard({ wow }: { wow: Intel['weekOverWeek'] }) {
  const up = wow.changePct > 0, flat = wow.changePct === 0;
  const color = flat ? TEC_COLORS.subtext : up ? '#22C55E' : '#EF4444';
  const arrow = flat ? '→' : up ? '▲' : '▼';
  return (
    <div style={cardBox}>
      <div style={miniLabel}>This week vs last</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
          {arrow} {Math.abs(wow.changePct)}%
        </span>
      </div>
      <div style={{ fontSize: 11, color: TEC_COLORS.subtext, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
        {wow.thisWeek} vs {wow.lastWeek} events
      </div>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div style={cardBox}>
      <div style={miniLabel}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: TEC_COLORS.text, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {hint && <div style={{ fontSize: 11, color: TEC_COLORS.subtext, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

// ── Hour-of-day histogram (24 bars) ────────────────────────────────────────
function HourHistogram({ hours, peak }: { hours: number[]; peak: number | null }) {
  const max = Math.max(1, ...hours);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 70, marginTop: 10 }}>
        {hours.map((c, h) => (
          <div key={h} title={`${String(h).padStart(2, '0')}:00 — ${c}`} style={{
            flex: 1,
            height: `${Math.max(3, (c / max) * 100)}%`,
            background: h === peak ? gold : `${gold}33`,
            borderRadius: 2,
            minWidth: 3,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: sub, fontVariantNumeric: 'tabular-nums' }}>
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
      </div>
    </div>
  );
}

// ── Daily activity bars ────────────────────────────────────────────────────
function DailyBars({ series }: { series: Intel['dailySeries'] }) {
  const max = Math.max(1, ...series.map((d) => d.count));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 64, marginTop: 10 }}>
        {series.map((d) => (
          <div key={d.date} title={`${d.date} — ${d.count}`} style={{
            flex: 1,
            height: `${Math.max(3, (d.count / max) * 100)}%`,
            background: d.count > 0 ? gold : `${gold}22`,
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

// ── Activity mix (top types) ───────────────────────────────────────────────
function ActivityMix({ items, total }: { items: Intel['topActivity']; total: number }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
      {items.map((it) => (
        <div key={it.type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: TEC_COLORS.text, width: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.type}</span>
          <div style={{ flex: 1, height: 8, background: `${gold}18`, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(it.count / max) * 100}%`, height: '100%', background: gold, borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 11.5, color: sub, width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {total > 0 ? `${Math.round((it.count / total) * 100)}%` : '0%'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── shared inline style tokens ─────────────────────────────────────────────
function ChartTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: TEC_COLORS.text }}>{children}</div>;
}
const cardBox: React.CSSProperties = { background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 16 };
const miniLabel: React.CSSProperties = { fontSize: 11, color: TEC_COLORS.subtext, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 };
const proTag: React.CSSProperties = { fontSize: 10, fontWeight: 800, color: '#0a0800', background: gold, borderRadius: 6, padding: '1px 6px', letterSpacing: 0.4 };
