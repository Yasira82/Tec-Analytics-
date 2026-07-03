'use client';

// Merchant Pro — the Analytics monetization surface (C-105 §7).
// A real Pi User-to-App payment (also satisfies the Pi Portal "Process a
// Transaction" checklist step). ADR-007 dual-mode: Hub navigation → Mode 1
// (Hub modal); standalone in Pi Browser → Mode 2 (direct createU2APayment).
import { useEffect, useState } from 'react';
import { TEC_COLORS } from '@yasser172/tec-ui';
import {
  isHubNavigation,
  redirectToHubPayment,
  createPaymentRecord,
  createU2APayment,
} from '@/lib/pi-payment';

const PRICE     = 10;                              // π / month (Pro entry tier)
const ITEM_ID   = 'merchant_pro_monthly';
const MEMO      = 'TEC Analytics — Merchant Pro (1 month)';

// Always render a STRING. A gateway/payment error body can be an object
// ({ code, message }); rendering it as a React child throws (minified #31 →
// "Something went wrong"). Coerce everything to text before it hits state.
const asText = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.message === 'string') return o.message;
    if (typeof o.error === 'string')   return o.error;
    try { return JSON.stringify(v); } catch { return 'Payment failed.'; }
  }
  return v == null ? '' : String(v);
};

type Status = 'idle' | 'creating' | 'paying' | 'success' | 'cancelled' | 'error';

export function ProUpgrade() {
  const [piReady, setPiReady] = useState(false);
  const [status,  setStatus]  = useState<Status>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as { __TEC_PI_READY?: boolean }).__TEC_PI_READY) { setPiReady(true); return; }
    const h = () => setPiReady(true);
    window.addEventListener('tec-pi-ready', h, { once: true });
    return () => window.removeEventListener('tec-pi-ready', h);
  }, []);

  // Mode-1 round-trip: the Hub returns to /app?payment_status=success|error|…
  // after handling the payment in its modal. Reflect it, then clean the URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const st = p.get('payment_status');
    if (!st) return;
    if (st === 'success') setStatus('success');
    else if (st === 'error') { setStatus('error'); setMessage('Payment did not complete. Please try again.'); }
    window.history.replaceState({}, '', '/app');
  }, []);

  const handleUpgrade = async () => {
    if (status === 'creating' || status === 'paying') return;

    // ADR-007 (C-76): check Hub navigation FIRST — before any Pi SDK call.
    if (isHubNavigation() || (window as { __TEC_PI_FOREIGN_SESSION?: boolean }).__TEC_PI_FOREIGN_SESSION
        || !(window as { Pi?: unknown }).Pi || !piReady) {
      redirectToHubPayment({ amount: PRICE, itemId: ITEM_ID, memo: MEMO });
      return;
    }

    // Mode 2 — standalone Pi Browser payment.
    setStatus('creating');
    setMessage('');
    try {
      const internalId = await createPaymentRecord(PRICE, ITEM_ID, MEMO);
      if (!internalId) {
        setStatus('error');
        setMessage('Could not start the payment. Please sign in again and retry.');
        return;
      }
      setStatus('paying');
      const result = await createU2APayment(PRICE, MEMO, { item_id: ITEM_ID, plan: 'merchant_pro' }, internalId);
      if (result.success && result.status === 'completed') {
        setStatus('success');
      } else if (result.status === 'cancelled') {
        setStatus('idle');
      } else {
        setStatus('error');
        setMessage(asText(result.message) || 'Payment failed. Please try again.');
      }
    } catch (err) {
      setStatus('error');
      setMessage(asText(err) || 'Payment failed. Please try again.');
    }
  };

  const card: React.CSSProperties = {
    background:   TEC_COLORS.surface,
    border:       `1px solid ${TEC_COLORS.gold}55`,
    borderRadius: 16,
    padding:      20,
    marginTop:    20,
  };

  if (status === 'success') {
    return (
      <div style={{ ...card, borderColor: `${TEC_COLORS.success}66` }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: TEC_COLORS.success }}>✅ Merchant Pro active</div>
        <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 6 }}>
          Payment received. Thanks for supporting TEC Analytics.
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: TEC_COLORS.gold }}>Merchant Pro</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: TEC_COLORS.text }}>
          {PRICE}π<span style={{ fontSize: 12, color: TEC_COLORS.subtext, fontWeight: 600 }}> / month</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 8, lineHeight: 1.5 }}>
        Priority access to your business intelligence as it ships — private
        per-merchant dashboards, longer history, and exports. Early price, locked in.
      </div>

      <button
        onClick={() => { void handleUpgrade(); }}
        disabled={status === 'creating' || status === 'paying'}
        style={{
          marginTop: 14, width: '100%', padding: '12px 16px', borderRadius: 12,
          background: status === 'creating' || status === 'paying' ? '#333' : `linear-gradient(135deg, ${TEC_COLORS.gold}, ${TEC_COLORS.goldDark})`,
          color: status === 'creating' || status === 'paying' ? '#888' : '#0a0800',
          border: 'none', fontSize: 14, fontWeight: 800,
          cursor: status === 'creating' || status === 'paying' ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'creating' ? 'Preparing…'
          : status === 'paying' ? 'Confirm in Pi…'
          : `Upgrade — ${PRICE}π / month`}
      </button>

      {status === 'error' && (
        <div style={{ fontSize: 12, color: TEC_COLORS.error, marginTop: 10 }}>{message}</div>
      )}
    </div>
  );
}
