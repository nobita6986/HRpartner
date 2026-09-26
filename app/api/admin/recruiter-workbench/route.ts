/**
 * GET /api/admin/recruiter-workbench — P1-E0 Recruiter Workbench Read Model.
 *
 * Gate sequence (must hold in order):
 *   1. Auth (401 if missing/invalid token).
 *   2. Role (403 if not ADMIN | HR_MANAGER | HR_STAFF).
 *   3. View gate:
 *        - HR_STAFF + view=ALL → 403 (DEC-06).
 *        - view=UNASSIGNED + missing CAN_VIEW_UNASSIGNED_POOL → 403.
 *   4. Zod parse query (400 BAD_QUERY if invalid — NO DB hit on bad input).
 *   5. Execute inside withDbContext (RLS GUC set per request).
 *   6. Default `view` for omitted param:
 *        - HR_STAFF → MINE
 *        - ADMIN/HR_MANAGER → ALL
 *
 * Default `sort` and `pageSize` are server-side applied by the service.
 *
 * Reference: TASK.md v1.3 / RQ-02..RQ-17.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getPrisma } from '@/src/lib/db';
import {
  AuthSessionError,
  getAuthContext,
} from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';

import { getRecruiterWorkbenchList } from '@/src/domains/talent/recruiter-workbench.read-service';
import {
  RecruiterWorkbenchQuerySchema,
  type RecruiterWorkbenchFilter,
} from '@/src/domains/talent/recruiter-workbench.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF']);

export async function GET(req: NextRequest): Promise<NextResponse> {
  // 1. Auth ──────────────────────────────────────────────────────────────
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json(
        { error: e.code, message: e.message },
        { status: 401 },
      );
    }
    console.error('[recruiter-workbench] auth error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to build auth context' },
      { status: 500 },
    );
  }

  // 2. Role gate ─────────────────────────────────────────────────────────
  if (!ALLOWED_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'PERMISSION_DENIED' },
      { status: 403 },
    );
  }

  // 3. View gate — read raw view BEFORE zod parse so we can reject early
  //    without constructing a body. The same value is re-validated by zod
  //    below; if it fails there, we still return 400.
  const { searchParams } = new URL(req.url);
  const rawView = searchParams.get('view') ?? undefined;

  if (ctx.role === 'HR_STAFF' && rawView === 'ALL') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'PERMISSION_DENIED' },
      { status: 403 },
    );
  }

  if (rawView === 'UNASSIGNED') {
    const perms = await resolveEffectivePermissions({
      userId: ctx.userId,
      role: ctx.role,
    });
    if (!perms.has('CAN_VIEW_UNASSIGNED_POOL')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'PERMISSION_DENIED' },
        { status: 403 },
      );
    }
  }

  // 4. Zod parse — 400 BAD_QUERY with no DB hit on invalid input (RQ-16)
  const parseResult = RecruiterWorkbenchQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'BAD_QUERY', issues: parseResult.error.issues },
      { status: 400 },
    );
  }
  const parsed = parseResult.data;

  // 5. Effective view — service receives a fully-resolved filter.
  const effectiveView =
    parsed.view ?? (ctx.role === 'HR_STAFF' ? 'MINE' : 'ALL');

  const filter: RecruiterWorkbenchFilter = {
    ...(parsed.search !== undefined ? { search: parsed.search } : {}),
    ...(parsed.caseStatus !== undefined
      ? { caseStatus: parsed.caseStatus }
      : {}),
    ...(parsed.handlerUserId !== undefined
      ? { handlerUserId: parsed.handlerUserId }
      : {}),
    view: effectiveView,
    ...(parsed.overdue !== undefined ? { overdue: parsed.overdue } : {}),
    ...(parsed.sort !== undefined ? { sort: parsed.sort } : {}),
    page: parsed.page,
    pageSize: Number(parsed.pageSize),
  };

  // 6. Execute inside withDbContext (RLS GUC scoped to transaction).
  const prisma = getPrisma();
  try {
    const result = await withDbContext(prisma, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, filter),
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('[recruiter-workbench] service error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Internal server error' },
      { status: 500 },
    );
  }
}
