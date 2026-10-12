/**
 * app/api/projects/[id]/route.ts — M7 Admin Projects CRUD + PRE-P2 HOTFIX.
 *
 * GET: (route handler GET hiện không tồn tại — list qua `/api/projects`.)
 *
 * PUT  /api/projects/[id]   — Sửa Dự án (ADMIN/HR_MANAGER/PM).
 *                             Validation: strict allowlist qua
 *                             `validateProjectUpdateInput` (date, quota, status).
 *                             Không nhận field ngoài contract; tiếng Việt error.
 * PATCH /api/projects/[id]/status — KHÔNG có (PATCH /api/projects/[id] xử lý).
 *
 * PATCH /api/projects/[id]  — Chuyển trạng thái (ACTIVE/PAUSED/COMPLETED/CANCELLED).
 *                             State machine + terminal guard. Idempotency key
 *                             để retry an toàn.
 * DELETE /api/projects/[id] — Xoá vĩnh viễn (CHỈ ADMIN). Idempotency key bắt buộc.
 *                             Quét đầy đủ relation; có phụ thuộc ⇒ 409
 *                             PROJECT_NOT_DELETABLE + Vietnamese guidance
 *                             "Hoàn thành/Huỷ dự án".
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext, type AuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import {
  PROJECT_DELETE_ROLES,
  PROJECT_STATUSES,
  PROJECT_UPDATE_ROLES,
  ProjectManagementServiceError,
  deleteProject,
  updateProjectStatus,
  validateProjectUpdateInput,
  type ProjectLifecycleStatus,
} from '@/src/domains/crm/project-management.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = new Set<string>(['ADMIN', 'PM', 'HR_MANAGER']);
const UPDATE_STATUS_ROLES = new Set<string>(PROJECT_UPDATE_ROLES);
const DELETE_ROLES = new Set<string>(PROJECT_DELETE_ROLES);

/**
 * GET /api/projects/[id] — chi tiết Dự án (cho client quản trị).
 * Mirror role gate của GET /api/projects list (ADMIN/HR_MANAGER/HR_STAFF/
 * PM/ACCOUNTANT/DIRECTOR). 401/403 fail-closed như các route khác.
 */
export async function GET(req: NextRequest) {
  // Implement trong route này cho UI quản trị; route GET ở đây là tiện ích
  // thuần read-only, dùng khi /api/projects/[id] cần lấy detail không qua
  // Server Component. Có thể bỏ nếu không cần — hiện tại chưa được dùng.
  // Giữ placeholder để tránh Next.js báo thiếu handler.
  return NextResponse.json({ error: 'NOT_FOUND', message: 'Method not implemented' }, { status: 404 });
}

