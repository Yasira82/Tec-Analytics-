import { TEC_COLORS } from '@yasser172/tec-ui';

export default function Loading() {
  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.subtext, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
        <div style={{ fontSize: 13 }}>Loading analytics…</div>
      </div>
    </main>
  );
}
