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
