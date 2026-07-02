import { NextResponse } from 'next/server';

// C-123 §2 rule 2: deletion attributes MUST match how the cookies were set
// (none + secure + Partitioned) — an attribute-mismatched clearing cookie
// targets a different cookie jar and silently fails to delete, which breaks
// re-login. This route was previously missing entirely (the client's logout
// fetch 404'd silently and cookies were never cleared server-side).
export async function POST() {
  const res = NextResponse.json({ success: true });

  const gone = {
    maxAge:      0,
    path:        '/',
    secure:      true,
    sameSite:    'none' as const,
    partitioned: true,
  };

  res.cookies.set('tec_access_token', '', gone);
  res.cookies.set('tec_user',         '', gone);
  res.cookies.set('tec_csrf',         '', gone);

  return res;
}
