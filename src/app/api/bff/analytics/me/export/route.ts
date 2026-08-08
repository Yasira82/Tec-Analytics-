import { NextRequest, NextResponse } from 'next/server';
import { resolveProStatus } from '@/lib/bff/analyticsGateway';

// GET /api/bff/analytics/me/export → the caller's OWN activity as a CSV download.
//
// Analytics Pro benefit (C-105 §7): a deeper/longer own-scope history + EXPORT. FREE sees
// a live preview on-screen; Pro can export the full 90-day activity (≤500 rows) as CSV.
// The Pro gate is enforced HERE at the BFF: no live subscription → 403 (fail closed, P6).
// Analytics never STORES subscription truth (P5) — it reads it live from commerce.
//
// C-105 §6: strictly own-scope. Identity is the session token, derived server-side by the
// analytics service (never a query/body param); this route only forwards the Bearer. The
// numbers are the same computed truth — Pro unlocks depth + export, not different data.
const GW = process.env.API_GATEWAY_URL ?? '';

// Pro window (must stay within the backend caps: limit ≤ 500, days ≤ 365).
const PRO_LIMIT = 500;
const PRO_DAYS  = 90;

/** RFC-4180 CSV field: quote when it contains a comma/quote/newline; double inner quotes. */
function csvField(v: unknown): string {
  const s = v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  const header = ['id', 'type', 'created_at', 'payload'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      csvField(r.id),
      csvField(r.type),
      csvField(r.created_at),
      csvField(r.payload ?? ''),
    ].join(','));
  }
  return lines.join('\r\n');
}

export async function GET(req: NextRequest) {
  if (!GW) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const token = req.cookies.get('tec_access_token')?.value ?? '';
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Pro gate — fail closed. Export is a paid feature; a non-Pro (or lapsed) caller is denied.
  const isPro = await resolveProStatus(req);
  if (!isPro) {
    return NextResponse.json({ error: 'Merchant Pro required', code: 'PRO_REQUIRED' }, { status: 403 });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${token}`,
    'x-request-id': crypto.randomUUID(),
  };
  if (process.env.INTERNAL_SECRET) headers['x-internal-key'] = process.env.INTERNAL_SECRET;

  try {
    const res = await fetch(
      `${GW}/api/analytics/me/activity?limit=${PRO_LIMIT}&days=${PRO_DAYS}`,
      { headers, cache: 'no-store' },
    );
    if (!res.ok) {
      // Pass the upstream own-scope failure through (e.g. 401 no user scope).
      return NextResponse.json({ error: 'Could not build export' }, { status: res.status });
    }
    const body = (await res.json().catch(() => ({}))) as { data?: unknown };
    const rows = Array.isArray(body.data) ? (body.data as Record<string, unknown>[]) : [];
    const csv  = toCsv(rows);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tec-analytics-activity-${date}.csv"`,
        'Cache-Control':       'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
