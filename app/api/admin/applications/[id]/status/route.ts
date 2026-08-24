/**
 * PATCH|POST /api/admin/applications/[id]/status — MP-2 STEP-04 (RQ-06, DEC-05).
 *
 * The single MP-2-owned status action: NEW <-> NEEDS_INFO with a REQUIRED
 * reason. `transitionApplicationStatus` validates the state machine (MP-3
 * targets -> INVALID_TRANSITION 409; empty reason -> REASON_REQUIRED 400),
 * updates status, and appends a history row in the SAME transaction
 * (append-only invariant). RLS-scoped via `withDbContext`; the service is the
 * DEC-06 role gate (FORBIDDEN 403). PATCH and POST share one handler.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  transitionApplicationStatus,
  AdminApplicationError,
} from '@/src/domains/applications/application-queue.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface StatusBody {
  toStatus?: string;
  status?: string;
  reason?: string;
}

async function handle(req: NextRequest, id: string) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  let body: StatusBody;
  try {
    body = (await req.json()) as StatusBody;
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'Invalid JSON body' }, { status: 400 });
  }

  const toStatus = (body.toStatus ?? body.status ?? '').trim();
  const reason = body.reason ?? '';
  if (!toStatus) {
    return NextResponse.json({ error: 'VALIDATION', message: 'toStatus is required' }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const result = await withDbContext(prisma, ctx, (tx) =>
      transitionApplicationStatus(tx, ctx, id, toStatus, reason),
    );
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AdminApplicationError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.httpStatus });
    }
    console.error('[api/admin/applications/:id/status] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to update status' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(req, id);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(req, id);
}
