/**
 * Đọc auth user từ Next.js Request — cookie `hrp_token` + `Authorization: Bearer` (DEC-03).
 * Dùng chung cho middleware.ts và API routes (/api/auth/*, /api/me).
 */
import { NextRequest } from 'next/server';
import { verifyJwt, type AuthClaims } from './jwt';

export const AUTH_COOKIE_NAME = 'hrp_session';

/** Lấy raw token từ cookie (ưu tiên) hoặc Bearer header. Không token → null. */
export function getTokenFromRequest(req: NextRequest): string | null {
  const fromCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (fromCookie) return fromCookie;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice('Bearer '.length).trim();
    if (bearer) return bearer;
  }
  return null;
}

/**
 * Trả claims đã verify, hoặc null khi không có token / verify lỗi (RQ-03 fail-closed:
 * lỗi verify = chặn, không pass-through; không crash — caller trả 401).
 */
export async function getAuthUser(req: NextRequest): Promise<AuthClaims | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return await verifyJwt(token);
  } catch {
    return null;
  }
}
