/**
 * GET    /api/workers/[id]   — T1B worker detail (RQ-02/RQ-03)
 * PATCH  /api/workers/[id]   — T1B partial update (writer guard + dirty tracking)
 * PUT    /api/workers/[id]   — Backward-compat alias của PATCH (legacy 5-field)
 * DELETE /api/workers/[id]   — T1B ADMIN-only permanent delete với dependency sweep
 *
 * Rules (T1B business invariant):
 *   - 401 nếu thiếu auth.
 *   - 403 nếu role không thuộc viewer/writer/delete matrix.
 *   - 404 nếu Worker ngoài row scope (IDOR-safe).
 *   - 409 WORKER_NOT_DELETABLE nếu còn LaborProfile/Assignment/Ticket/...
 *   - 410 nếu stale version (CAS via expectedUpdatedAt).
 *   - PUT alias chỉ nhận 5 field legacy; PATCH nhận 26 field T1B allowlist.
 *   - POST /api/workers KHÔNG còn là entrypoint create — xem route.ts gốc
 *     (typed error 410 trỏ về /admin/labor-profiles/new).
 *
 * Race safety (RQ-04): service `updateWorkerProfile` / `deleteWorker` acquire
 * `pg_advisory_xact_lock('hrp:worker:<id>')` trong transaction.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import {
  WorkerServiceError,
  deleteWorker as serviceDeleteWorker,
  getWorkerDetail as serviceGetWorkerDetail,
  updateWorkerProfile as serviceUpdateWorkerProfile,
} from '@/src/domains/workforce/worker.service';
import { projectWorker } from '@/src/shared/auth/worker-projection';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROLE_VIEWER = new Set([
  'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'ACCOUNTANT', 'SALE', 'DIRECTOR',
]);
const ROLE_WRITER = new Set(['ADMIN', 'HR_MANAGER']);

function errorResponse(err: WorkerServiceError): NextResponse {
  const status =
    err.code === 'NOT_FOUND'
      ? 404
      : err.code === 'PERMISSION_DENIED'
        ? 403
        : err.code === 'WORKER_MASKED_INPUT_REJECTED'
          ? 422
          : err.code === 'WORKER_NOT_DELETABLE'
            ? 409
            : err.code === 'STALE_VERSION'
              ? 410
              : 400;
  return NextResponse.json(
    {
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    },
    { status },
  );
}

async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const raw = (await req.json()) as unknown;
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Body must be a JSON object');
    }
    return raw as Record<string, unknown>;
  } catch {
    throw new WorkerServiceError('INVALID_INPUT', 'Body phải là JSON object.');
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }
  if (!ROLE_VIEWER.has(ctx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: `Role ${ctx.role} không có quyền xem người lao động.` },
      { status: 403 },
    );
  }
  const { id } = await params;
  const prisma = getPrisma();
  try {
    const permissions = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
    const hasSensitivePermission = permissions.has('CAN_VIEW_WORKER_SENSITIVE');
    const detail = await withDbContext(prisma, ctx, (tx) => serviceGetWorkerDetail(tx, ctx, id));
    if (!detail) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: `Worker ${id} không tồn tại hoặc ngoài phạm vi.` },
        { status: 404 },
      );
    }
    // Project sensitive fields theo permission.
    const projected = projectWorker(detail as never, {
      hasSensitivePermission,
      action: 'DETAIL',
    });
    return NextResponse.json({ worker: { ...projected, _detail: detail } });
  } catch (e) {
    if (e instanceof WorkerServiceError) return errorResponse(e);
    if (e instanceof AuthScopeError) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: `Role ${ctx.role} không có quyền xem người lao động.` },
        { status: 403 },
      );
    }
    console.error('[api/workers/[id] GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to read worker' }, { status: 500 });
  }
}

async function handlePatch(
  req: NextRequest,
  params: Promise<{ id: string }>,
) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }
  if (!ROLE_WRITER.has(ctx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: `Role ${ctx.role} không có quyền sửa người lao động.` },
      { status: 403 },
    );
  }
  const { id } = await params;
  const body = await readJson(req);
  // T1B: actorId lấy từ ctx.userId; client KHÔNG được override.
  const input = { ...body, actorId: ctx.userId } as Record<string, unknown>;
  const prisma = getPrisma();
  try {
    const permissions = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
    const hasSensitivePermission = permissions.has('CAN_VIEW_WORKER_SENSITIVE');
    const result = await withDbContext(prisma, ctx, (tx) =>
      serviceUpdateWorkerProfile(tx, ctx, id, input as never),
    );
    // Re-read detail để trả projected DTO.
    const detail = await withDbContext(prisma, ctx, (tx) => serviceGetWorkerDetail(tx, ctx, id));
    if (!detail) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: `Worker ${id} không tồn tại.` },
        { status: 404 },
      );
    }
    const projected = projectWorker(detail as never, { hasSensitivePermission, action: 'DETAIL' });
    return NextResponse.json({
      worker: { ...projected, _detail: detail },
      updatedFields: result.updatedFields,
    });
  } catch (e) {
    if (e instanceof WorkerServiceError) return errorResponse(e);
    if (e instanceof AuthScopeError) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: `Role ${ctx.role} không có quyền sửa người lao động.` },
        { status: 403 },
      );
    }
    console.error('[api/workers/[id] PATCH] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to update worker' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handlePatch(req, params);
}

/**
 * PUT — backward-compat alias cho 5-field legacy.
 * Body KHÔNG chứa `actorId` (legacy); server ép = ctx.userId.
 * PUT chỉ nhận 5 field: fullName / phone / cccdNumber / dateOfBirth / gender.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = await readJson(req).catch((e: WorkerServiceError) => e);
  if (body instanceof WorkerServiceError) {
    return errorResponse(body);
  }
  const allowed = new Set(['fullName', 'phone', 'cccdNumber', 'dateOfBirth', 'gender']);
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (allowed.has(k)) filtered[k] = v;
  }
  // Re-build a request với body đã filter để giữ semantic PUT = legacy 5-field.
  const newReq = new NextRequest(req.url, {
    method: 'PATCH',
    headers: req.headers,
    body: JSON.stringify(filtered),
  });
  return handlePatch(newReq, params);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }
  const { id } = await params;
  if (ctx.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: `Role ${ctx.role} không có quyền xóa vĩnh viễn người lao động.` },
      { status: 403 },
    );
  }
  const idemKey = req.headers.get('x-idempotency-key') ?? undefined;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = typeof body.reason === 'string' ? body.reason : 'ADMIN permanent delete';

  const prisma = getPrisma();
  try {
    if (idemKey) {
      const { body: respBody } = await withIdempotency({
        prisma,
        route: `DELETE:/api/workers/${id}`,
        actorId: ctx.userId,
        key: idemKey,
        requestBody: { id, reason },
        handler: async () => {
          const result = await withDbContext(prisma, ctx, (tx) =>
            serviceDeleteWorker(tx, ctx, id, { actorId: ctx.userId, reason }),
          );
          return { body: { ok: true, id: result.id, deletedAt: result.deletedAt } };
        },
      });
      return NextResponse.json(respBody);
    }
    const result = await withDbContext(prisma, ctx, (tx) =>
      serviceDeleteWorker(tx, ctx, id, { actorId: ctx.userId, reason }),
    );
    return NextResponse.json({ ok: true, id: result.id, deletedAt: result.deletedAt });
  } catch (e) {
    if (e instanceof WorkerServiceError) return errorResponse(e);
    if (e instanceof AuthScopeError) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: `Role ${ctx.role} không có quyền xóa vĩnh viễn.` },
        { status: 403 },
      );
    }
    console.error('[api/workers/[id] DELETE] error:', e);
    return NextResponse.json(
      {
        error: 'INTERNAL',
        message:
          'Hệ thống gặp sự cố khi xóa người lao động. Vui lòng thử lại hoặc liên hệ quản trị viên.',
      },
      { status: 500 },
    );
  }
}
