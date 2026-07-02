import { NextRequest, NextResponse } from 'next/server';

// Server-side session resolver (C-123 §3). The client must never decide
// "am I logged in?" by reading document.cookie alone — Pi Browser can store a
// cookie the server sees while hiding it from client JS. The server can always
// read the request cookies. Fail closed: no/invalid session → 401 (P6).
export async function GET(req: NextRequest) {
  const token   = req.cookies.get('tec_access_token')?.value;
  const userRaw = req.cookies.get('tec_user')?.value;

  if (!token || token.trim() === '' || !userRaw) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  try {
    // This app stores tec_user as encodeURIComponent(JSON) (see sso-callback),
    // and the cookie layer may decode one level — accept both shapes.
    let user: unknown;
    try {
      user = JSON.parse(userRaw);
    } catch {
      user = JSON.parse(decodeURIComponent(userRaw));
    }
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
}
