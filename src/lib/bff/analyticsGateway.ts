import { NextRequest, NextResponse } from 'next/server';

// Server-only proxy to tec-analytics-service through the API Gateway.
//   gateway path:  ${GW}/api/analytics/*  → service /analytics/*  (service-registry pathRewrite)
//   auth:          the user's Bearer token (cookie) + x-internal-key — the analytics
//                  service accepts EITHER (AnalyticsController.authorize). Fail closed:
//                  no session token → 401.
// Analytics is platform-level + eventual-consistency (C-47 §6) — never financial truth.
const GW = process.env.API_GATEWAY_URL ?? '';

/**
 * Forward an authenticated GET to ANY gateway path, passing the response through.
 * Bearer (session cookie) + x-internal-key. Fail closed: no session token → 401.
 * Used for both analytics (`/api/analytics/*`) and cross-service reads the Analytics
 * app presents but does not own — e.g. seller sales truth from commerce (C-105 §6).
 */
export async function forwardGatewayGet(
  req: NextRequest,
  gatewayPath: string,
): Promise<NextResponse> {
  if (!GW) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const token = req.cookies.get('tec_access_token')?.value ?? '';
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${token}`,
    'x-request-id': crypto.randomUUID(),
  };
  if (process.env.INTERNAL_SECRET) headers['x-internal-key'] = process.env.INTERNAL_SECRET;

  try {
    const res  = await fetch(`${GW}${gatewayPath}`, { headers, cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) console.error('[bff/gateway] error:', res.status, gatewayPath);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[bff/gateway] network error:', (err as Error).message, gatewayPath);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

/** Back-compat alias — analytics-service reads go through the same authed forwarder. */
export const forwardAnalyticsGet = forwardGatewayGet;

/**
 * The caller's LIVE Merchant-Pro entitlement (C-105 §7). Read from commerce (the
 * Subscription owner, C-47) with the session JWT — Analytics never STORES billing
 * truth (P5); it only reflects it to gate a Pro feature. Pro only while the period is
 * live (active + not expired + a real paid plan). Any failure → false (fail closed, P6).
 */
export async function resolveProStatus(req: NextRequest): Promise<boolean> {
  if (!GW) return false;
  const token = req.cookies.get('tec_access_token')?.value ?? '';
  if (!token) return false;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${token}`,
    'x-request-id': crypto.randomUUID(),
  };
  if (process.env.INTERNAL_SECRET) headers['x-internal-key'] = process.env.INTERNAL_SECRET;

  try {
    const res = await fetch(`${GW}/api/commerce/subscriptions/status`, { headers, cache: 'no-store' });
    if (!res.ok) return false;
    const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const s = (d.data ?? d) as Record<string, unknown>;
    const plan = String(s.plan ?? s.tier ?? '').toUpperCase();
    const active  = s.isActive === true || s.active === true || (plan !== '' && plan !== 'FREE');
    const expired = s.isExpired === true;
    const end     = s.current_period_end ?? s.currentPeriodEnd ?? s.expires_at;
    const notExpired = !expired && (!end || new Date(String(end)).getTime() > Date.now());
    return active && notExpired && plan !== '' && plan !== 'FREE';
  } catch {
    return false;
  }
}
