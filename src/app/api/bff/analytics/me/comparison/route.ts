import { NextRequest } from 'next/server';
import { forwardAnalyticsGet } from '@/lib/bff/analyticsGateway';

// GET /api/bff/analytics/me/comparison → de-identified peer comparison (C-122 §5.2):
// the caller's OWN metric next to a k-anonymized cohort baseline ("you vs other active Pi
// merchants"). Own-scope: identity is derived server-side from the session token by the
// analytics service (never a query/body param, P6); this route only forwards the Bearer.
// The backend suppresses the whole comparison when the cohort is too small (fail safe) and
// NEVER returns another merchant's data. Fail closed (401) without a session.
export async function GET(req: NextRequest) {
  // `segment` optionally narrows the cohort to one app source (an owned category
  // dimension). Pass it through; the backend k-anonymizes per segment. Whitelist to a
  // simple slug so nothing odd reaches the JSON-path filter.
  const raw = req.nextUrl.searchParams.get('segment') ?? '';
  const segment = /^[a-z0-9_-]{1,32}$/i.test(raw) ? raw.toLowerCase() : '';
  const path = segment ? `/api/analytics/me/comparison?segment=${encodeURIComponent(segment)}`
                       : '/api/analytics/me/comparison';
  return forwardAnalyticsGet(req, path);
}
