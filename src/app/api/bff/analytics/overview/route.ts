import { NextRequest } from 'next/server';
import { forwardAnalyticsGet } from '@/lib/bff/analyticsGateway';

// GET /api/bff/analytics/overview → totalEvents, totalPayments, totalUsers, recentMetrics[7]
export async function GET(req: NextRequest) {
  return forwardAnalyticsGet(req, '/api/analytics/overview');
}
