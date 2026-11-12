/**
 * GET /api/workers/me — Phase 2 / RQ-06 / DEC-07
 *
 * Worker self-profile: chỉ role WORKER mới đọc được.
 * Role khác → 403.
 *
 * Auth: cookie hrp_token (Phase 1).
 * 401: thiếu/sai token.
 * 403: role không phải WORKER.
 * 404: worker không tồn tại (đã tạo user nhưng chưa có worker profile — edge case).
 *
 * L1 + L2 đều pass. Response chỉ chứa CHÍNH MÌNH.
 * T1A Android contract (TASK DEC-03): response thêm `assignment` = assignment
 * hiện hành (ACTIVE) của worker — employeeCode/position/location truy nguyên từ
 * Assignment → Project/Site/Slot; null khi không có assignment.
 * V5-M1-09A (DEC-05): action='SELF_PROFILE' → WORKER LUÔN thấy CCCD/bank của chính mình
 *   (canSeeSensitive=true, không cần CAN_VIEW_WORKER_SENSITIVE). cccdChipData vẫn LUÔN
 *   bị omit khỏi HTTP kể cả self. Response đi qua allowlist DTO (projectWorker).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Gender, MaritalStatus, Prisma } from '@prisma/client';
import { getPrisma } from '@/src/lib/db';
import { normalizePhone } from '@/src/domains/applications/apply-helpers';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { projectWorker } from '@/src/shared/auth/worker-projection';
import { loadWorkerSelfSummaryInTx, type WorkerAssignmentSummary } from '@/src/shared/auth/worker-assignment-summary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FORBIDDEN_SELF_EDIT_KEYS = new Set([
  'id',
  'userId',
  'accountUserId',
  'cccdNumber',
  'profileStatus',
  'employmentStatus',
  'riskStatus',
  'ownerId',
  'assignedToId',
  'managerId',
  'selfEditedFields',
  'assignments',
  'projectId',
]);

const selfEditWorkerSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().min(9).max(20).nullable().optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
    maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']).nullable().optional(),
    permanentAddress: z.string().trim().max(300).nullable().optional(),
    currentAddress: z.string().trim().max(300).nullable().optional(),
    hometown: z.string().trim().max(200).nullable().optional(),
    ethnicGroup: z.string().trim().max(100).nullable().optional(),
    religion: z.string().trim().max(100).nullable().optional(),
    bankAccount: z.string().trim().max(64).nullable().optional(),
    bankName: z.string().trim().max(120).nullable().optional(),
    bankBranch: z.string().trim().max(120).nullable().optional(),
    taxCode: z.string().trim().max(32).nullable().optional(),
    insuranceCode: z.string().trim().max(32).nullable().optional(),
    selfieImageUrl: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export async function GET(req: NextRequest) {
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
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to build auth context' },
      { status: 500 },
    );
  }

  // Role gate — chỉ WORKER
  if (ctx.role !== 'WORKER') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Endpoint chỉ dành cho role WORKER' },
      { status: 403 },
    );
  }

  // Worker phải có workerId trong session (lookup qua accountUserId trong getAuthContext)
  if (!ctx.workerId) {
    return NextResponse.json(
      { error: 'WORKER_PROFILE_NOT_FOUND', message: 'Worker profile chưa được tạo' },
      { status: 404 },
    );
  }

  const prisma = getPrisma();

  let row;
  let assignment: WorkerAssignmentSummary | null = null;
  let phoneVerified = false;
  let profileStatus: string | null = null;
  let employmentStatus: string | null = null;
  let hasConfiguredSiteGps = false;
  try {
    row = await withDbContext(prisma, ctx, async (tx) => {
      // L2 RLS qua GUC. L1: chỉ chính mình, không cần scope registry.
      const workerRow = await tx.worker.findUnique({
        where: { id: ctx.workerId },
      });
      // T1A Android contract (TASK DEC-03): assignment hiện hành đọc trong CÙNG
      // transaction GUC self — employeeCode/position/location truy nguyên từ
      // Assignment → Project/Site/Slot; KHÔNG tự gán department (null phía client route).
      if (workerRow) {
        const summary = await loadWorkerSelfSummaryInTx(tx, ctx.userId);
        assignment = summary?.assignment ?? null;
        profileStatus = summary?.profileStatus ?? null;
        employmentStatus = summary?.employmentStatus ?? null;
        hasConfiguredSiteGps = Boolean(summary?.assignment?.sites.some((site) =>
          site.latitude !== null && site.longitude !== null && site.geoConfirmedAt !== null,
        ));
      }
      const user = await tx.user.findUnique({ where: { id: ctx.userId }, select: { phoneVerified: true } });
      phoneVerified = Boolean(user?.phoneVerified);
      return workerRow;
    });
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json(
        { error: e.code, message: e.message },
        { status: 403 },
      );
    }
    console.error('[api/workers/me] query error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to query worker' },
      { status: 500 },
    );
  }

  if (!row) {
    return NextResponse.json(
      { error: 'WORKER_NOT_FOUND', message: 'Worker không tồn tại' },
      { status: 404 },
    );
  }

  // SELF_PROFILE (DEC-05): WORKER luôn thấy CCCD/bank của CHÍNH MÌNH (canSeeSensitive=true),
  // KHÔNG phụ thuộc CAN_VIEW_WORKER_SENSITIVE; cccdChipData vẫn LUÔN omit.
  const effPerms = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
  const hasSensitive = effPerms.has('CAN_VIEW_WORKER_SENSITIVE');

  const projected = projectWorker(row, { hasSensitivePermission: hasSensitive, action: 'SELF_PROFILE' });
  const hasActiveAssignment = Boolean(assignment);
  const siteGeofenceNotConfigured = hasActiveAssignment && !hasConfiguredSiteGps;
  return NextResponse.json({
    worker: projected,
    assignment,
    mobileAccess: {
      phoneVerified,
      ...(typeof ctx.mustChangePassword === 'boolean'
        ? { mustChangePassword: ctx.mustChangePassword }
        : {}),
      hasActiveAssignment,
      hasConfiguredSiteGps,
      siteGeofenceNotConfigured,
      canCheckIn:
        !ctx.mustChangePassword &&
        profileStatus === 'VERIFIED' &&
        employmentStatus === 'ACTIVE' &&
        hasActiveAssignment &&
        hasConfiguredSiteGps,
    },
  });
}

/**
 * PATCH /api/workers/me — hrp-bi-worker-sync-v1 (RQ-08 / DEC-08 / AC-04)
 * Cho phép NLĐ tự cập nhật các trường thông tin cá nhân trong allowlist,
 * chặn sửa cccdNumber / trạng thái / phân công, và ghi nhận tên trường vào
 * `workers.self_edited_fields` để tiến trình đồng bộ BI không ghi đè.
 */
