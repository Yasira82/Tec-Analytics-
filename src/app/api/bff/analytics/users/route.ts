import { NextRequest } from 'next/server';
import { forwardAnalyticsGet } from '@/lib/bff/analyticsGateway';

// GET /api/bff/analytics/users → daily metrics[30]: new/active users + KYC
export async function GET(req: NextRequest) {
  return forwardAnalyticsGet(req, '/api/analytics/users');
}
