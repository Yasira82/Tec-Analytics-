'use client';

// TEC Analytics — platform intelligence dashboard (C-105 — standalone surface; see §5 / §11a).
// Reads aggregated metrics from tec-analytics-service via /api/bff/analytics/*.
// Platform-level + eventual consistency — never presented as financial truth.
//
// C-122 §5 disclosure boundary (enforced server-side; mirrored here as UX):
//   platform aggregates are SOVEREIGN → admin only. A non-admin sees only the
//   own-scope "Recent events" section; the platform sections are not fetched.
import { useState } from 'react';
import { TEC_COLORS, formatPi, formatDate } from '@yasser172/tec-ui';
import { usePiAuth, getAccessToken } from '@yasser172/tec-auth';
import { ProUpgrade } from './components/ProUpgrade';
import { ProHistory } from './components/ProHistory';
import { MerchantIntelligence } from './components/MerchantIntelligence';

// Read the `role` claim from the access-token JWT (payload only — display gate,
// never a security decision; the analytics service enforces C-122 §5 server-side).
// The token re-reads role from the DB on refresh (auth-service), so this reflects
// a role change within one refresh cycle WITHOUT a full re-login — unlike the
// tec_user cookie, which is only written at login.
const tokenRole = (): string | null => {
  try {
    const t = getAccessToken();
    if (!t) return null;
    const seg = t.split('.')[1];
    if (!seg) return null;
    const json = atob(seg.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json)?.role as string) ?? null;
  } catch {
    return null;
  }
};
import {
  useOverview,
  usePaymentAnalytics,
  useUserAnalytics,
  useRecentEvents,
  useOwnOverview,
  useOwnSales,
  type DailyMetric,
  type AsyncState,
} from '@/lib-client/analytics/useAnalytics';

const sumField = (metrics: DailyMetric[], field: keyof DailyMetric): number =>
  metrics.reduce((s, m) => s + Number(m[field] ?? 0), 0);

const card = {
  background:   TEC_COLORS.surface,
  border:       `1px solid ${TEC_COLORS.border}`,
  borderRadius: 16,
  padding:      '20px 22px',
} as const;

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: TEC_COLORS.subtext, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: TEC_COLORS.gold, marginTop: 6 }}>{value}</div>
    </div>
  );
}

