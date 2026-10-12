import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { getLaborProfileDetail } from '@/src/domains/talent/labor-profile.read-service';
import { updateLaborProfileIntakeProfile } from '@/src/domains/talent/labor-profile.service';
import { LaborProfileAlreadyLinkedError } from '@/src/domains/talent/labor-profile.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF']);
// DEC-P2-02: chỉ ADMIN + HR_MANAGER mới là writer LaborProfile. HR_STAFF đọc-only
// (đã được bảo vệ ở `app/admin/labor-profiles/[id]/page.tsx` nhưng route vẫn
// enforce — defense in depth).
const WRITER_ROLES = new Set(['ADMIN', 'HR_MANAGER']);

/**
 * DEC-P2-03 + DEC-P2-06: PATCH body CHỈ chấp nhận 3 field intake.
 * `workerId` cố ý KHÔNG có mặt; zod `.strict()` reject mọi extra key → fail-closed
 * ngay tại entry, không cần service tự loại trừ.
 *
 * DEC-P2-03 (b): ít nhất 1 field phải có mặt — PATCH nửa-vời (empty body) trả
 * 400 ngay thay vì 200 no-op (vì service vẫn tốn SELECT/UPDATE/probe vô ích).
 *
 * v1.1 (PR #110 correction 1/3): vẫn giữ schema này; masked-input rejection
 * và CAS-update chuyển xuống service layer.
 */
const PatchProfileSchema = z
  .object({
    fullName: z.string().min(1).max(255).optional(),
    phone: z.string().min(1).max(20).optional(),
    cccdNumber: z.string().max(20).nullable().optional(),
  })
  .strict()
  .refine(
    (v) => v.fullName !== undefined || v.phone !== undefined || v.cccdNumber !== undefined,
    { message: 'Phải cung cấp ít nhất một trong fullName / phone / cccdNumber.' },
  );

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const ctx = await getAuthContext(req);
    if (!ADMIN_ROLES.has(ctx.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Not allowed' }, { status: 403 });
    }

    const prisma = getPrisma();
    const result = await withDbContext(prisma, ctx, async (tx) => {
      return getLaborProfileDetail(tx, ctx, resolvedParams.id);
    });

    if (!result) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'LaborProfile not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    console.error('Get LaborProfile detail error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to fetch labor profile detail' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const ctx = await getAuthContext(req);
    if (!WRITER_ROLES.has(ctx.role)) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: `Role ${ctx.role} không có quyền sửa hồ sơ tiếp nhận.`,
        },
        { status: 403 },
      );
    }

    // v1.1 PR #110 correction 1/3: writer phải có quyền XEM dữ liệu nhạy cảm
    // (`CAN_VIEW_WORKER_SENSITIVE`). Nếu không, UI sẽ render masked phone/cccd
    // → writer không thấy giá trị thật, không thể sửa đúng. Reject ở route
    // layer để chặn trước khi vào service.
    const effective = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
    if (!effective.has('CAN_VIEW_WORKER_SENSITIVE')) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message:
            'Cần quyền CAN_VIEW_WORKER_SENSITIVE để sửa Hồ sơ tiếp nhận ' +
            '(tránh submit ngược dữ liệu phone/CCCD đã bị mask).',
        },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = PatchProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'INVALID_INPUT',
          message: 'Payload không hợp lệ. Chỉ fullName / phone / cccdNumber; KHÔNG chấp nhận workerId.',
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const result = await withDbContext(prisma, ctx, async (tx) => {
      return updateLaborProfileIntakeProfile(tx, {
        id: resolvedParams.id,
        ...parsed.data,
        actorId: ctx.userId,
      });
    });

    return NextResponse.json({ profile: result });
  } catch (e: unknown) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    if (e instanceof LaborProfileAlreadyLinkedError) {
      // DEC-P2-06: profile đã được convert → fail-closed, không cho sửa.
      // Cũng match v1.1 CAS-lost case: concurrent conversion thắng.
      return NextResponse.json(
        {
          error: e.code,
          message: 'Hồ sơ đã được chuyển thành người lao động; không thể chỉnh sửa.',
          workerId: e.workerId,
        },
        { status: 409 },
      );
    }
    if (e instanceof Error) {
      const code = (e as Error & { code?: string }).code;
      if (code === 'LABOR_PROFILE_NOT_FOUND') {
        return NextResponse.json(
          { error: 'NOT_FOUND', message: 'LaborProfile not found' },
          { status: 404 },
        );
      }
      if (code === 'LABOR_PROFILE_MASKED_INPUT_REJECTED') {
        // v1.1: chống submit masked-shape input.
        return NextResponse.json(
          {
            error: 'INVALID_INPUT',
            message:
              'Field phone hoặc cccdNumber chứa ký tự mask "*" — không thể submit dữ liệu đã bị che vào DB.',
          },
          { status: 400 },
        );
      }
    }
    console.error('Patch LaborProfile error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to update labor profile' },
      { status: 500 },
    );
  }
}
