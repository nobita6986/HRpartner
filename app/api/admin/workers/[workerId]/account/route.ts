import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { extractRequestMeta } from '@/src/shared/auth/session-adapter';
import { withAuthorizedDb } from '@/src/shared/auth/with-authorized-db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  getWorkerAccountContext,
  linkOrAssignWorkerAccountByAdmin,
  unlinkWorkerAccountByAdmin,
  WorkerOnboardingError,
} from '@/src/domains/admin/worker-onboarding.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const postBodySchema = z
  .object({
    userId: z.string().trim().min(1).max(200).nullable().optional(),
    autoVerifyAndActivate: z.boolean().optional(),
    allowPhoneUpdate: z.boolean().optional(),
    slotId: z.string().trim().min(1).max(200).nullable().optional(),
    employeeCode: z.string().trim().max(64).nullable().optional(),
    employmentType: z.enum(['HRP_EMPLOYED', 'OUTSOURCED', 'REFERRED_OUT']).nullable().optional(),
    workSetting: z.enum(['PHOTHONG', 'VANPHONG', 'CONGXUONG']).nullable().optional(),
    replaceActiveAssignment: z.boolean().optional(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

const deleteBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export async function GET(
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
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Chỉ Admin được xem thông tin liên kết tài khoản Worker.' },
      { status: 403 },
    );
  }

  const { workerId } = await params;
  try {
    const context = await withAuthorizedDb(getPrisma(), ctx, (tx) =>
      getWorkerAccountContext(tx, ctx, workerId),
    );
    return NextResponse.json({ ok: true, ...context }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof WorkerOnboardingError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/workers/[workerId]/account GET] failed');
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Không thể tải thông tin liên kết tài khoản Worker.' },
      { status: 500 },
    );
  }
}

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
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Chỉ Admin được liên kết tài khoản Worker.' },
      { status: 403 },
    );
  }

  const parsed = postBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Cần thông tin liên kết/phân công và lý do kiểm toán hợp lệ.' },
      { status: 400 },
    );
  }

  const { workerId } = await params;
  const requestMeta = extractRequestMeta(req);
  try {
    const result = await withDbContext(getPrisma(), ctx, (tx) =>
      linkOrAssignWorkerAccountByAdmin(
        tx,
        ctx,
        {
          workerId,
          userId: parsed.data.userId ?? null,
          autoVerifyAndActivate: parsed.data.autoVerifyAndActivate ?? true,
          allowPhoneUpdate: parsed.data.allowPhoneUpdate ?? false,
          slotId: parsed.data.slotId ?? null,
          employeeCode: parsed.data.employeeCode ?? null,
          employmentType: parsed.data.employmentType ?? null,
          workSetting: parsed.data.workSetting ?? null,
          replaceActiveAssignment: parsed.data.replaceActiveAssignment ?? false,
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
        { error: 'ALREADY_LINKED', message: 'Tài khoản đã liên kết với Worker khác.' },
        { status: 409 },
      );
    }
    console.error('[api/admin/workers/[workerId]/account POST] failed');
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Không thể liên kết tài khoản Worker.' },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Chỉ Admin được gỡ liên kết tài khoản Worker.' },
      { status: 403 },
    );
  }

  const parsed = deleteBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Cần nhập lý do gỡ liên kết hợp lệ.' },
      { status: 400 },
    );
  }

  const { workerId } = await params;
  const requestMeta = extractRequestMeta(req);
  try {
    const result = await withDbContext(getPrisma(), ctx, (tx) =>
      unlinkWorkerAccountByAdmin(tx, ctx, { workerId, reason: parsed.data.reason }, requestMeta),
    );
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof WorkerOnboardingError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/workers/[workerId]/account DELETE] failed');
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Không thể gỡ liên kết tài khoản Worker.' },
      { status: 500 },
    );
  }
}