/** Minimal inline bar chart (no chart lib — Pi-Browser safe; tec-ui charts pending C-105 §5). */
function BarChart({ series }: { series: { label: string; value: number }[] }) {
  const max = series.reduce((m, s) => Math.max(m, s.value), 0) || 1;
  if (series.length === 0) {
    return <div style={{ color: TEC_COLORS.subtext, fontSize: 13 }}>No data yet.</div>;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, marginTop: 8 }}>
      {series.map((s, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div
            title={`${s.label}: ${s.value}`}
            style={{
              width: '100%',
              height: `${Math.round((s.value / max) * 110)}px`,
              minHeight: 2,
              background: `linear-gradient(180deg, ${TEC_COLORS.gold}, ${TEC_COLORS.goldDark})`,
              borderRadius: '4px 4px 0 0',
            }}
          />
          <div style={{ fontSize: 9, color: TEC_COLORS.subtext, whiteSpace: 'nowrap' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, state, children }: {
  title: string; state: AsyncState<unknown>; children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: TEC_COLORS.text, margin: 0 }}>{title}</h2>
        {state.loading && <span style={{ fontSize: 12, color: TEC_COLORS.subtext }}>loading…</span>}
        {state.error && (
          <button onClick={state.reload}
            style={{ fontSize: 12, color: TEC_COLORS.error, background: 'none', border: `1px solid ${TEC_COLORS.error}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
            {state.error} · retry
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

// recentMetrics come newest-first; show oldest→newest for a left-to-right timeline.
const toSeries = (metrics: DailyMetric[], field: keyof DailyMetric): { label: string; value: number }[] =>
  [...metrics].reverse().map((m) => ({
    label: typeof m.date === 'string' ? m.date.slice(5, 10) : '',
    value: Number(m[field] ?? 0),
  }));

// Platform aggregates = SOVEREIGN (C-122 §5). This component is mounted ONLY for
// admins, so a non-admin never fires the platform endpoints (no 403 noise) —
// the server remains the authority (it 403s regardless).
function WindowToggle({ days, setDays }: { days: number; setDays: (d: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 22 }}>
      {[7, 30].map((d) => {
        const active = d === days;
        return (
          <button key={d} onClick={() => setDays(d)}
            style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: active ? 700 : 400,
              border: `1px solid ${active ? TEC_COLORS.gold : TEC_COLORS.border}`,
              background: active ? TEC_COLORS.gold : 'none',
              color: active ? '#0a0800' : TEC_COLORS.subtext,
            }}>
            {d}d
          </button>
        );
      })}
    </div>
  );
}

function PlatformSections() {
  const overview = useOverview();
  const payments = usePaymentAnalytics();
  const users    = useUserAnalytics();
  const [days, setDays] = useState(30);
  const o  = overview.data;
  // metrics arrive newest-first; slice to the selected window. Window totals are
  // recomputed from the slice so the headline numbers match the chart (honest).
  const pm = (payments.data?.metrics ?? []).slice(0, days);
  const um = (users.data?.metrics ?? []).slice(0, days);
  return (
    <>
      <Section title="Overview" state={overview}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          <StatCard label="Total events" value={(o?.totalEvents   ?? 0).toLocaleString()} />
          <StatCard label="Payments"     value={(o?.totalPayments ?? 0).toLocaleString()} />
          <StatCard label="Users"        value={(o?.totalUsers    ?? 0).toLocaleString()} />
        </div>
      </Section>

      <WindowToggle days={days} setDays={setDays} />

      <Section title={`Payments (last ${days} days)`} state={payments}>
        <div style={{ ...card }}>
          <div style={{ display: 'flex', gap: 28, marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 11, color: TEC_COLORS.subtext, textTransform: 'uppercase' }}>Volume</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: TEC_COLORS.gold }}>{formatPi(sumField(pm, 'total_volume'))}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEC_COLORS.subtext, textTransform: 'uppercase' }}>Count</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: TEC_COLORS.text }}>{sumField(pm, 'total_payments').toLocaleString()}</div>
            </div>
          </div>
          <BarChart series={toSeries(pm, 'total_volume')} />
        </div>
      </Section>

      <Section title={`Users & KYC (last ${days} days)`} state={users}>
        <div style={{ ...card }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 8 }}>
            <StatCard label="New users"    value={sumField(um, 'new_users').toLocaleString()} />
            <StatCard label="Active (24h)" value={Number(um[0]?.active_users ?? 0).toLocaleString()} />
            <StatCard label="KYC verified" value={sumField(um, 'kyc_verified').toLocaleString()} />
          </div>
          <BarChart series={toSeries(um, 'new_users')} />
        </div>
      </Section>
    </>
  );
}

// C-105 §6 own-scope: a non-admin sees ONLY their own aggregates (fetched from
// /me/overview, scoped server-side by the session identity) — never platform data.
function OwnActivity() {
  const own = useOwnOverview();
  const byType = (own.data?.byType ?? []).map(t => ({ label: t.type.replace(/\..*/, ''), value: t.count }));

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: TEC_COLORS.text, margin: '0 0 12px' }}>Your activity</h2>

      <div style={{ ...card, borderColor: `${TEC_COLORS.gold}55`, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEC_COLORS.gold, marginBottom: 4 }}>Private to you</div>
        <p style={{ fontSize: 12, color: TEC_COLORS.subtext, margin: 0, lineHeight: 1.6 }}>
          These are your own figures only. Ecosystem-wide aggregates are admin-only
          (C-122 §5). Upgrade to Merchant Pro for richer business intelligence as it ships.
        </p>
      </div>

      {own.error ? (
        <div style={{ ...card }}>
          <span style={{ fontSize: 13, color: TEC_COLORS.error }}>Couldn’t load your activity. Please retry.</span>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatCard label="Your events"   value={own.loading ? '…' : String(own.data?.totalEvents   ?? 0)} />
            <StatCard label="Your payments" value={own.loading ? '…' : String(own.data?.totalPayments ?? 0)} />
          </div>
          {byType.length > 0 && (
            <div style={{ ...card, marginTop: 12 }}>
              <div style={{ fontSize: 12, color: TEC_COLORS.subtext, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>By type</div>
              <BarChart series={byType} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

// C-105 §6 slice 2: the caller's own SALES as a seller. Sales truth is OWNED by
// tec-commerce-service (Order owner) and aggregated there — this only presents it.
// The seller is the session identity server-side (never a param); a merchant sees
// ONLY their own sales.
function MySales() {
  const sales = useOwnSales();
  const d = sales.data;
  const topSeries = (d?.topProducts ?? []).map((p) => ({ label: p.title.slice(0, 8), value: Number(p.revenue) }));
  const hasSales = (d?.orderCount ?? 0) > 0;

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: TEC_COLORS.text, margin: '0 0 12px' }}>Your sales</h2>

      {sales.error ? (
        <div style={{ ...card }}>
          <span style={{ fontSize: 13, color: TEC_COLORS.error }}>Couldn’t load your sales. </span>
          <button onClick={sales.reload}
            style={{ fontSize: 12, color: TEC_COLORS.gold, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            retry
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <StatCard label="Revenue"    value={sales.loading ? '…' : formatPi(Number(d?.totalRevenue ?? 0))} />
            <StatCard label="Items sold" value={sales.loading ? '…' : String(d?.totalItemsSold ?? 0)} />
            <StatCard label="Orders"     value={sales.loading ? '…' : String(d?.orderCount ?? 0)} />
          </div>

          {!sales.loading && !hasSales && (
            <div style={{ ...card, marginTop: 12 }}>
              <span style={{ fontSize: 13, color: TEC_COLORS.subtext }}>
                No sales yet. When buyers purchase your products they’ll appear here.
              </span>
            </div>
          )}

          {topSeries.length > 0 && (
            <div style={{ ...card, marginTop: 12 }}>
              <div style={{ fontSize: 12, color: TEC_COLORS.subtext, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>Top products</div>
              <BarChart series={topSeries} />
            </div>
          )}

          {(d?.recentSales?.length ?? 0) > 0 && (
            <div style={{ ...card, marginTop: 12 }}>
              <div style={{ fontSize: 12, color: TEC_COLORS.subtext, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Recent sales</div>
              {(d?.recentSales ?? []).slice(0, 5).map((s, i) => (
                <div key={`${s.orderId}-${s.productId}-${i}`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i === 0 ? 'none' : `1px solid ${TEC_COLORS.border}` }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: TEC_COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: TEC_COLORS.subtext }}>×{s.quantity} · {formatDate(s.soldAt)}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: TEC_COLORS.gold, whiteSpace: 'nowrap', marginLeft: 12 }}>{formatPi(Number(s.amount))}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function AnalyticsDashboard() {
  const { user, isLoading, logout } = usePiAuth();
  // Prefer the fresh access-token role (refreshes ~hourly) over the login-time
  // tec_user cookie, so an admin grant shows up without a full re-login.
  const isAdmin = user?.role === 'admin' || tokenRole() === 'admin';
  const events  = useRecentEvents(15);

  // C-123 LAW 1: in Pi Browser, cookie deletion via an XHR Set-Cookie response
  // is unreliable — the package logout() alone left the session cookies in place
  // and never navigated, so the button looked dead and re-login never happened.
  // Fix: fire the server clear (best effort) AND clear the readable cookies
  // client-side, then hard-navigate to the login page so a FRESH session (with
  // the current DB role) is minted on next login.
  const handleLogout = async () => {
    try { await logout(); } catch { /* best effort */ }
    try {
      ['tec_access_token', 'tec_user', 'tec_csrf'].forEach((n) => {
        document.cookie = `${n}=; path=/; max-age=0; secure; samesite=none`;
        document.cookie = `${n}=; path=/; max-age=0`;
      });
    } catch { /* ignore */ }
    window.location.href = '/';
  };

  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text, padding: '32px 22px', fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 30 }}>📊</span>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: TEC_COLORS.gold, margin: 0 }}>TEC Analytics</h1>
              <p style={{ fontSize: 12, color: TEC_COLORS.subtext, margin: '2px 0 0' }}>
                {isAdmin ? 'Platform intelligence · eventual consistency' : 'Your activity'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user && (
              <span style={{ fontSize: 12, color: TEC_COLORS.subtext }}>
                @{user.piUsername}{isAdmin ? ' · admin' : ''}
              </span>
            )}
            <button
              onClick={() => { void handleLogout(); }}
              style={{ fontSize: 12, color: TEC_COLORS.text, background: 'none', border: `1px solid ${TEC_COLORS.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </header>

        {/* Merchant Pro — monetization surface (C-105 §7) + real U2A payment */}
        <ProUpgrade />

        {/* Platform aggregates: admin only (C-122 §5) */}
        {isLoading
          ? <p style={{ marginTop: 28, fontSize: 13, color: TEC_COLORS.subtext }}>Loading…</p>
          : isAdmin ? <PlatformSections /> : <><MerchantIntelligence /><OwnActivity /><MySales /></>}

        {/* Analytics Pro — deeper/longer own-scope history + CSV export (C-105 §7) */}
        <ProHistory />

        {/* Recent events — own-scope (§5.1), available to every authenticated user */}
        <Section title="Recent events" state={events}>
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            {(events.data ?? []).length === 0 && !events.loading ? (
              <div style={{ padding: 18, color: TEC_COLORS.subtext, fontSize: 13 }}>No recent events.</div>
            ) : (
              (events.data ?? []).map((ev, i) => (
                <div key={ev.id ?? i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: i === 0 ? 'none' : `1px solid ${TEC_COLORS.border}` }}>
                  <span style={{ fontSize: 13, color: TEC_COLORS.text, fontWeight: 600 }}>{ev.type}</span>
                  <span style={{ fontSize: 11, color: TEC_COLORS.subtext }}>{ev.created_at ? formatDate(ev.created_at) : ''}</span>
                </div>
              ))
            )}
          </div>
        </Section>

        <p style={{ marginTop: 32, fontSize: 11, color: TEC_COLORS.subtext }}>
          Source of truth for transactions is tec-payment-service; figures here are aggregates and may lag.
        </p>
      </div>
    </main>
  );
}
