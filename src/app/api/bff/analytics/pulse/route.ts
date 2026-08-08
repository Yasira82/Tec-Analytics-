import { NextResponse } from 'next/server';

// GET /api/bff/analytics/pulse → Pi Economy Pulse (C-122 §5.2). A PUBLIC, de-identified
// read of platform activity signals ("is the Pi economy active?") — no session required,
// so the whole Pi community can see it (even logged out). The backend returns aggregate
// counts only (no per-user data; small cohorts suppressed by a k-anonymity floor).
//
// The internal key is added server-side (never exposed) so the gateway → service call is
// authorized; end users need no token. Cached briefly at the edge (it's an aggregate).
const GW = process.env.API_GATEWAY_URL ?? '';

export async function GET() {
  if (!GW) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-id': crypto.randomUUID(),
  };
  if (process.env.INTERNAL_SECRET) headers['x-internal-key'] = process.env.INTERNAL_SECRET;

  try {
    const res  = await fetch(`${GW}/api/analytics/pulse`, { headers, cache: 'no-store' });
    const body = (await res.json().catch(() => ({}))) as { data?: unknown };
    if (!res.ok) return NextResponse.json({ error: 'Could not load the pulse' }, { status: res.status });
    return NextResponse.json({ data: body.data ?? null }, {
      headers: { 'Cache-Control': 'public, max-age=120, s-maxage=120' },
    });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
