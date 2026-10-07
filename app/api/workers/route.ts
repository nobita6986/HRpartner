/**
 * GET  /api/workers — M5 Admin Master Data (RQ-02) — T1B-OPS enriched.
 * POST /api/workers — DEPRECATED T1B: tạo Worker rời rạc KHÔNG còn là entrypoint.
 *
 * Lý do (T1B business invariant): Worker chỉ tồn tại qua conversion flow
 * (LaborProfile.workerId). Người chưa chuyển đổi vẫn là Hồ sơ tiếp nhận
 * (LaborProfile), không phải Worker. Tạo Worker đứt lìa khỏi nguồn
 * tiếp nhận sẽ phá vỡ invariant `linkLaborProfileWorker` của PR #107.
 *
 * UI list `/admin/workers` đã đổi CTA sang `+ Tiếp nhận người lao động`
 * → `/admin/labor-profiles/new`. POST trả về `410 GONE` với typed error
 * `WORKER_LEGACY_CREATE_DISABLED` để client (nếu còn) nhận machine-readable
 * code mà KHÔNG thử lại với payload cũ.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { listWorkersForAdmin } from '@/src/domains/workforce/worker.service';
import { maskPhone } from '@/src/shared/privacy/mask';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VIEWER_ROLES = new Set([
  'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'ACCOUNTANT', 'SALE', 'DIRECTOR',
]);

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

  if (!VIEWER_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen xem nhan vien.' },
      { status: 403 },
    );
  }

  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get('take') ?? '50', 10), 200);
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);
  const employmentStatus = searchParams.get('employmentStatus');
  const statusParam = searchParams.get('status');
  const finalStatus = employmentStatus ?? statusParam ?? undefined;
  const search = searchParams.get('search') ?? undefined;

  // DEC-T1B-OPS-04: enriched service dùng canonical data sources (Episode /
  // ProjectAssignment / SourceClaim) cho 6 cột bổ sung. `search` hiện
  // không dùng ở UI — reject sớm để caller biết limit.
  if (search) {
    return NextResponse.json(
      { error: 'UNSUPPORTED', message: 'Tìm kiếm chưa được hỗ trợ ở bảng Người lao động. Dùng filter trạng thái.' },
      { status: 400 },
    );
  }
  if (finalStatus && !['NONE', 'ACTIVE', 'SUSPENDED', 'TERMINATED'].includes(finalStatus)) {
    return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid employmentStatus' }, { status: 400 });
  }

  try {
    const permissions = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
    const hasSensitivePermission = permissions.has('CAN_VIEW_WORKER_SENSITIVE');
    // T1B-OPS: enriched list 6 columns (currentProject, firstWorkDate,
    // currentProjectManager, handler, referrer, commissionBeneficiary).
    const result = await withAuthorizedDbReadOnly(prisma, ctx, async (tx) => {
      return listWorkersForAdmin(tx as never, ctx as never, {
        status: finalStatus ?? null,
        take,
        skip,
      });
    });

    // T1B-OPS: mask phone nếu caller không có CAN_VIEW_WORKER_SENSITIVE.
    const maskedWorkers = result.workers.map((w) => ({
      ...w,
      phone: hasSensitivePermission ? w.phone : (w.phone ? maskPhone(w.phone) : null),
    }));
    return NextResponse.json({
      workers: maskedWorkers,
      total: result.total,
      take: result.take,
      skip: result.skip,
    });
  } catch (err) {
    if (err instanceof AuthScopeError) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Role ' + ctx.role + ' khong co quyen xem nhan vien.' },
        { status: 403 },
      );
    }
    console.error('[api/workers] query error:', err);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to query workers' }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  // T1B: POST /api/workers là entrypoint legacy đã đóng. Trả 410 GONE với
  // typed error + hướng dẫn cụ thể. Vẫn ép auth để caller biết 401 (chưa
  // đăng nhập) khác 410 (đã đăng nhập nhưng endpoint đã đóng).
  let ctx;
  try {
    ctx = await getAuthContext(_req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }
  return NextResponse.json(
    {
      error: 'WORKER_LEGACY_CREATE_DISABLED',
      message:
        'Tạo Worker rời rạc đã đóng từ T1B. Worker chỉ tồn tại qua conversion flow: ' +
        'tạo Hồ sơ tiếp nhận tại POST /api/labor-profiles rồi dùng linkLaborProfileWorker ' +
        'để chuyển thành Worker. UI: mở /admin/labor-profiles/new.',
      details: {
        redirectTo: '/admin/labor-profiles/new',
        legacyEndpoint: 'POST /api/workers',
        since: 'T1B — PRE-P2 HOTFIX 2026-10-06',
      },
    },
    { status: 410, headers: { Allow: 'GET' } },
  );
  // Reference unused ctx to silence lint.
  void ctx;
}