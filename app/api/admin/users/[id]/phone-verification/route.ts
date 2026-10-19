import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { extractRequestMeta } from '@/src/shared/auth/session-adapter';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { writeAuditLog } from '@/src/shared/integrity/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({ reason: z.string().trim().min(1).max(500) }).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to authenticate' }, { status: 500 });
  }
  if (ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Chỉ Admin được xác nhận số điện thoại.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Cần nhập lý do xác nhận.' }, { status: 400 });
  }

  const { id } = await params;
  const requestMeta = extractRequestMeta(req);
  try {
    const result = await withDbContext(getPrisma(), ctx, async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
        select: { id: true, role: true, phone: true, phoneVerified: true, isActive: true },
      });
      if (!user || user.role !== 'WORKER' || !user.phone || !user.isActive) {
        return { error: 'USER_NOT_ELIGIBLE' as const };
      }
      if (user.phoneVerified) return { phoneVerified: true, unchanged: true };

      const verifiedAt = new Date();
      await tx.user.update({
        where: { id },
        data: { phoneVerified: true, phoneVerifiedAt: verifiedAt },
      });
      await writeAuditLog({
        prisma: tx,
        actor: { id: ctx.userId, role: ctx.role, ...requestMeta },
        entityType: 'User',
        entityId: id,
        action: 'PHONE_VERIFIED_MANUALLY',
        diff: { before: { phoneVerified: false }, after: { phoneVerified: true } },
        reason: parsed.data.reason,
        metadata: { method: 'ADMIN_MANUAL' },
      });
      return { phoneVerified: true, phoneVerifiedAt: verifiedAt.toISOString() };
    });
    if ('error' in result) {
      return NextResponse.json({ error: result.error, message: 'Chỉ tài khoản WORKER đang hoạt động có số điện thoại mới được xác nhận.' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    console.error('[api/admin/users/[id]/phone-verification POST] failed');
    return NextResponse.json({ error: 'INTERNAL', message: 'Không thể xác nhận số điện thoại.' }, { status: 500 });
  }
}
