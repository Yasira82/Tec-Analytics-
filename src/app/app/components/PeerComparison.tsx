'use client';

// TEC Analytics — Peer comparison (C-122 §5.2). "How am I doing vs other active Pi
// merchants?" — the caller's OWN metric next to a de-identified cohort baseline (mean +
// median + percentile). Fully privacy-safe: the backend computes only from the DISTRIBUTION
// of per-merchant counts, never returns another merchant's data, and SUPPRESSES the whole
// comparison when the cohort is too small (k-anonymity). Counts, never π volume (C-105).
// Charts are inline + Pi-Browser safe.
import { useEffect, useState } from 'react';
import { TEC_COLORS } from '@yasser172/tec-ui';

type Comparison =
  | { available: false; reason?: string; cohortFloor?: number; cohortSize?: number; segment?: string; ownSegment?: string | null }
  | {
      available: true; metric: string; windowDays: number; cohortSize: number;
      segment: string; ownSegment: string | null;
      own: number; cohortMean: number; cohortMedian: number; percentile: number;
    };

const gold = TEC_COLORS.gold;
const sub  = TEC_COLORS.subtext;
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function PeerComparison() {
  const [cmp, setCmp]         = useState<Comparison | null>(null);
  const [status, setStatus]   = useState<'loading' | 'ready' | 'error'>('loading');
  const [segment, setSegment] = useState<'all' | string>('all');

  useEffect(() => {
    let alive = true;
    const q = segment === 'all' ? '' : `?segment=${encodeURIComponent(segment)}`;
    fetch(`/api/bff/analytics/me/comparison${q}`, { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: Comparison } | null) => {
        if (!alive) return;
        if (!j || !j.data) { setStatus('error'); return; }
        setCmp(j.data); setStatus('ready');
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [segment]);

  if (status === 'loading' || status === 'error' || !cmp) return null;   // quiet if unavailable

  // The caller's own segment (dominant app source) enables a "my segment" toggle.
  const ownSegment = cmp.ownSegment ?? null;

  return (
    <div style={{ ...card, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEC_COLORS.text }}>
          You vs other Pi merchants <span style={{ color: sub, fontWeight: 400 }}>· last 30 days</span>
        </div>
        {ownSegment && (
          <div style={{ display: 'flex', gap: 6 }}>
            <Toggle active={segment === 'all'} onClick={() => setSegment('all')}>All</Toggle>
            <Toggle active={segment === ownSegment} onClick={() => setSegment(ownSegment)}>{label(ownSegment)}</Toggle>
          </div>
        )}
      </div>

      {!cmp.available ? (
        <p style={{ fontSize: 12, color: sub, margin: '10px 0 0', lineHeight: 1.6 }}>
          Not enough active merchants{segment !== 'all' ? ` on ${label(segment)}` : ''} to compare privately yet
          {cmp.cohortFloor ? ` (need ${cmp.cohortFloor}+)` : ''}. As the Pi economy grows, you’ll
          see how your activity stacks up — always de-identified, never any individual merchant.
        </p>
      ) : (
        <>
          {/* Percentile headline */}
          <div style={{ marginTop: 10, fontSize: 14, color: TEC_COLORS.text }}>
            {cmp.own >= cmp.cohortMean
              ? <>You’re in the <strong style={{ color: gold }}>top {Math.max(1, 100 - cmp.percentile)}%</strong> of active merchants.</>
              : <>You’re <strong style={{ color: gold }}>ahead of {cmp.percentile}%</strong> of active merchants.</>}
          </div>

          {/* You vs cohort average bars */}
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <CmpBar label="You" value={cmp.own} max={Math.max(cmp.own, cmp.cohortMean, cmp.cohortMedian, 1)} strong />
            <CmpBar label="Cohort avg" value={cmp.cohortMean} max={Math.max(cmp.own, cmp.cohortMean, cmp.cohortMedian, 1)} />
            <CmpBar label="Cohort median" value={cmp.cohortMedian} max={Math.max(cmp.own, cmp.cohortMean, cmp.cohortMedian, 1)} />
          </div>

          <p style={{ fontSize: 10.5, color: sub, margin: '12px 0 0', lineHeight: 1.5 }}>
            Transactions per merchant across {cmp.cohortSize.toLocaleString()} active merchants
            {cmp.segment !== 'all' ? ` on ${label(cmp.segment)}` : ''} · de-identified · counts, not value.
          </p>
        </>
      )}
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: active ? gold : 'transparent',
      color: active ? '#0a0800' : sub,
      border: `1px solid ${active ? gold : `${gold}44`}`,
      borderRadius: 999, padding: '3px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
    }}>
      {children}
    </button>
  );
}

function CmpBar({ label, value, max, strong }: { label: string; value: number; max: number; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: strong ? TEC_COLORS.text : sub, width: 110, fontWeight: strong ? 700 : 400 }}>{label}</span>
      <div style={{ flex: 1, height: 10, background: `${gold}18`, borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: strong ? gold : `${gold}66`, borderRadius: 5 }} />
      </div>
      <span style={{ fontSize: 12, color: TEC_COLORS.text, width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</span>
    </div>
  );
}

const card: React.CSSProperties = { background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.border}`, borderRadius: 12, padding: 16 };
