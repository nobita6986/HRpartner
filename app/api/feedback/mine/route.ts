import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';

const error = (code: string, message: string, status: number) => NextResponse.json({ ok: false, error: { code, message, details: {} } }, { status });

export async function GET(req: NextRequest) {
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return error('UNAUTHORIZED', 'Vui lòng đăng nhập.', 401); }
  if (ctx.role !== 'WORKER') return error('FORBIDDEN', 'Chỉ tài khoản người lao động được xem góp ý.', 403);
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? 20) || 20));
  try {
    const result = await withDbContext(getPrisma(), ctx, async (tx) => {
      const user = await tx.user.findUnique({ where: { id: ctx.userId }, select: { phoneVerified: true } });
      if (!user?.phoneVerified) return null;
      return tx.feedback.findMany({
        where: { userId: ctx.userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        select: { id: true, category: true, content: true, status: true, adminResponse: true, respondedAt: true, createdAt: true },
      });
    });
    if (!result) return error('PHONE_NOT_VERIFIED', 'Cần xác thực số điện thoại OTP để xem góp ý.', 403);
    return NextResponse.json({ ok: true, data: { items: result, page, limit } });
  } catch (e) {
    console.error('[feedback/mine] query failed', { error: e instanceof Error ? e.name : 'unknown' });
    return error('INTERNAL_ERROR', 'Không thể tải góp ý lúc này.', 500);
  }
}
