import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { hashPassword, verifyPassword } from '@/src/shared/auth/password';
import { SYSTEM_BI_SYNC, withSystemDb } from '@/src/shared/auth/with-system-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
  newPassword: z
    .string()
    .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự.')
    .max(128, 'Mật khẩu mới không vượt quá 128 ký tự.'),
});

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (err) {
    if (err instanceof AuthSessionError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Dữ liệu đổi mật khẩu không hợp lệ.',
      },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) {
    return NextResponse.json(
      {
        error: 'SAME_PASSWORD',
        message: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
      },
      { status: 400 },
    );
  }

  const prisma = getPrisma();

  try {
    const result = await withSystemDb(prisma, SYSTEM_BI_SYNC, async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true, passwordHash: true, isActive: true },
      });
      if (!user || !user.isActive || !user.passwordHash) {
        return { kind: 'NOT_FOUND' as const };
      }

      const passwordMatches = await verifyPassword(currentPassword, user.passwordHash);
      if (!passwordMatches) {
        return { kind: 'WRONG_CURRENT_PASSWORD' as const };
      }

      const nextPasswordHash = await hashPassword(newPassword);

      await tx.user.update({
        where: { id: ctx.userId },
        data: {
          passwordHash: nextPasswordHash,
          mustChangePassword: false,
        },
      });

      const initialCredDelegate = (tx as unknown as {
        workerInitialCredential?: {
          deleteMany: (args: { where: { userId: string } }) => Promise<{ count: number }>;
        };
      }).workerInitialCredential;
      let purgedCount = 0;
      if (initialCredDelegate?.deleteMany) {
        const deleted = await initialCredDelegate.deleteMany({
          where: { userId: ctx.userId },
        });
        purgedCount = deleted.count;
      }

      const auditDelegate = (tx as unknown as {
        auditLog?: {
          create: (args: {
            data: {
              actorId: string;
              actorRole: string;
              action: string;
              entityType: string;
              entityId: string;
              diff: Record<string, unknown>;
            };
          }) => Promise<unknown>;
        };
      }).auditLog;
      if (auditDelegate?.create) {
        await auditDelegate.create({
          data: {
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'CHANGE_PASSWORD',
            entityType: 'USER',
            entityId: ctx.userId,
            diff: {
              mustChangePasswordCleared: true,
              initialCredentialPurged: purgedCount > 0,
            },
          },
        });
      }

      return { kind: 'CHANGED' as const };
    });

    if (result.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'USER_NOT_FOUND', message: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }
    if (result.kind === 'WRONG_CURRENT_PASSWORD') {
      return NextResponse.json(
        { error: 'INVALID_CURRENT_PASSWORD', message: 'Mật khẩu hiện tại không đúng.' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      mustChangePassword: false,
      message: 'Đổi mật khẩu thành công.',
    });
  } catch (err) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : 'UNCLASSIFIED';
    console.error('[api/auth/change-password] error:', { code });
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Không thể đổi mật khẩu lúc này.' }, { status: 500 });
  }
}
