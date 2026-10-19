import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';

const inputSchema = z.object({
  category: z.enum(['WORK_ENVIRONMENT', 'SALARY_BENEFITS', 'SUGGESTION', 'COMPLAINT', 'OTHER']),
  content: z.string().trim().min(10).max(5000),
}).strict();
const error = (code: string, message: string, status: number) => NextResponse.json({ ok: false, error: { code, message, details: {} } }, { status });

export async function POST(req: NextRequest) {
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return error('UNAUTHORIZED', 'Vui lòng đăng nhập.', 401); }
  if (ctx.role !== 'WORKER') return error('FORBIDDEN', 'Chỉ tài khoản người lao động được gửi góp ý.', 403);
  const body = inputSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return error('VALIDATION_ERROR', 'Thông tin góp ý không hợp lệ.', 400);
  const prisma = getPrisma();
  try {
    const result = await withDbContext(prisma, ctx, async (tx) => {
      const user = await tx.user.findUnique({ where: { id: ctx.userId }, select: { phoneVerified: true } });
      if (!user?.phoneVerified) return null;
      return tx.feedback.create({
        data: { userId: ctx.userId, category: body.data.category, content: body.data.content },
        select: { id: true, category: true, status: true, createdAt: true },
      });
    });
    if (!result) return error('PHONE_NOT_VERIFIED', 'Cần xác thực số điện thoại OTP trước khi gửi góp ý.', 403);
    return NextResponse.json({ ok: true, data: { feedbackId: result.id, status: result.status, submittedAt: result.createdAt.toISOString() } }, { status: 201 });
  } catch (e) {
    console.error('[feedback] create failed', { error: e instanceof Error ? e.name : 'unknown' });
    return error('INTERNAL_ERROR', 'Không thể gửi góp ý lúc này.', 500);
  }
}
