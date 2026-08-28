/**
 * POST /api/auth/logout (RQ-08, DEC-03)
 * V5-GO-LIVE-01: xoá cookie phiên HOST-ONLY, đồng thời xoá cookie domain-scoped cũ
 * (.hrpartner.vn) trong giai đoạn chuyển đổi để không còn cookie cũ sót lại.
 *
 * Phiên stateless JWT: logout = xoá cookie phía client (TASK §4.3). KHÔNG log token.
 */
import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/src/shared/auth/user';

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });

  // Host-only deletion (khớp cookie do login mới phát). NextResponse.cookies.set() khoá
  // theo TÊN → dùng headers.append để phát xác định cả bản host-only và bản domain-scoped cũ.
  const isProd = process.env.NODE_ENV === 'production';
  const secure = isProd ? '; Secure' : '';
  res.headers.append(
    'Set-Cookie',
    `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
  );
  if (isProd) {
    // Xoá cookie domain-scoped cũ (.hrpartner.vn) còn sót từ giai đoạn subdomain.
    res.headers.append(
      'Set-Cookie',
      `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure; Domain=.hrpartner.vn`,
    );
  }
  return res;
}
