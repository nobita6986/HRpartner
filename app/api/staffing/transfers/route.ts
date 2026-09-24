/**
 * POST /api/staffing/transfers — Guided Transfer (STEP-06, RQ-02, AC-10).
 *
 * Body: single { workerId, fromProjectId, toProjectId, transferDate, ... }
 * Bulk: array [{ ... }, { ... }]
 *
 * AC-10: POST bọc withIdempotency.
 * Outbox event được gửi trong transferWorker service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import {
  transferWorker,
  bulkTransferWorker,
  TransferServiceError,
} from '@/src/domains/staffing/transfer.service';
import type { TransferWorkerInput } from '@/src/domains/staffing/transfer.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TRANSFER_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'] as const);

/**
 * AFF-04 explicit manual allowlist (DEC-13 / route boundary contract):
 * the API surface for /api/staffing/transfers accepts ONLY these fields.
 * Any client-supplied `referrerId`, `ctvId`, `workerUserId`, or any other
 * provenance field is SILENTLY DROPPED before the value reaches the
 * service. The service layer re-derives the referrer from the canonical
 * accepted SourceClaim — request-body hints are NEVER authoritative.
 *
 * This is the route-side defense in depth: even if a future bug added an
 * `input.referrerId` to TransferWorkerInput, this allowlist would still
 * strip it.
 */
interface TransferBodyShape {
  workerId: string;
  fromProjectId: string;
  toProjectId: string;
  transferDate: string;
  positionCode?: string;
  positionTitle?: string;
  transferReason?: string;
}

function toTransferInput(raw: unknown): TransferWorkerInput | { error: string; message: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { error: 'INVALID_BODY', message: 'Transfer item must be an object' };
  }
  const r = raw as Partial<TransferBodyShape>;
  if (typeof r.workerId !== 'string' || !r.workerId.trim()) {
    return { error: 'VALIDATION', message: 'workerId is required' };
  }
  if (typeof r.fromProjectId !== 'string' || !r.fromProjectId.trim()) {
    return { error: 'VALIDATION', message: 'fromProjectId is required' };
  }
  if (typeof r.toProjectId !== 'string' || !r.toProjectId.trim()) {
    return { error: 'VALIDATION', message: 'toProjectId is required' };
  }
  if (typeof r.transferDate !== 'string' || !r.transferDate.trim()) {
    return { error: 'VALIDATION', message: 'transferDate is required' };
  }
  return {
    workerId: r.workerId,
    fromProjectId: r.fromProjectId,
    toProjectId: r.toProjectId,
    transferDate: r.transferDate,
    ...(typeof r.positionCode === 'string' ? { positionCode: r.positionCode } : {}),
    ...(typeof r.positionTitle === 'string' ? { positionTitle: r.positionTitle } : {}),
    ...(typeof r.transferReason === 'string' ? { transferReason: r.transferReason } : {}),
  };
}

function getIdempotencyKey(req: NextRequest): string | undefined {
  return req.headers.get('x-idempotency-key') ?? undefined;
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!TRANSFER_ROLES.has(ctx.role as typeof TRANSFER_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền transfer worker` },
      { status: 403 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON' }, { status: 400 });
  }

  const prisma = getPrisma();

  // Single transfer — idempotency
  if (!Array.isArray(rawBody)) {
    const normalized = toTransferInput(rawBody);
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error, message: normalized.message }, { status: 400 });
    }
    const idempotencyKey = getIdempotencyKey(req);

    if (!idempotencyKey) {
      try {
        const result = await withDbContext(prisma, ctx, (tx) => transferWorker(tx, ctx, normalized));
        return NextResponse.json({ transfer: result }, { status: 201 });
      } catch (e) {
        if (e instanceof TransferServiceError) {
          const status = e.code === 'PERMISSION_DENIED' ? 403
            : e.code === 'NO_ACTIVE_ASSIGNMENT' || e.code === 'MULTIPLE_ACTIVE_ASSIGNMENTS' ? 409
            : e.code === 'PROJECT_QUOTA_FULL' ? 409 : 400;
          return NextResponse.json({ error: e.code, message: e.message }, { status });
        }
        if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
        console.error('[api/staffing/transfers POST] error:', e);
        return NextResponse.json({ error: 'INTERNAL', message: 'Failed to transfer worker' }, { status: 500 });
      }
    }

    try {
      const result = await withIdempotency({
        prisma,
        route: 'POST:/api/staffing/transfers',
        actorId: ctx.userId,
        key: idempotencyKey,
        requestBody: normalized,
        handler: async () => {
          const r = await withDbContext(prisma, ctx, (tx) => transferWorker(tx, ctx, normalized));
          return { body: { transfer: r }, statusCode: 201 };
        },
      });
      return NextResponse.json(result.body, { status: result.statusCode });
    } catch (e) {
      if (e instanceof TransferServiceError) {
        const status = e.code === 'PERMISSION_DENIED' ? 403
          : e.code === 'NO_ACTIVE_ASSIGNMENT' || e.code === 'MULTIPLE_ACTIVE_ASSIGNMENTS' ? 409
          : e.code === 'PROJECT_QUOTA_FULL' ? 409 : 400;
        return NextResponse.json({ error: e.code, message: e.message }, { status });
      }
      if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
      if (e instanceof Error && e.name === 'IdempotencyConflictError') {
        return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: e.message }, { status: 409 });
      }
      console.error('[api/staffing/transfers POST idempotency] error:', e);
      return NextResponse.json({ error: 'INTERNAL', message: 'Failed to transfer worker' }, { status: 500 });
    }
  }

  // Bulk transfer — no idempotency (per-item savepoint).
  // AFF-04: each item is allowlisted through toTransferInput as well.
  const normalizedBulk: Array<TransferWorkerInput | { error: string; message: string }> = rawBody.map(toTransferInput);
  const bulkErrors = normalizedBulk.filter((x): x is { error: string; message: string } => 'error' in x);
  if (bulkErrors.length > 0) {
    return NextResponse.json(
      { error: 'VALIDATION', message: bulkErrors[0].message, details: { invalidIndices: bulkErrors.map((_, i) => i) } },
      { status: 400 },
    );
  }
  try {
    const result = await bulkTransferWorker(prisma, ctx, normalizedBulk as TransferWorkerInput[]);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[api/staffing/transfers POST bulk] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to bulk transfer' }, { status: 500 });
  }
}
