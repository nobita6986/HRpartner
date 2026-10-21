import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { extractRequestMeta } from '@/src/shared/auth/session-adapter';
import { withAuthorizedDb } from '@/src/shared/auth/with-authorized-db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  getLaborProfileOnboardingContext,
  onboardLaborProfileByAdmin,
  WorkerOnboardingError,
} from '@/src/domains/admin/worker-onboarding.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const onboardLaborProfileSchema = z
  .object({
    userId: z.string().trim().min(1).max(200).nullable().optional(),
    createAccountIfMissing: z.boolean().optional(),
    verifyPhone: z.boolean().optional(),
    workerId: z.string().trim().min(1).max(200).nullable().optional(),
    slotId: z.string().trim().min(1).max(200).nullable().optional(),
    employeeCode: z.string().trim().max(64).nullable().optional(),
    employmentType: z.enum(['HRP_EMPLOYED', 'OUTSOURCED', 'REFERRED_OUT']).nullable().optional(),
    workSetting: z.enum(['PHOTHONG', 'VANPHONG', 'CONGXUONG']).nullable().optional(),
    replaceActiveAssignment: z.boolean().optional(),
    allowPhoneUpdate: z.boolean().optional(),
    reason: z.string().trim().min(1, 'Cần nhập lý do kiểm toán.').max(500),
  })
  .strict();

export async function GET(
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
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Chỉ Admin được xem thông tin phê duyệt ứng viên.' },
      { status: 403 },
    );
  }

  const { id } = await params;
  try {
    const context = await withAuthorizedDb(getPrisma(), ctx, (tx) =>
      getLaborProfileOnboardingContext(tx, ctx, id),
    );
    return NextResponse.json({ ok: true, ...context }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof WorkerOnboardingError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/labor-profiles/[id]/onboarding GET] failed');
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Không thể tải dữ liệu phê duyệt ứng viên.' },
      { status: 500 },
    );
  }
}

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
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Chỉ Admin được phê duyệt và phân công người lao động.' },
      { status: 403 },
    );
  }

  const parsed = onboardLaborProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Dữ liệu phê duyệt ứng viên không hợp lệ.',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  const requestMeta = extractRequestMeta(req);
  try {
    const result = await withDbContext(getPrisma(), ctx, (tx) =>
      onboardLaborProfileByAdmin(
        tx,
        ctx,
        {
          laborProfileId: id,
          userId: parsed.data.userId ?? null,
          createAccountIfMissing: parsed.data.createAccountIfMissing ?? false,
          verifyPhone: parsed.data.verifyPhone ?? true,
          workerId: parsed.data.workerId ?? null,
          slotId: parsed.data.slotId ?? null,
          employeeCode: parsed.data.employeeCode ?? null,
          employmentType: parsed.data.employmentType ?? null,
          workSetting: parsed.data.workSetting ?? null,
          replaceActiveAssignment: parsed.data.replaceActiveAssignment ?? false,
          allowPhoneUpdate: parsed.data.allowPhoneUpdate ?? false,
          reason: parsed.data.reason,
        },
        requestMeta,
      ),
    );
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof WorkerOnboardingError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (code === 'P2002') {
      return NextResponse.json(
        {
          error: 'ALREADY_LINKED',
          message: 'Tài khoản hoặc số điện thoại đã được liên kết với hồ sơ người lao động khác.',
        },
        { status: 409 },
      );
    }
    console.error('[api/admin/labor-profiles/[id]/onboarding POST] failed');
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Không thể phê duyệt và phân công người lao động.' },
      { status: 500 },
    );
  }
}
