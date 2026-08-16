/**
 * Middleware rào /bcc (Phase 1 bcc-fence — TASK hrp-phase1-bcc-fence, RQ-01/03/07).
 *
 * Fail-closed (DEC-04): không token / token lỗi → page: redirect /login?callback=...
 * (không render dữ liệu), API/action: 401 JSON. Không sửa bất kỳ file app/bcc/*.
 *
 * Chỉ import jose-safe helper (src/shared/auth/user.ts) — KHÔNG import Prisma
 * (Edge runtime).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/src/shared/auth/user';

export const config = {
  matcher: ['/bcc/:path*'],
};

export async function middleware(req: NextRequest) {
  const user = await getAuthUser(req);
  if (user) {
    return NextResponse.next();
  }

  const { pathname, search } = req.nextUrl;

  // API/action không token → 401 JSON (không redirect để client nhận được lỗi)
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Missing or invalid token' },
      { status: 401 },
    );
  }

  // Page → redirect về /login, giữ đường về ban đầu qua callback
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = `?callback=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(loginUrl);
}
