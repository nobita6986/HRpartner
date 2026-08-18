/**
 * POST /api/disputes -- SENT/DRAFT transition (SEND, DISPUTE, CONFIRM, LOCK, FORCE_LOCK)
 *
 * Phase 4 slice 4C STEP-15 (RQ-13, RQ-15).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import {
  sendStatement,
  disputeStatement,
  confirmStatement,
  lockStatement,
  forceLockStatement,
  DisputeServiceError,
  type StatementKind,
} from '@/src/domains/reconciliation/dispute.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

  let body: {
    action: 'SEND' | 'DISPUTE' | 'CONFIRM' | 'LOCK' | 'FORCE_LOCK';
    statementId: string;
    statementKind: StatementKind;
    reason?: string;
    attachmentUrl?: string;
    deadlineDays?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phai la JSON' }, { status: 400 });
  }

  if (!body.action || !body.statementId || !body.statementKind) {
    return NextResponse.json({ error: 'VALIDATION', message: 'Thieu action, statementId, statementKind' }, { status: 400 });
  }

  const prisma = getPrisma();
  const idempotencyKey = getIdempotencyKey(req);

  try {
    if (!idempotencyKey) {
      const result = await runAction(prisma, ctx, body);
      return NextResponse.json(result);
    }
    const result = await withIdempotency({
      prisma,
      route: 'POST:/api/disputes',
      actorId: ctx.userId,
      key: idempotencyKey,
      requestBody: body,
      handler: async () => ({ body: await runAction(prisma, ctx, body), statusCode: 200 }),
    });
    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    if (e instanceof DisputeServiceError) {
      const status = e.code === 'NOT_FOUND' ? 404
        : e.code === 'PERMISSION_DENIED' ? 403
        : e.code === 'INVALID_STATE' || e.code === 'MAX_DISPUTES' || e.code === 'ALREADY_LOCKED' ? 409 : 400;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    if (e instanceof Error && e.name === 'IdempotencyConflictError') {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: e.message }, { status: 409 });
    }
    console.error('[api/disputes POST] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to process dispute' }, { status: 500 });
  }
}

async function runAction(prisma: ReturnType<typeof getPrisma>, ctx: any, body: any) {
  switch (body.action) {
    case 'SEND':
      return withDbContext(prisma, ctx, (tx) =>
        sendStatement(tx, ctx, { statementId: body.statementId, statementKind: body.statementKind, deadlineDays: body.deadlineDays }),
      );
    case 'DISPUTE':
      return withDbContext(prisma, ctx, (tx) =>
        disputeStatement(tx, ctx, {
          statementId: body.statementId,
          statementKind: body.statementKind,
          reason: body.reason ?? '',
          attachmentUrl: body.attachmentUrl,
        }),
      );
    case 'CONFIRM':
      return withDbContext(prisma, ctx, (tx) =>
        confirmStatement(tx, ctx, body.statementId, body.statementKind),
      );
    case 'LOCK':
      return withDbContext(prisma, ctx, (tx) =>
        lockStatement(tx, ctx, body.statementId, body.statementKind),
      );
    case 'FORCE_LOCK':
      return withDbContext(prisma, ctx, (tx) =>
        forceLockStatement(tx, ctx, body.statementId, body.statementKind),
      );
    default:
      throw new Error(`Unknown action: ${body.action}`);
  }
}