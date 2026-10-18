/**
 * Đọc auth user từ Next.js Request — mobile contract: `Authorization: Bearer`
 * ƯU TIÊN tuyệt đối; web cookie `hrp_session` dùng khi không có Authorization
 * header (T1A Android contract — TASK DEC-01).
 *
 * HEADER PRESENCE RULE (fail-closed): nếu header `Authorization` CÓ MẶT, token
 * chỉ được lấy từ Bearer — thiếu/rỗng/sai scheme trả null ngay, KHÔNG BAO GIỜ
 * fallback sang cookie (một Bearer giả mạo không được trốn qua cookie web hợp
 * lệ). Không Authorization header ⇒ cookie `hrp_session` (web flow giữ nguyên).
 * Dùng chung cho middleware.ts và API routes (/api/auth/*, /api/me, /api/push,
 * /api/worker/*).
 */
import { NextRequest } from 'next/server';
import { verifyJwt, type AuthClaims } from './jwt';

export const AUTH_COOKIE_NAME = 'hrp_session';

/**
 * Mobile-first token resolution (T1A — TASK DEC-01):
 *  - Authorization header CÓ MẶT ⇒ phải là `Bearer <token>`; ngược lại null (fail-closed).
 *  - Không Authorization header ⇒ cookie `hrp_session` (web cookie flow giữ nguyên).
 *  - Token sai ⇒ getAuthUser trả null ⇒ caller 401 (fail-closed, không pass-through).
 */
export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== null) {
    if (!authHeader.startsWith('Bearer ')) return null;
    const bearer = authHeader.slice('Bearer '.length).trim();
    return bearer || null;
  }
  const fromCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  return fromCookie ?? null;
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
