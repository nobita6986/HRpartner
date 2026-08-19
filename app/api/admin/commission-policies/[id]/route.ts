/**
 * GET/PATCH /api/admin/commission-policies/[id] — P2 Commission STEP-02 (RQ-02).
 *
 * GET: READ_ROLES (ADMIN, HR_MANAGER, ACCOUNTANT, DIRECTOR).
 * PATCH: WRITE_ROLES (ADMIN, DIRECTOR) — tạo row MỚI version++ (ADR-013 immutable).
 *
 * PATCH trả về policy MỚI (id mới, version+1); id c� vẫn tồn tại để ledger tham chiếu.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  CommissionPolicyError,
  getPolicyById,
  toDTO,
  updatePolicy,
} from '@/src/domains/commission/policy.service';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WRITE_ROLES = new Set(['ADMIN', 'DIRECTOR'] as const);
const READ_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR'] as const);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!READ_ROLES.has(ctx.role as 'ADMIN')) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền xem policy` },
      { status: 403 },
    );
  }

  const prisma = getPrisma();
  try {
    const policy = await withDbContext(prisma, ctx, (tx) => getPolicyById(tx, id));
    if (!policy) {
      return NextResponse.json({ error: 'NOT_FOUND', message: `Policy ${id} không tồn tại` }, { status: 404 });
    }
    return NextResponse.json(toDTO(policy));
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/admin/commission-policies/:id GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to fetch policy' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!WRITE_ROLES.has(ctx.role as 'ADMIN')) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền sửa policy` },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON', message: 'Body không phải JSON' }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const policy = await withDbContext(prisma, ctx, (tx) =>
      updatePolicy(tx, {
        previousId: id,
        name: String(body.name ?? ''),
        calcType: body.calcType as 'PER_HEAD_MILESTONE' | 'PERCENT_OF_REVENUE',
        value: BigInt(String(body.value ?? '0')),
        conditions: (body.conditions ?? {}) as Prisma.JsonObject,
        effectiveFrom: new Date(String(body.effectiveFrom)),
        effectiveTo: body.effectiveTo ? new Date(String(body.effectiveTo)) : null,
        createdBy: ctx.userId,
      }),
    );
    return NextResponse.json(toDTO(policy), { status: 201 });
  } catch (e) {
    if (e instanceof CommissionPolicyError) {
      const status = e.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/admin/commission-policies/:id PATCH] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to update policy' }, { status: 500 });
  }
}
