/**
 * POST /api/auth/login (Phase 1 bcc-fence — RQ-02, DEC-01/03/05/10)
 * P1 Portals STEP-03: extended with role-based redirect URL (DEC-13).
 *
 * Nhận { phone, password } (zod): đúng + isActive → JWT 8h + Set-Cookie hrp_token.
 * Response có thêm redirectTo theo role (client redirect về domain đúng).
 * Sai/khóa/malformed → 401 JSON, message chung KHÔNG lộ tài khoản tồn tại hay không.
 * KHÔNG log password/token dưới mọi hình thức.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { verifyPassword } from '@/src/shared/auth/password';
import { signJwt, JWT_TTL_SECONDS } from '@/src/shared/auth/jwt';
import { AUTH_COOKIE_NAME } from '@/src/shared/auth/user';

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

// DEC-13: role → redirect URL after login
const ROLE_REDIRECT: Record<string, string> = {
  VENDOR_ADMIN:  'https://vendor.hrpartner.vn',
  VENDOR_STAFF: 'https://vendor.hrpartner.vn',
  WORKER:       'https://worker.hrpartner.vn',
  CTV:          'https://ctv.hrpartner.vn',
};

function getRedirectUrl(role: string): string | null {
  return ROLE_REDIRECT[role] ?? null;
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
    const user = await prisma.user.findFirst({ where: { phone } });

    // Fail-closed: không có user / isActive=false / chưa có passwordHash → từ chối chung
    if (!user || !user.isActive || !user.passwordHash) {
      return unauthorizedResponse();
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      return unauthorizedResponse();
    }

    const token = await signJwt(user.id, user.role);
    const redirectTo = getRedirectUrl(user.role);

    const res = NextResponse.json({
      ok: true,
      ...(redirectTo ? { redirectTo } : {}),
    });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      // Deviation (TASK mục lưu ý kỹ thuật): Secure chỉ bật ở production vì local dev
      // chạy http (cookie Secure sẽ không được trình duyệt gửi lại → không test được).
      // Production vẫn Secure (DEC-03).
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: JWT_TTL_SECONDS,
      // Đặt domain để chia sẻ cookie giữa các subdomain (tránh xung đột token gây infinite redirect)
      ...(process.env.NODE_ENV === 'production' ? { domain: '.hrpartner.vn' } : {}),
    });
    return res;
  } catch (error) {
    // Không catch rỗng (00-global-rules §3): log lỗi server nhưng KHÔNG lộ chi tiết
    // cho client — vẫn trả 401 chung (không 500, RQ-02).
    console.error('[auth/login] DB/verify error:', error);
    return unauthorizedResponse();
  }
}
