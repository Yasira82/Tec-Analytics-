import Link from 'next/link';
import { TEC_COLORS } from '@yasser172/tec-ui';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: TEC_COLORS.gold, marginBottom: 6 }}>404 — Not found</div>
        <p style={{ fontSize: 13, color: TEC_COLORS.subtext, marginBottom: 24 }}>This page does not exist in TEC Analytics.</p>
        <Link href="/app" style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${TEC_COLORS.gold}, ${TEC_COLORS.goldDark})`, borderRadius: 12, color: '#0a0800', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
