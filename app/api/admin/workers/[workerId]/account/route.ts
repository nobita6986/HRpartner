import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { writeAuditLog } from '@/src/shared/integrity/audit';
import { normalizePhone } from '@/src/domains/applications/apply-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({
  userId: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(1).max(500),
}).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workerId: string }> },
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
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Chỉ Admin được liên kết tài khoản Worker.' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Cần userId và lý do liên kết hợp lệ.' }, { status: 400 });
  }

  const { workerId } = await params;
  const prisma = getPrisma();
  try {
    const result = await withDbContext(prisma, ctx, async (tx) => {
      const worker = await tx.worker.findUnique({
        where: { id: workerId },
        select: {
          id: true,
          phone: true,
          profileStatus: true,
          employmentStatus: true,
          accountUserId: true,
          assignments: {
            where: { status: 'ACTIVE', validFrom: { lte: new Date() }, OR: [{ validTo: null }, { validTo: { gt: new Date() } }] },
            select: { id: true },
            take: 1,
          },
        },
      });
      if (!worker) throw Object.assign(new Error('Không tìm thấy Worker.'), { code: 'NOT_FOUND' });
      if (worker.accountUserId) throw Object.assign(new Error('Worker đã có tài khoản đăng nhập.'), { code: 'ALREADY_LINKED' });
      if (worker.profileStatus !== 'VERIFIED' || worker.employmentStatus !== 'ACTIVE' || worker.assignments.length === 0) {
        throw Object.assign(new Error('Chỉ liên kết Worker đã xác minh, đang hoạt động và có assignment hiện hành.'), { code: 'WORKER_NOT_READY' });
      }

      const user = await tx.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, role: true, phone: true, isActive: true, passwordHash: true },
      });
      if (!user || user.role !== 'WORKER' || !user.isActive || !user.passwordHash) {
        throw Object.assign(new Error('Tài khoản phải là WORKER đang hoạt động và đã có mật khẩu.'), { code: 'USER_NOT_READY' });
      }
      if (!worker.phone || !user.phone || normalizePhone(worker.phone) !== normalizePhone(user.phone)) {
        throw Object.assign(new Error('Số điện thoại tài khoản không khớp hồ sơ Worker.'), { code: 'PHONE_MISMATCH' });
      }

      const linked = await tx.worker.updateMany({
        where: { id: worker.id, accountUserId: null, profileStatus: 'VERIFIED', employmentStatus: 'ACTIVE' },
        data: { accountUserId: user.id },
      });
      if (linked.count !== 1) throw Object.assign(new Error('Worker vừa được liên kết hoặc thay đổi; hãy tải lại.'), { code: 'CONCURRENT_CHANGE' });

      await writeAuditLog({
        prisma: tx,
        actor: { id: ctx.userId, role: ctx.role },
        entityType: 'Worker',
        entityId: worker.id,
        action: 'LOGIN_ACCOUNT_LINKED',
        diff: { before: { accountUserId: null }, after: { accountUserId: user.id } },
        reason: parsed.data.reason,
        metadata: { linkedUserId: user.id },
      });
      return { workerId: worker.id, userId: user.id };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (['NOT_FOUND', 'ALREADY_LINKED', 'WORKER_NOT_READY', 'USER_NOT_READY', 'PHONE_MISMATCH', 'CONCURRENT_CHANGE'].includes(code)) {
      return NextResponse.json({ error: code, message: (error as Error).message }, { status: code === 'NOT_FOUND' ? 404 : 409 });
    }
    if (code === 'P2002') {
      return NextResponse.json({ error: 'ALREADY_LINKED', message: 'Tài khoản đã liên kết với Worker khác.' }, { status: 409 });
    }
    console.error('[api/admin/workers/[workerId]/account POST] failed');
    return NextResponse.json({ error: 'INTERNAL', message: 'Không thể liên kết tài khoản Worker.' }, { status: 500 });
  }
}
