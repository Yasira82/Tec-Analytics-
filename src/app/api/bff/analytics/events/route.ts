import { NextRequest } from 'next/server';
import { forwardAnalyticsGet } from '@/lib/bff/analyticsGateway';

// GET /api/bff/analytics/events?limit=N → most recent N analytics events (default 20)
export async function GET(req: NextRequest) {
  const raw   = req.nextUrl.searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(raw ?? '20', 10) || 20, 1), 100);
  return forwardAnalyticsGet(req, `/api/analytics/events?limit=${limit}`);
}