/**
 * PUT /api/projects/[id] — Sửa Dự án.
 * Validation chặt (allowlist), không nhận field ngoài contract. Dates,
 * quota, status validate qua `validateProjectUpdateInput`.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx: AuthContext | undefined;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!ctx || !ADMIN_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: `Vai trò ${ctx.role} không có quyền sửa dự án.` },
      { status: 403 },
    );
  }

  const { id } = await params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON' }, { status: 400 });
  }

  const parsed = validateProjectUpdateInput(raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'VALIDATION', message: parsed.error },
      { status: 400 },
    );
  }

  const input = parsed.value;

  const prisma = getPrisma();
  try {
    const project = await withDbContext(prisma, ctx, async (tx) => {
      let newClientCompanyName: string | null | undefined = undefined;
      if (input.clientCompanyId !== undefined) {
        const company = await tx.clientCompany.findUnique({
          where: { id: input.clientCompanyId },
          select: { name: true },
        });
        newClientCompanyName = company?.name ?? undefined;
      }

      return tx.project.update({
        where: { id },
        // Spread optional fields: validation layer đã chuẩn hoá allowlist
        // và ISO-date round-trip; cast sang `Prisma.ProjectUncheckedUpdateInput`
        // để TS cho phép spread `{ clientCompanyId?: string | undefined }` (đã
        // được guard trong service) mà không khiến `clientCompanyId` (required
        // trong schema) bị ép cứng undefined.
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.clientCompanyId !== undefined && { clientCompanyId: input.clientCompanyId }),
          ...(newClientCompanyName !== undefined && { clientCompanyName: newClientCompanyName }),
          ...(input.pmUserId !== undefined && { pmUserId: input.pmUserId }),
          ...(input.siteAddress !== undefined && { siteAddress: input.siteAddress }),
          ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
          ...(input.endDate !== undefined && {
            endDate: input.endDate ? new Date(input.endDate) : null,
          }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.quota !== undefined && { quota: input.quota }),
        } as Prisma.ProjectUncheckedUpdateInput,
      });
    });
    return NextResponse.json({ project });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: `Không tìm thấy dự án ${id} hoặc nằm ngoài phạm vi truy cập.` },
        { status: 404 },
      );
    }
    console.error('[api/projects/[id] PUT] error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Không thể cập nhật dự án.' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id] — Chuyển trạng thái (RQ-04, RQ-08).
 *
 * Body: `{ status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' }`.
 *
 * - ADMIN/HR_MANAGER/PM (mirror ADMIN_ROLES ở POST/PUT).
 * - State machine: không transition ngược từ terminal
 *   (COMPLETED/CANCELLED).
 * - Cùng status (no-op) → trả về row hiện tại, idempotent.
 * - Idempotency qua `withIdempotency`: cùng key + cùng payload → replay;
 *   cùng key + khác payload → 409 IDEMPOTENCY_CONFLICT.
 *
 * 200: `{ project: { id, status } }`
 * 400: INVALID_BODY | VALIDATION | INVALID_TRANSITION
 * 403: FORBIDDEN
 * 404: NOT_FOUND
 * 409: IDEMPOTENCY_CONFLICT
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx: AuthContext | undefined;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!ctx || !UPDATE_STATUS_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: `Vai trò ${ctx.role} không có quyền chuyển trạng thái dự án.` },
      { status: 403 },
    );
  }

  const { id } = await params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON' }, { status: 400 });
  }

  const body = (raw ?? {}) as Record<string, unknown>;
  const status = body.status;
  if (typeof status !== 'string' || !(PROJECT_STATUSES as ReadonlyArray<string>).includes(status)) {
    return NextResponse.json(
      {
        error: 'VALIDATION',
        message: `Trường "status" phải là một trong: ${PROJECT_STATUSES.join(', ')}.`,
      },
      { status: 400 },
    );
  }

  const targetStatus = status as ProjectLifecycleStatus;

  const prisma = getPrisma();
  const idempotencyKey = req.headers.get('x-idempotency-key') ?? '';

  const runOnce = async () => {
    const updated = await withDbContext(prisma, ctx, (tx) =>
      updateProjectStatus(tx, ctx, id, targetStatus),
    );
    return { body: { project: updated }, statusCode: 200 };
  };

  try {
    if (!idempotencyKey) {
      const result = await runOnce();
      return NextResponse.json(result.body, { status: result.statusCode });
    }
    const result = await withIdempotency({
      prisma,
      route: `PATCH:/api/projects/${id}/status`,
      actorId: ctx.userId,
      key: idempotencyKey,
      requestBody: { status: targetStatus },
      handler: runOnce,
    });
    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (e) {
    if (e instanceof ProjectManagementServiceError) {
      return mapProjectManagementError(e);
    }
    if (e instanceof Error && e.name === 'IdempotencyConflictError') {
      return NextResponse.json(
        { error: 'IDEMPOTENCY_CONFLICT', message: e.message },
        { status: 409 },
      );
    }
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/projects/[id] PATCH] error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Không thể chuyển trạng thái dự án.' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[id] — Xoá vĩnh viễn (RQ-05..RQ-07).
 *
 * - CHỈ ADMIN.
 * - Idempotency key BẮT BUỘC (chống double-click; khớp với pattern
 *   `deleteStaffingOrder` của order.service).
 * - Service scan 4 relation blocking (StaffingOrder, CandidateSubmission,
 *   ProjectAssignment, Site) dưới advisory lock. Có bất kỳ relation > 0
 *   ⇒ 409 PROJECT_NOT_DELETABLE + Vietnamese guidance "Hoàn thành/Huỷ dự án".
 * - 404 fail-closed khi project không tồn tại / ngoài scope.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx: AuthContext | undefined;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!ctx || !DELETE_ROLES.has(ctx.role)) {
    return NextResponse.json(
      {
        error: 'FORBIDDEN',
        message: 'Chỉ Quản trị viên mới có quyền xoá vĩnh viễn dự án.',
      },
      { status: 403 },
    );
  }

  const { id } = await params;
  const idempotencyKey = req.headers.get('x-idempotency-key') ?? '';

  if (!idempotencyKey) {
    return NextResponse.json(
      {
        error: 'VALIDATION',
        message: 'Thiếu header x-idempotency-key cho thao tác xoá vĩnh viễn.',
      },
      { status: 400 },
    );
  }

  const prisma = getPrisma();

  try {
    const result = await withIdempotency({
      prisma,
      route: `DELETE:/api/projects/${id}`,
      actorId: ctx.userId,
      key: idempotencyKey,
      requestBody: { _delete: true, projectId: id },
      handler: async () => {
        const deleted = await withDbContext(prisma, ctx, (tx) =>
          deleteProject(tx, ctx, id),
        );
        return { body: { project: deleted }, statusCode: 200 };
      },
    });
    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (e) {
    if (e instanceof ProjectManagementServiceError) {
      return mapProjectManagementError(e);
    }
    if (e instanceof Error && e.name === 'IdempotencyConflictError') {
      return NextResponse.json(
        { error: 'IDEMPOTENCY_CONFLICT', message: e.message },
        { status: 409 },
      );
    }
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/projects/[id] DELETE] error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Không thể xoá dự án.' },
      { status: 500 },
    );
  }
}

/**
 * Map ProjectManagementServiceError → HTTP response. Typed error codes:
 *   - NOT_FOUND          → 404
 *   - PERMISSION_DENIED  → 403
 *   - INVALID_TRANSITION → 400 (state machine guard — UI sẽ chặn trước)
 *   - PROJECT_NOT_DELETABLE → 409 (typed — UI hiển thị guidance)
 *   - VALIDATION         → 400
 */
function mapProjectManagementError(e: ProjectManagementServiceError): NextResponse {
  switch (e.code) {
    case 'NOT_FOUND':
      return NextResponse.json({ error: e.code, message: e.message }, { status: 404 });
    case 'PERMISSION_DENIED':
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    case 'PROJECT_NOT_DELETABLE':
      return NextResponse.json({ error: e.code, message: e.message }, { status: 409 });
    case 'INVALID_TRANSITION':
    case 'VALIDATION':
      return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    default:
      return NextResponse.json(
        { error: 'INTERNAL', message: e.message ?? 'Lỗi không xác định' },
        { status: 500 },
      );
  }
}