export async function PATCH(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (ctx.role !== 'WORKER') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Endpoint chỉ dành cho role WORKER' },
      { status: 403 },
    );
  }

  if (ctx.mustChangePassword) {
    return NextResponse.json(
      {
        error: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Vui lòng đổi mật khẩu ban đầu trước khi cập nhật hồ sơ.',
      },
      { status: 403 },
    );
  }

  if (!ctx.workerId) {
    return NextResponse.json(
      { error: 'WORKER_PROFILE_NOT_FOUND', message: 'Worker profile chưa được tạo' },
      { status: 404 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body JSON không hợp lệ' }, { status: 400 });
  }

  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là object' }, { status: 400 });
  }

  for (const key of Object.keys(rawBody as Record<string, unknown>)) {
    if (FORBIDDEN_SELF_EDIT_KEYS.has(key)) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN_FIELD',
          message: `Không được phép tự sửa trường "${key}".`,
        },
        { status: 400 },
      );
    }
  }

  const parsed = selfEditWorkerSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Dữ liệu cập nhật hồ sơ không hợp lệ.',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const editedKeys = Object.keys(payload).filter(
    (k) => payload[k as keyof typeof payload] !== undefined,
  );
  if (editedKeys.length === 0) {
    return NextResponse.json(
      { error: 'EMPTY_UPDATE', message: 'Không có trường nào được gửi để cập nhật.' },
      { status: 400 },
    );
  }

  const prisma = getPrisma();

  try {
    const updatedEntity = await withDbContext(prisma, ctx, async (tx) => {
      const current = await tx.worker.findUnique({
        where: { id: ctx.workerId },
        select: { id: true, selfEditedFields: true },
      });
      if (!current) return null;

      const mergedEditedFields = Array.from(
        new Set([...(current.selfEditedFields ?? []), ...editedKeys]),
      );

      const updateData: Prisma.WorkerUpdateInput = {
        selfEditedFields: mergedEditedFields,
      };

      if (payload.fullName !== undefined) updateData.fullName = payload.fullName;
      if (payload.phone !== undefined) {
        updateData.phone = payload.phone ? normalizePhone(payload.phone) : null;
      }
      if (payload.dateOfBirth !== undefined) {
        updateData.dateOfBirth = payload.dateOfBirth
          ? new Date(`${payload.dateOfBirth}T00:00:00.000Z`)
          : null;
      }
      if (payload.gender !== undefined) {
        updateData.gender = payload.gender as Gender | null;
      }
      if (payload.maritalStatus !== undefined) {
        updateData.maritalStatus = payload.maritalStatus as MaritalStatus | null;
      }
      if (payload.permanentAddress !== undefined) updateData.permanentAddress = payload.permanentAddress;
      if (payload.currentAddress !== undefined) updateData.currentAddress = payload.currentAddress;
      if (payload.hometown !== undefined) updateData.hometown = payload.hometown;
      if (payload.ethnicGroup !== undefined) updateData.ethnicGroup = payload.ethnicGroup;
      if (payload.religion !== undefined) updateData.religion = payload.religion;
      if (payload.bankAccount !== undefined) updateData.bankAccount = payload.bankAccount;
      if (payload.bankName !== undefined) updateData.bankName = payload.bankName;
      if (payload.bankBranch !== undefined) updateData.bankBranch = payload.bankBranch;
      if (payload.taxCode !== undefined) updateData.taxCode = payload.taxCode;
      if (payload.insuranceCode !== undefined) updateData.insuranceCode = payload.insuranceCode;
      if (payload.selfieImageUrl !== undefined) updateData.selfieImageUrl = payload.selfieImageUrl;

      return tx.worker.update({
        where: { id: ctx.workerId },
        data: updateData,
      });
    });

    if (!updatedEntity) {
      return NextResponse.json(
        { error: 'WORKER_NOT_FOUND', message: 'Worker không tồn tại' },
        { status: 404 },
      );
    }

    const effPerms = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
    const hasSensitive = effPerms.has('CAN_VIEW_WORKER_SENSITIVE');
    const projected = projectWorker(updatedEntity, {
      hasSensitivePermission: hasSensitive,
      action: 'SELF_PROFILE',
    });

    return NextResponse.json({
      ok: true,
      worker: projected,
      selfEditedFields: updatedEntity.selfEditedFields ?? [],
    });
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    const code =
      typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
    if (code === 'P2002') {
      return NextResponse.json(
        {
          error: 'DUPLICATE_VALUE',
          message: 'Thông tin vừa nhập (SĐT, MST hoặc mã BHXH) đã được sử dụng trên hồ sơ khác.',
        },
        { status: 409 },
      );
    }
    console.error('[api/workers/me PATCH] error:', { code });
    return NextResponse.json({ error: 'INTERNAL', message: 'Không thể cập nhật hồ sơ' }, { status: 500 });
  }
}
