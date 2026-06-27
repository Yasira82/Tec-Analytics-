import { NextRequest } from 'next/server';
import { forwardAnalyticsGet } from '@/lib/bff/analyticsGateway';

// GET /api/bff/analytics/payments → daily metrics[30] + totalVolume + totalCount
export async function GET(req: NextRequest) {
  return forwardAnalyticsGet(req, '/api/analytics/payments');
}
