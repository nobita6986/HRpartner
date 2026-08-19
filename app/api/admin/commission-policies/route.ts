/**
 * GET/POST /api/admin/commission-policies — P2 Commission STEP-02 (RQ-02).
 *
 * Permission:
 *   - POST (create): chỉ ROOT/DIRECTOR (TASK §4.3)
 *   - GET (list): ROOT/ADMIN/HR_MANAGER/ACCOUNTANT/DIRECTOR
 *
 * Idempotency: POST yêu cầu header `x-idempotency-key` (withIdempotency pattern).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  CommissionPolicyError,
  createPolicy,
  listPolicies,
  toDTO,
} from '@/src/domains/commission/policy.service';
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WRITE_ROLES = new Set(['ADMIN', 'DIRECTOR'] as const);
const READ_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR'] as const);

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const take = Math.min(100, parseInt(searchParams.get('take') ?? '50', 10));
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);

  const prisma = getPrisma();
  try {
    const { items, total } = await withDbContext(prisma, ctx, (tx) =>
      listPolicies(tx, { take, skip }),
    );
    return NextResponse.json({
      items: items.map(toDTO),
      total,
      take,
      skip,
    });
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/admin/commission-policies GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list policies' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
      { error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền tạo policy` },
      { status: 403 },
    );
  }

  const idempotencyKey = req.headers.get('x-idempotency-key') ?? '';
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Header x-idempotency-key bắt buộc' },
      { status: 400 },
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
    const result = await withIdempotency({
      prisma,
      actorId: ctx.userId,
      route: 'POST:/api/admin/commission-policies',
      key: idempotencyKey,
      requestBody: body,
      handler: async () => {
        const policy = await withDbContext(prisma, ctx, (tx) =>
          createPolicy(tx, {
            name: String(body.name ?? ''),
            calcType: body.calcType as 'PER_HEAD_MILESTONE' | 'PERCENT_OF_REVENUE',
            value: BigInt(String(body.value ?? '0')),
            conditions: (body.conditions ?? {}) as Prisma.JsonObject,
            effectiveFrom: new Date(String(body.effectiveFrom)),
            effectiveTo: body.effectiveTo ? new Date(String(body.effectiveTo)) : null,
            createdBy: ctx.userId,
          }),
        );
        return { status: 201, body: toDTO(policy) };
      },
    });
    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (e) {
    if (e instanceof CommissionPolicyError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    }
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/admin/commission-policies POST] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create policy' }, { status: 500 });
  }
}
