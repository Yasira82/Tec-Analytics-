/**
 * C-123 session compliance — /api/auth/me + logout + sso-callback landing.
 * Locks the Pi Browser cookie laws in CI: 200-only establishment, verified
 * entry, none+secure+Partitioned, deletion attributes matching creation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mockJwtVerify = vi.hoisted(() => vi.fn());
vi.mock('jose', () => ({ jwtVerify: mockJwtVerify }));

function makeReq(opts: { cookies?: Record<string, string>; search?: string } = {}): NextRequest {
  const url = `http://localhost/api/test${opts.search ? `?${opts.search}` : ''}`;
  return {
    cookies: {
      get: (name: string) =>
        opts.cookies?.[name] !== undefined ? { value: opts.cookies[name] } : undefined,
    },
    url,
    nextUrl: { searchParams: new URLSearchParams(opts.search ?? ''), origin: 'http://localhost' },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SSO_SECRET = 'sso-secret-test-32-chars-for-vitest';
});

describe('GET /api/auth/me', () => {
  it('401 without cookies (fail closed, P6)', async () => {
    const { GET } = await import('@/app/api/auth/me/route');
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('200 + user with plain-JSON tec_user', async () => {
    const { GET } = await import('@/app/api/auth/me/route');
    const res = await GET(makeReq({ cookies: {
      tec_access_token: 'tok',
      tec_user: JSON.stringify({ id: 'u1', piUsername: 'alice' }),
    } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.user.id).toBe('u1');
  });

  it('200 + user with URL-encoded tec_user (app convention)', async () => {
    const { GET } = await import('@/app/api/auth/me/route');
    const res = await GET(makeReq({ cookies: {
      tec_access_token: 'tok',
      tec_user: encodeURIComponent(JSON.stringify({ id: 'u2' })),
    } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe('u2');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears session cookies with attributes matching creation (C-123 §2)', async () => {
    const { POST } = await import('@/app/api/auth/logout/route');
    const res = await POST();
    expect(res.status).toBe(200);
    const cleared = res.cookies.getAll();
    const access = cleared.find(c => c.name === 'tec_access_token');
    expect(access).toBeDefined();
    expect(access?.maxAge).toBe(0);
    expect(access?.sameSite).toBe('none');
    expect(access?.secure).toBe(true);
    // partitioned must match creation or the delete targets a different jar
    expect((access as { partitioned?: boolean } | undefined)?.partitioned).toBe(true);
  });
});

describe('GET /api/auth/sso-callback', () => {
  it('returns 200 HTML landing (NOT a redirect) with partitioned cookies + verify script', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        jti:         `jti-${Date.now()}-${Math.random()}`,
        accessToken: 'access-tok',
        user:        { id: 'u1', piUsername: 'alice' },
      },
    });
    const { GET } = await import('@/app/api/auth/sso-callback/route');
    const res = await GET(makeReq({ search: 'token=sso-tok&redirect=/app' }));

    // C-123 LAW 2: cookies ride a plain 200 HTML response, never a 3xx.
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');

    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('tec_access_token');
    expect(setCookie.toLowerCase()).toContain('samesite=none');
    expect(setCookie).toContain('Partitioned');

    // §3 verified entry: the script must gate navigation on /api/auth/me.
    const body = await res.text();
    expect(body).toContain('/api/auth/me');
    expect(body).toContain('"/app"');
    expect(body).toContain('login=failed');
  });
});
