import { NextRequest } from 'next/server';
import { forwardAnalyticsGet } from '@/lib/bff/analyticsGateway';

// GET /api/bff/analytics/me/comparison → de-identified peer comparison (C-122 §5.2):
// the caller's OWN metric next to a k-anonymized cohort baseline ("you vs other active Pi
// merchants"). Own-scope: identity is derived server-side from the session token by the
// analytics service (never a query/body param, P6); this route only forwards the Bearer.
// The backend suppresses the whole comparison when the cohort is too small (fail safe) and
// NEVER returns another merchant's data. Fail closed (401) without a session.
export async function GET(req: NextRequest) {
  return forwardAnalyticsGet(req, '/api/analytics/me/comparison');
}
