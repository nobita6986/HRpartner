/**
 * POST /api/auth/login (Phase 1 bcc-fence — RQ-02/07/10, DEC-01/02/03)
 * V5-GO-LIVE-01: single canonical origin. redirectTo is now a SAME-ORIGIN relative
 * landing path per role (getLandingPath), never an absolute subdomain URL.
 *
 * Nhận { phone, password } (zod): đúng + isActive → JWT 8h + Set-Cookie session (host-only).
 * Response có thêm redirectTo (relative) theo role; internal role → không có redirectTo.
 * Cookie phát host-only (KHÔNG Domain=.hrpartner.vn); đồng thời xoá cookie domain-scoped cũ
 * trong giai đoạn chuyển đổi (DEC-03). Sai/khóa/malformed → 401 JSON, message chung KHÔNG
 * lộ tài khoản tồn tại hay không. KHÔNG log password/token dưới mọi hình thức.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { verifyPassword } from '@/src/shared/auth/password';
import { signJwt, JWT_TTL_SECONDS } from '@/src/shared/auth/jwt';
import { AUTH_COOKIE_NAME } from '@/src/shared/auth/user';
import { findUserForLogin } from '@/src/shared/auth/preauth-db';
import { getLandingPath } from '@/src/shared/routing/portal-landing';
import { error as logError, warn as logWarn } from '@/src/shared/observability/logger';

const loginSchema = z.object({
  phone: z.string().trim().min(1),
  password: z.string().min(1),
});

const UNAUTHORIZED = {
  status: 401,
} as const;

function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'INVALID_CREDENTIALS', message: 'Sai số điện thoại hoặc mật khẩu' },
    UNAUTHORIZED,
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return unauthorizedResponse();
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return unauthorizedResponse();
  }
  const { phone, password } = parsed.data;

  try {
    const prisma = getPrisma();
    // V5-M1-06d / RQ-08 / DEC-13: login la pre-auth entry-point — CHUA co AuthContext
    // nen KHONG the dung withDbContext. Doc User qua PREAUTH_DB helper co ten
    // (findUserForLogin): dong goi $transaction + GUC elevated transaction-local +
    // projection CO DINH. Route KHONG con raw $transaction/set_config (khong nam
    // allowlist static gate). verifyPassword + signJwt GIU NGUYEN (DEC-11: khong viet
    // lai auth flow, chi boc DB access).
    const user = await findUserForLogin(prisma, phone);

    // Fail-closed: không có user / isActive=false / chưa có passwordHash → từ chối chung
    if (!user || !user.isActive || !user.passwordHash) {
      logWarn('auth.login.denied', null, {
        route: '/api/auth/login',
        outcome: !user
          ? 'user_not_found'
          : !user.isActive
            ? 'user_inactive'
            : 'password_not_configured',
      });
      return unauthorizedResponse();
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      logWarn('auth.login.denied', null, {
        route: '/api/auth/login',
        outcome: 'password_mismatch',
      });
      return unauthorizedResponse();
    }

    const token = await signJwt(user.id, user.role);
    const redirectTo = getLandingPath(user.role); // same-origin relative path | null (internal roles)

    const res = NextResponse.json({
      ok: true,
      ...(redirectTo ? { redirectTo } : {}),
    });

    // V5-GO-LIVE-01 (DEC-03): cookie phiên phát HOST-ONLY (KHÔNG Domain=.hrpartner.vn).
    // Giai đoạn chuyển đổi phải phát ĐỒNG THỜI 2 Set-Cookie ở production:
    //   1) cookie phiên host-only mới,
    //   2) lệnh xoá cookie domain-scoped cũ (Max-Age=0, Domain=.hrpartner.vn) để cookie cũ
    //      phát từ subdomain không tồn tại song song gây nhập nhằng danh tính.
    // NextResponse.cookies.set() khoá theo TÊN → không thể phát 2 Set-Cookie trùng tên;
    // vì vậy ghi trực tiếp qua headers.append để phát xác định cả hai.
    // Secure chỉ bật ở production (dev chạy http). signJwt/TTL/cookie name GIỮ NGUYÊN (RQ-10).
    const isProd = process.env.NODE_ENV === 'production';
    const secure = isProd ? '; Secure' : '';
    res.headers.append(
      'Set-Cookie',
      `${AUTH_COOKIE_NAME}=${token}; Path=/; Max-Age=${JWT_TTL_SECONDS}; HttpOnly; SameSite=Lax${secure}`,
    );
    if (isProd) {
      res.headers.append(
        'Set-Cookie',
        `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure; Domain=.hrpartner.vn`,
      );
    }
    return res;
  } catch (error) {
    // Không catch rỗng (00-global-rules §3): log lỗi server nhưng KHÔNG lộ chi tiết
    // cho client — vẫn trả 401 chung (không 500, RQ-02).
    logError('auth.login.error', null, {
      route: '/api/auth/login',
      outcome: 'db_or_verify_error',
      errorCode:
        typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : 'UNCLASSIFIED',
    });
    return unauthorizedResponse();
  }
}
