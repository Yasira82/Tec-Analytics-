import { NextRequest, NextResponse } from 'next/server';
import { resolveProStatus } from '@/lib/bff/analyticsGateway';

// GET /api/bff/analytics/me/intelligence → Merchant Intelligence (C-105 §6): derived
// business insight from the caller's OWN activity (peak hour, week-over-week trend, a
// daily series, and the activity mix). Available to every authenticated merchant — this
// is Analytics' core value, surfaced for any Pi merchant.
//
// FREE gets a 14-day window; Merchant Pro unlocks the 90-day depth (same depth knob as
// the CSV export). The window choice is made HERE from the caller's LIVE subscription —
// Analytics never stores billing (P5). Strict own-scope: only the session Bearer is
// forwarded; identity is derived server-side (never a param, P6). Fail closed (401) w/o session.
const GW = process.env.API_GATEWAY_URL ?? '';

const FREE_DAYS = 14;
const PRO_DAYS  = 90;

export async function GET(req: NextRequest) {
  if (!GW) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const token = req.cookies.get('tec_access_token')?.value ?? '';
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isPro = await resolveProStatus(req);
  const days  = isPro ? PRO_DAYS : FREE_DAYS;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${token}`,
    'x-request-id': crypto.randomUUID(),
  };
  if (process.env.INTERNAL_SECRET) headers['x-internal-key'] = process.env.INTERNAL_SECRET;

  try {
    const res = await fetch(`${GW}/api/analytics/me/intelligence?days=${days}`, { headers, cache: 'no-store' });
    const body = (await res.json().catch(() => ({}))) as { data?: unknown };
    if (!res.ok) return NextResponse.json({ error: 'Could not load intelligence' }, { status: res.status });
    // Reflect the entitlement so the UI can show the Pro badge / upsell (the DATA is the
    // same computed truth — Pro only widens the window, never changes the numbers).
    return NextResponse.json({ isPro, data: body.data ?? null }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
