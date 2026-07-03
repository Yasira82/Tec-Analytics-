import { NextRequest } from 'next/server';
import { forwardAnalyticsGet } from '@/lib/bff/analyticsGateway';

// GET /api/bff/analytics/me/overview → the caller's OWN aggregates only
// (C-105 §6). Identity is derived server-side from the session token by the
// analytics service — never a query/body param. Fail closed (401) w/o session.
export async function GET(req: NextRequest) {
  return forwardAnalyticsGet(req, '/api/analytics/me/overview');
}
