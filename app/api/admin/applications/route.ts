/**
 * GET /api/admin/applications — MP-2 STEP-04 (RQ-05, DEC-06).
 *
 * Authenticated HR/Sale application queue. Runs inside `withDbContext` so every
 * query is RLS-scoped by the caller's tx-local GUC. The service
 * (`listApplications`) is the primary DEC-06 role gate and raises a stable
 * FORBIDDEN(403) for non-queue roles; RLS is the backstop. No definer boundary.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  listApplications,
  AdminApplicationError,
  type ApplicationSource,
  type QueueFilters,
} from '@/src/domains/applications/application-queue.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCES = new Set<ApplicationSource>(['PUBLIC', 'VENDOR', 'CTV']);

function parseIntOrUndefined(v: string | null): number | undefined {
  if (v == null || v.trim() === '') return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

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

  const { searchParams } = new URL(req.url);
  const rawSource = searchParams.get('source');
  const filters: QueueFilters = {
    status: searchParams.get('status') ?? undefined,
    slotId: searchParams.get('slotId') ?? undefined,
    projectId: searchParams.get('projectId') ?? undefined,
    source: rawSource && SOURCES.has(rawSource as ApplicationSource) ? (rawSource as ApplicationSource) : undefined,
    q: searchParams.get('q') ?? undefined,
    take: parseIntOrUndefined(searchParams.get('take')),
    skip: parseIntOrUndefined(searchParams.get('skip')),
  };

  const prisma = getPrisma();
  try {
    const { rows, total } = await withDbContext(prisma, ctx, (tx) => listApplications(tx, ctx, filters));
    return NextResponse.json({ applications: rows, total });
  } catch (e) {
    if (e instanceof AdminApplicationError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.httpStatus });
    }
    console.error('[api/admin/applications GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list applications' }, { status: 500 });
  }
}
