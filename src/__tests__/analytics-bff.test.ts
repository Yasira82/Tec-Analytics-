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
