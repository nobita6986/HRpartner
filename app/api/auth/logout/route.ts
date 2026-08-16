/**
 * POST /api/auth/logout (Phase 1 bcc-fence — RQ-08, DEC-03)
 *
 * Xóa cookie hrp_token (maxAge 0) → request sau không còn được xác thực.
 * Phiên stateless JWT: logout = xóa cookie phía client (TASK §4.3).
 */
import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/src/shared/auth/user';

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
