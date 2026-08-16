'use client';

// TEC Analytics — Pro history + export (C-105 §7). The Merchant Pro benefit made real:
// a deeper/longer OWN-SCOPE activity history you can EXPORT as CSV. FREE sees the live
// on-screen preview ("Recent events"); Pro unlocks the full 90-day history download.
//
// The numbers are the same computed truth — Pro unlocks DEPTH + export, never different
// data (C-105). The Pro gate is enforced server-side at the export BFF (403 without a live
// subscription); this panel only reflects the live status (P5 — Analytics never stores billing).
import { useEffect, useState } from 'react';
import { TEC_COLORS } from '@yasser172/tec-ui';

export function ProHistory() {
  const [isPro, setIsPro]   = useState<boolean | null>(null);   // null = still loading
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState('');

  // Reflect the live subscription (same read as ProUpgrade — commerce-owned, C-47).
  // Only flip Pro true/false on a DEFINITIVE subscription response. On a transient
  // failure (network blip / non-200) leave it null → the panel stays hidden rather
  // than telling a paying Pro user "Merchant Pro required" (the intermittent flip).
  useEffect(() => {
    let alive = true;
    fetch('/api/bff/subscription', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Record<string, unknown> | null) => {
        if (!alive || !j) return; // transient — keep null (hidden), never claim non-Pro
        const d = (j?.data ?? j ?? {}) as Record<string, unknown>;
        const s = ((d?.subscription ?? d) ?? {}) as Record<string, unknown>;
        const end  = typeof s.current_period_end === 'string' ? new Date(s.current_period_end) : null;
        const live = s.isActive !== false && !(s.isExpired === true || (end !== null && end.getTime() < Date.now()));
        const plan = String(s.plan ?? '').toUpperCase();
        setIsPro(live && (plan === 'PRO' || plan === 'ENTERPRISE'));
      })
      .catch(() => { /* transient — leave null (hidden); don't flip a Pro user to locked */ });
    return () => { alive = false; };
  }, []);

  async function exportCsv() {
    if (busy) return;
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/bff/analytics/me/export', { credentials: 'include', cache: 'no-store' });
      if (res.status === 403) { setIsPro(false); setMsg('Merchant Pro required to export.'); return; }
      if (!res.ok)            { setMsg('Could not build your export. Please retry.'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `tec-analytics-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setMsg('✅ Exported.');
    } catch {
      setMsg('Network error. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  if (isPro === null) return null;   // avoid a flash before the status resolves

  return (
    <section style={{ marginTop: 24, padding: 18, background: TEC_COLORS.surface, borderRadius: 14, border: `1px solid ${TEC_COLORS.gold}22` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: TEC_COLORS.text }}>📁 Activity history &amp; export</span>
        {isPro && <span style={proTag}>PRO</span>}
      </div>

      {isPro ? (
        <>
          <p style={body}>
            Your full <strong style={{ color: TEC_COLORS.gold }}>90-day</strong> activity history is unlocked.
            Export it as CSV for your own records, spreadsheets, or accounting.
          </p>
          <button onClick={exportCsv} disabled={busy} style={{
            marginTop: 12, background: `linear-gradient(135deg, ${TEC_COLORS.gold}, ${TEC_COLORS.goldDark})`,
            color: '#0a0800', border: 'none', borderRadius: 10, padding: '10px 18px',
            fontWeight: 800, fontSize: 13, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
          }}>
            {busy ? 'Preparing…' : '⬇ Export CSV'}
          </button>
        </>
      ) : (
        <p style={body}>
          <strong style={{ color: TEC_COLORS.gold }}>Merchant Pro</strong> unlocks your full 90-day activity
          history as a <strong>CSV export</strong> — for your own records, spreadsheets, or accounting.
          FREE shows the recent on-screen preview below.
        </p>
      )}
      {msg && <div style={{ marginTop: 10, fontSize: 12.5, color: msg.startsWith('✅') ? TEC_COLORS.gold : TEC_COLORS.error }}>{msg}</div>}
    </section>
  );
}

const body: React.CSSProperties = { fontSize: 13, color: TEC_COLORS.subtext, margin: '8px 0 0', lineHeight: 1.6 };
const proTag: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, color: '#0a0800', background: TEC_COLORS.gold,
  borderRadius: 6, padding: '1px 6px', letterSpacing: 0.4,
};
