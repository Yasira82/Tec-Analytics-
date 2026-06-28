'use client';

// App Router route-error boundary (server/render errors in route segments).
// Complements <ErrorBoundary> (client component errors) wired in layout.tsx.
import { useEffect } from 'react';
import { TEC_COLORS } from '@yasser172/tec-ui';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[route-error]', error); }, [error]);

  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: TEC_COLORS.text, marginBottom: 8 }}>Something went wrong</div>
        <p style={{ fontSize: 13, color: TEC_COLORS.subtext, marginBottom: 24 }}>{error.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={() => reset()}
          style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${TEC_COLORS.gold}, ${TEC_COLORS.goldDark})`, border: 'none', borderRadius: 12, color: '#0a0800', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    </main>
  );
}
