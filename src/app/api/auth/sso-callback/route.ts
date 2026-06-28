import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify }                 from 'jose';

// Hub SSO landing: verifies the signed SSO token, then sets the platform
// cookies and redirects into the app.
const ALLOWED_AUDIENCES = [
  'https://tec-analytics-app.vercel.app',
  'https://analytics.tecosystem.app',
];
const DEFAULT_REDIRECT = '/app';

export async function GET(req: NextRequest) {
  const token       = req.nextUrl.searchParams.get('token');
  const rawRedirect = req.nextUrl.searchParams.get('redirect') ?? DEFAULT_REDIRECT;
  // Block open redirect: only same-origin absolute paths (no //host, no scheme).
  const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
    ? rawRedirect : DEFAULT_REDIRECT;

  if (!token) return NextResponse.redirect(new URL(DEFAULT_REDIRECT, req.url));

  const secret = process.env.SSO_SECRET;
  if (!secret) return NextResponse.json({ error: 'sso_not_configured' }, { status: 503 });

  const encoded = new TextEncoder().encode(secret);
  let payload: Record<string, unknown> | null = null;

  for (const audience of ALLOWED_AUDIENCES) {
    try {
      const result = await jwtVerify(decodeURIComponent(token), encoded, {
        algorithms: ['HS256'], issuer: 'tec.pi', audience,
      });
      payload = result.payload as Record<string, unknown>;
      break;
    } catch { /* try next audience */ }
  }

  if (!payload) return NextResponse.redirect(new URL(DEFAULT_REDIRECT, req.url));

  const accessToken = payload.accessToken as string;
  const user        = payload.user as Record<string, unknown>;
  if (!accessToken || !user) return NextResponse.redirect(new URL(DEFAULT_REDIRECT, req.url));

  const res = NextResponse.redirect(new URL(redirect, req.url));

  const cookieDomain =
    process.env.COOKIE_DOMAIN ?? process.env.NEXT_PUBLIC_SSO_DOMAIN ?? undefined;
  const cookieOpts = {
    httpOnly: false, secure: true, sameSite: 'none' as const,
    path: '/', domain: cookieDomain, maxAge: 60 * 60 * 24,
  };

  res.cookies.set('tec_access_token', accessToken,                        cookieOpts);
  res.cookies.set('tec_user',         encodeURIComponent(JSON.stringify(user)), cookieOpts);
  res.cookies.set('tec_csrf',         crypto.randomUUID(),               cookieOpts);

  return res;
}
