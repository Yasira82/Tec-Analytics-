// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const GW = 'https://api.example.com';

const makeReq = (opts: { cookies?: Record<string, string>; url?: string }) => {
  const cookieStr = opts.cookies
    ? Object.entries(opts.cookies).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ')
    : '';
  const headers: Record<string, string> = {};
  if (cookieStr) headers['Cookie'] = cookieStr;
  return new NextRequest(opts.url ?? 'http://localhost/api/bff/analytics/overview', {
    method: 'GET',
    headers,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.API_GATEWAY_URL = GW;
  delete process.env.INTERNAL_SECRET;
});

describe('GET /api/bff/analytics/overview', () => {
  it('returns 401 when access token missing (fail closed)', async () => {
    const { GET } = await import('@/app/api/bff/analytics/overview/route');
    const res = await GET(makeReq({}));
    expect(res.status).toBe(401);
  });

  it('returns 503 when gateway not configured', async () => {
    process.env.API_GATEWAY_URL = '';
    const { GET } = await import('@/app/api/bff/analytics/overview/route');
    const res = await GET(makeReq({ cookies: { tec_access_token: 'tok' } }));
    expect(res.status).toBe(503);
  });

  it('forwards to gateway analytics path with Bearer token + x-internal-key', async () => {
    process.env.INTERNAL_SECRET = 'secret';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({ success: true, data: { totalEvents: 3 } }),
    } as Response);

    const { GET } = await import('@/app/api/bff/analytics/overview/route');
    const res = await GET(makeReq({ cookies: { tec_access_token: 'tok' } }));
    expect(res.status).toBe(200);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${GW}/api/analytics/overview`);
    const h = init.headers as Record<string, string>;
    expect(h['Authorization']).toBe('Bearer tok');
    expect(h['x-internal-key']).toBe('secret');
    fetchSpy.mockRestore();
  });

  it('passes the gateway status through on error', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false, status: 502, json: async () => ({ error: 'bad gateway' }),
    } as Response);
    const { GET } = await import('@/app/api/bff/analytics/overview/route');
    const res = await GET(makeReq({ cookies: { tec_access_token: 'tok' } }));
    expect(res.status).toBe(502);
    fetchSpy.mockRestore();
  });
});

describe('GET /api/bff/analytics/events', () => {
  it('clamps the limit and forwards it to the gateway', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({ success: true, data: [] }),
    } as Response);

    const { GET } = await import('@/app/api/bff/analytics/events/route');
    const res = await GET(makeReq({
      cookies: { tec_access_token: 'tok' },
      url: 'http://localhost/api/bff/analytics/events?limit=9999',
    }));
    expect(res.status).toBe(200);

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe(`${GW}/api/analytics/events?limit=100`);   // clamped to max 100
    fetchSpy.mockRestore();
  });

  it('defaults to limit=20 when not provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({ success: true, data: [] }),
    } as Response);
    const { GET } = await import('@/app/api/bff/analytics/events/route');
    await GET(makeReq({
      cookies: { tec_access_token: 'tok' },
      url: 'http://localhost/api/bff/analytics/events',
    }));
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe(`${GW}/api/analytics/events?limit=20`);
    fetchSpy.mockRestore();
  });
});

// Analytics Pro — CSV export of the caller's OWN activity (C-105 §7). The Pro gate is
// enforced HERE at the BFF (fail closed → 403 without a live subscription); Analytics
// never stores billing (P5). Own-scope only; the numbers are the same computed truth.
describe('GET /api/bff/analytics/me/export (Pro-only CSV)', () => {
  const subResp = (plan: string) => ({
    ok: true, status: 200,
    json: async () => ({ data: { plan, isActive: true, isExpired: false } }),
  } as Response);

  it('returns 401 without a token (fail closed)', async () => {
    const { GET } = await import('@/app/api/bff/analytics/me/export/route');
    const res = await GET(makeReq({ url: 'http://localhost/api/bff/analytics/me/export' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Pro (FREE) caller — export is a paid feature', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(subResp('FREE'));
    const { GET } = await import('@/app/api/bff/analytics/me/export/route');
    const res = await GET(makeReq({ cookies: { tec_access_token: 'tok' }, url: 'http://localhost/api/bff/analytics/me/export' }));
    expect(res.status).toBe(403);
    // it never reached the activity endpoint — only the subscription check ran
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('Pro caller → CSV of the 90-day/500-row own activity (correct upstream + escaping)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(subResp('PRO'))                     // 1) subscription = Pro
      .mockResolvedValueOnce({                                   // 2) me/activity data
        ok: true, status: 200,
        json: async () => ({ data: [
          { id: 'e1', type: 'payment.completed', created_at: '2026-08-01T10:00:00Z', payload: { amount: 5 } },
          { id: 'e2', type: 'note', created_at: '2026-08-02T10:00:00Z', payload: 'has, comma "q"' },
        ] }),
      } as Response);

    const { GET } = await import('@/app/api/bff/analytics/me/export/route');
    const res = await GET(makeReq({ cookies: { tec_access_token: 'tok' }, url: 'http://localhost/api/bff/analytics/me/export' }));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('attachment');

    // hit the Pro window on the own-scope endpoint
    const activityUrl = (fetchSpy.mock.calls[1] as [string])[0];
    expect(activityUrl).toBe(`${GW}/api/analytics/me/activity?limit=500&days=90`);

    const csv = await res.text();
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('id,type,created_at,payload');
    expect(lines[1]).toContain('e1,payment.completed');
    // the comma/quote payload is RFC-4180 quoted with doubled inner quotes
    expect(lines[2]).toContain('"has, comma ""q"""');
    fetchSpy.mockRestore();
  });

  it('passes an upstream own-scope failure through (e.g. 401 no user scope)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(subResp('PRO'))
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) } as Response);
    const { GET } = await import('@/app/api/bff/analytics/me/export/route');
    const res = await GET(makeReq({ cookies: { tec_access_token: 'tok' }, url: 'http://localhost/api/bff/analytics/me/export' }));
    expect(res.status).toBe(401);
    fetchSpy.mockRestore();
  });
});

// Merchant Intelligence (C-105 §6) — own-scope derived insight for every merchant. FREE
// gets a 14-day window; Pro widens it to 90 (chosen server-side from the live subscription).
describe('GET /api/bff/analytics/me/intelligence', () => {
  const subResp = (plan: string) => ({
    ok: true, status: 200,
    json: async () => ({ data: { plan, isActive: true, isExpired: false } }),
  } as Response);

  it('returns 401 without a token (fail closed)', async () => {
    const { GET } = await import('@/app/api/bff/analytics/me/intelligence/route');
    const res = await GET(makeReq({ url: 'http://localhost/api/bff/analytics/me/intelligence' }));
    expect(res.status).toBe(401);
  });

  it('FREE caller → 14-day window; response carries isPro:false', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(subResp('FREE'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { windowDays: 14, totalEvents: 3 } }) } as Response);
    const { GET } = await import('@/app/api/bff/analytics/me/intelligence/route');
    const res = await GET(makeReq({ cookies: { tec_access_token: 'tok' }, url: 'http://localhost/api/bff/analytics/me/intelligence' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.isPro).toBe(false);
    const intelUrl = (fetchSpy.mock.calls[1] as [string])[0];
    expect(intelUrl).toBe(`${GW}/api/analytics/me/intelligence?days=14`);
    fetchSpy.mockRestore();
  });

  it('Pro caller → 90-day window; response carries isPro:true', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(subResp('PRO'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { windowDays: 90 } }) } as Response);
    const { GET } = await import('@/app/api/bff/analytics/me/intelligence/route');
    const res = await GET(makeReq({ cookies: { tec_access_token: 'tok' }, url: 'http://localhost/api/bff/analytics/me/intelligence' }));
    const json = await res.json();
    expect(json.isPro).toBe(true);
    const intelUrl = (fetchSpy.mock.calls[1] as [string])[0];
    expect(intelUrl).toBe(`${GW}/api/analytics/me/intelligence?days=90`);
    fetchSpy.mockRestore();
  });
});
