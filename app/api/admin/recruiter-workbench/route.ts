/**
 * GET /api/admin/recruiter-workbench — P1-E0 Recruiter Workbench Read Model.
 *
 * Gate sequence (E0-F02 — must hold in order):
 *   1. Auth (401 if missing/invalid token).
 *   2. Role allowlist gate (403 if not ADMIN | HR_MANAGER | HR_STAFF).
 *   3. View pre-check BEFORE zod (HR_STAFF + view=ALL → 403; view=UNASSIGNED → check permission).
 *   4. Strict Zod parse of query (400 BAD_QUERY — no DB hit on bad input).
 *   5. Role/view/handler authority (HR_STAFF: explicit MINE allowed, ALL/UNASSIGNED → 403;
 *      HR_STAFF: foreign handlerUserId → 403; UNASSIGNED needs CAN_VIEW_UNASSIGNED_POOL).
 *   6. Resolve effective permissions ONCE (after all authority checks, before service call).
 *   7. withDbContext → service call with resolved canSeeSensitive flag.
 *
 * 403 response body is exactly `{ error: 'PERMISSION_DENIED' }` per E0-F02.
 *
 * Default `view` for omitted param:
 *   - HR_STAFF → MINE
 *   - ADMIN/HR_MANAGER → ALL
 *
 * Default `sort` and `pageSize` are server-side applied by the service.
 *
 * Reference: TASK.md v1.3 / RQ-02..RQ-17 / E0-F02 / E0-F06.
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
  type RecruiterWorkbenchPermissionContext,
} from '@/src/domains/talent/recruiter-workbench.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF']);

export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json(
        { error: e.code },
        { status: 401 },
      );
    }
    console.error('[recruiter-workbench] auth error:', e);
    return NextResponse.json(
      { error: 'INTERNAL' },
      { status: 500 },
    );
  }

  // ── 2. Role allowlist gate ──────────────────────────────────────────────
  if (!ALLOWED_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED' },
      { status: 403 },
    );
  }

  // ── 3. Read raw view BEFORE zod to gate HR_STAFF (E0-F02) ─────────────
  // We read raw query params BEFORE zod so we can reject HR_STAFF + ALL/UNASSIGNED
  // without spending any DB query or permission resolution.
  const { searchParams } = new URL(req.url);
  const rawView = searchParams.get('view') ?? undefined;
  const rawHandlerUserId = searchParams.get('handlerUserId') ?? undefined;

  // HR_STAFF authority: explicit ALL or UNASSIGNED → 403.
  // HR_STAFF max is MINE (DEC-06 / TASK.md RQ-06).
  if (ctx.role === 'HR_STAFF' && (rawView === 'ALL' || rawView === 'UNASSIGNED')) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED' },
      { status: 403 },
    );
  }

  // ── 4. Strict Zod parse — 400 BAD_QUERY, NO DB/permission calls (E0-F02) ─
  // `.strict()` on the schema rejects any unknown query key with a Zod error,
  // preventing a client typo from being silently accepted.
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

  // ── 5. Authority checks after Zod ───────────────────────────────────────
  // UNASSIGNED needs CAN_VIEW_UNASSIGNED_POOL (ADMIN/HR_MANAGER still need it).
  if (parsed.view === 'UNASSIGNED' || rawView === 'UNASSIGNED') {
    // Note: rawView is undefined here means zod parsed UNASSIGNED (not pre-rejected above).
    // We need to check permission for UNASSIGNED view — do it once with resolved perms.
    // (Handled in step 6 below.)
  }

  // HR_STAFF: foreign handlerUserId → 403 (E0-F02).
  // HR_STAFF can only filter by their own userId or omit the filter.
  if (ctx.role === 'HR_STAFF' && parsed.handlerUserId && parsed.handlerUserId !== ctx.userId) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED' },
      { status: 403 },
    );
  }

  // ── 6. Resolve effective permissions exactly once (E0-F06) ───────────────
  // After all authority checks pass, resolve permissions once and forward the
  // `canSeeSensitive` flag to the service. The service MUST NOT call
  // `resolveEffectivePermissions` itself.
  const perms = await resolveEffectivePermissions({
    userId: ctx.userId,
    role: ctx.role,
  });

  // UNASSIGNED view gate: needs CAN_VIEW_UNASSIGNED_POOL (E0-F02 / DEC-06).
  if (parsed.view === 'UNASSIGNED' && !perms.has('CAN_VIEW_UNASSIGNED_POOL')) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED' },
      { status: 403 },
    );
  }

  const permissions: RecruiterWorkbenchPermissionContext = {
    canSeeSensitive: perms.has('CAN_VIEW_WORKER_SENSITIVE'),
  };

  // ── Effective view — default per role ────────────────────────────────────
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

  // ── 7. Execute inside withDbContext (RLS GUC scoped to transaction) ──────
  const prisma = getPrisma();
  try {
    const result = await withDbContext(prisma, ctx, (tx) =>
      getRecruiterWorkbenchList(tx, ctx, filter, permissions),
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('[recruiter-workbench] service error:', e);
    return NextResponse.json(
      { error: 'INTERNAL' },
      { status: 500 },
    );
  }
}
