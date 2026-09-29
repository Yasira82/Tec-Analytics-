'use client';

// The Pi Network card — shared by the public Pulse (/pulse) and the Overview in /app.
// Data comes from /api/bff/analytics/pulse (network = Pi's Horizon, supply = Pi's own
// Mainnet figures); the wording lives in lib/pulse/network.ts. Unavailable is said as
// unavailable — never shown as zeros. Activity and Pi's reported figures, never a price.
import { TEC_COLORS } from '@yasser172/tec-ui';
import { describeNetwork, describeSupply, type PiNetwork, type PiSupply } from '@/lib/pulse/network';

const sub = TEC_COLORS.subtext;
const card: React.CSSProperties = { background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.border}`, borderRadius: 12, padding: 16 };
const statLabel: React.CSSProperties = { fontSize: 11, color: TEC_COLORS.subtext, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={card}>
      <div style={statLabel}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {hint && <div style={{ fontSize: 10.5, color: sub, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 };

export function PiNetworkCard({ network, supply, style }: { network?: PiNetwork; supply?: PiSupply; style?: React.CSSProperties }) {
  const v  = describeNetwork(network, Date.now());
  const sv = describeSupply(supply);
  return (
    <div style={{ ...card, ...style }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>
        Pi Network <span style={{ color: sub, fontWeight: 400 }}>· live from the Pi blockchain</span>
      </div>
      {!v.available ? (
        <div style={{ fontSize: 12.5, color: sub, marginTop: 10 }}>{v.message}</div>
      ) : (
        <div style={{ ...grid, marginTop: 12 }}>
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
        <div style={{ ...grid, marginTop: 10 }}>
          <Stat label="Circulating" value={sv.circulating!} />
          <Stat label="Locked" value={sv.locked!} />
          <Stat label="Total supply" value={sv.total!} hint={`Pi, updated ${new Date(sv.updatedAt!).toLocaleString()}`} />
        </div>
      )}
      <div style={{ fontSize: 10.5, color: sub, marginTop: 10 }}>
        Network activity from Pi&apos;s public Horizon API; supply as Pi reports it
        {v.readAt ? `, read ${new Date(v.readAt).toLocaleTimeString()}` : ''}. Not a price and not investment information.
      </div>
    </div>
  );
}
