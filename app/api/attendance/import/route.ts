/**
 * POST /api/attendance/import — Upload attendance CSV ≤ 4.5MB
 * GET /api/attendance/import — List batches or get batch preview
 *
 * Phase 4 slice 4B STEP-11 (RQ-06).
 *
 * Auth: cookie hrp_token (Phase 1).
 * Roles: ADMIN, HR_MANAGER, HR_STAFF, PM (upload permission).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  createImportBatch,
  getBatchPreview,
  listImportBatches,
  ImportServiceError,
} from '@/src/domains/attendance/import.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UPLOAD_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM'] as const);

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!UPLOAD_ROLES.has(ctx.role as typeof UPLOAD_ROLES extends Set<infer T> ? T : never)) {
    return NextResponse.json({ error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền upload` }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'MISSING_FILE', message: 'Thiếu file upload' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const source = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') ? 'XLSX' : 'CSV';
    const projectId = (formData.get('projectId') as string | null) ?? undefined;

    const prisma = getPrisma();
    const result = await withDbContext(prisma, ctx, (tx) =>
      createImportBatch(tx, ctx, { fileBuffer, fileName, source, projectId }),
    );

    return NextResponse.json({ batch: result }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    if (e instanceof ImportServiceError) {
      const status = e.code === 'FILE_TOO_LARGE' ? 413
        : e.code === 'PARSE_ERROR' || e.code === 'NO_ROWS' ? 400 : 400;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    console.error('[api/attendance/import POST] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create import batch' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get('batchId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const take = Math.min(50, parseInt(searchParams.get('take') ?? '20', 10));
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);

  const prisma = getPrisma();

  if (batchId) {
    try {
      const result = await withDbContext(prisma, ctx, (tx) => getBatchPreview(tx, ctx, batchId));
      return NextResponse.json({ batch: result });
    } catch (e) {
      if (e instanceof ImportServiceError) {
        return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === 'NOT_FOUND' ? 404 : 400 });
      }
      if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
      console.error('[api/attendance/import GET] error:', e);
      return NextResponse.json({ error: 'INTERNAL', message: 'Failed to get batch' }, { status: 500 });
    }
  }

  try {
    const { rows, total } = await withDbContext(prisma, ctx, (tx) =>
      listImportBatches(tx, ctx, { take, skip, status: status as any }),
    );
    return NextResponse.json({ batches: rows, total, take, skip });
  } catch (e) {
    if (e instanceof AuthScopeError) return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    console.error('[api/attendance/import GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to list batches' }, { status: 500 });
  }
}
