/**
 * GET  /api/workers — M5 Admin Master Data (RQ-02)
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
import { projectWorkerList } from '@/src/shared/auth/worker-projection';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

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

  const where: Record<string, unknown> = {};
  if (finalStatus) {
    if (!['NONE', 'ACTIVE', 'SUSPENDED', 'TERMINATED'].includes(finalStatus)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid employmentStatus' }, { status: 400 });
    }
    where.employmentStatus = finalStatus;
  }
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const permissions = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
    const hasSensitivePermission = permissions.has('CAN_VIEW_WORKER_SENSITIVE');
    // RQ-02/RQ-04: L1 buildWorkerScope (row scope theo 13-role matrix) + L2 RLS GUC
    // trong CÙNG transaction. Root (ADMIN/HR_MANAGER/DIRECTOR) passthrough L1 → thấy
    // toàn bộ; HR_STAFF/PM/SALE bị inject WHERE scope; role không khai báo scope Worker
    // (MKT/ACCOUNTANT/EMPLOYEE) → L1 throw AuthScopeError → 403 (deny-by-default, DEC-08).
    //
    // T1C admin-ux-hotfix 2: 4 cột vận hành mới trên /admin/workers (DEC-03).
    // Lấy từ quan hệ chuẩn: Worker.assignments → Project.pmUser → User.name; Worker.episodes
    // cho ngày làm đầu tiên; CommissionLedger.ctvId cho CTV hưởng hoa hồng. KHÔNG qua
    // projectWorker allowlist (cột mới = dữ liệu vận hành, không phải field nhạy cảm
    // của Worker); KHÔNG suy diễn từ Worker.createdAt / Worker.assignedToId.
    const { rows, total, enrichment } = await withAuthorizedDbReadOnly(prisma, ctx, async (tx) => {
      const [r, t] = await Promise.all([
        tx.worker.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
          skip,
          select: {
            id: true,
            userId: true,
            fullName: true,
            employmentStatus: true,
            phone: true,
            createdAt: true,
          },
        }),
        tx.worker.count({ where }),
      ]);
      // Enrichment (parallel) — bound to the listed worker IDs only.
      const ids = r.map(w => w.id);
      const enrichment = await enrichWorkerList(tx, ids);
      return { rows: r, total: t, enrichment };
    });
    return NextResponse.json({
      workers: projectWorkerList(rows, { hasSensitivePermission, action: 'LIST' }),
      enrichment,
      total,
      take,
      skip,
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

/**
 * T1C admin-ux-hotfix 2 — DEC-03: enrich 4 cột vận hành cho /admin/workers.
 *
 * - currentJob: ProjectAssignment ACTIVE mới nhất theo validFrom → Project.code/name.
 *   Nếu không có ACTIVE thì fallback sang dòng gần đây nhất (PAUSED/PLANNED) để
 *   operator thấy được "đang dự án nào" dù chưa ACTIVE — đúng với thực tế vận hành
 *   (Worker đã onboard nhưng chờ ngày bắt đầu). Vẫn KHÔNG suy diễn từ createdAt.
 * - firstJobStartedAt: MIN(EmploymentEpisode.startedAt) hoặc MIN(ProjectAssignment.validFrom)
 *   qua Worker — bỏ qua null. KHÔNG fallback Worker.createdAt (DEC-09).
 * - pmName: Project.pmUser.name (lookup User). null khi pmUserId null.
 * - commissionBeneficiaryName: CTV/User (CommissionLedger.ctvId) có dòng CREDIT mới nhất
 *   gắn Worker. KHÔNG fallback Worker.assignedToId (DEC-09).
 *
 * Trả về Map<workerId, EnrichmentRow>. Tất cả field nullable khi thiếu data.
 */
async function enrichWorkerList(
  tx: import('@prisma/client').Prisma.TransactionClient,
  ids: string[],
): Promise<Record<string, EnrichmentRow>> {
  const empty: Record<string, EnrichmentRow> = {};
  if (ids.length === 0) return empty;

  // (a) Active assignment + Project + PM.
  // Lấy 1 assignment mới nhất / Worker (ACTIVE ưu tiên; nếu không có → bất kỳ).
  const assignments = await tx.projectAssignment.findMany({
    where: { workerId: { in: ids } },
    orderBy: [{ status: 'asc' }, { validFrom: 'desc' }],
    select: {
      workerId: true,
      status: true,
      validFrom: true,
      project: {
        select: {
          id: true,
          code: true,
          name: true,
          pmUserId: true,
          pmUser: { select: { name: true } },
        },
      },
    },
  });

  // Group by worker, ưu tiên ACTIVE trước rồi mới đến các status khác.
  const byWorker = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const list = byWorker.get(a.workerId) ?? [];
    list.push(a);
    byWorker.set(a.workerId, list);
  }

  // (b) First episode / first assignment date.
  // EmploymentEpisode.startedAt là non-nullable trong schema, nên không cần
  // filter not-null — chỉ cần theo workerId. workerId có thể null
  // (episode gắn laborProfile nhưng chưa link Worker) → bỏ qua.
  const episodes = await tx.employmentEpisode.findMany({
    where: { workerId: { in: ids, not: null } },
    select: { workerId: true, startedAt: true },
  });
  const assignmentDates = assignments
    .map(a => ({ workerId: a.workerId, validFrom: a.validFrom }))
    .filter(d => d.validFrom instanceof Date);

  const firstDateByWorker = new Map<string, Date>();
  function consider(workerId: string, d: Date | null | undefined) {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
    const cur = firstDateByWorker.get(workerId);
    if (!cur || d.getTime() < cur.getTime()) firstDateByWorker.set(workerId, d);
  }
  for (const e of episodes) {
    if (!e.workerId) continue;
    consider(e.workerId, e.startedAt);
  }
  for (const a of assignmentDates) consider(a.workerId, a.validFrom);

  // (c) Commission beneficiary (latest CREDIT ledger for worker).
  // CommissionLedger.ctvId là non-nullable. workerId có thể null
  // (PERCENT_OF_REVENUE không gắn worker) — lọc ra khỏi where.
  const ledgers = await tx.commissionLedger.findMany({
    where: { workerId: { in: ids, not: null } },
    orderBy: { createdAt: 'desc' },
    select: { workerId: true, ctvId: true },
  });
  // resolve CTV name (User).
  const ctvIds = Array.from(new Set(ledgers.map(l => l.ctvId).filter((v): v is string => Boolean(v))));
  const ctvMap = new Map<string, string | null>();
  if (ctvIds.length > 0) {
    const users = await tx.user.findMany({ where: { id: { in: ctvIds } }, select: { id: true, name: true } });
    for (const u of users) ctvMap.set(u.id, u.name);
  }
  // Pick first (latest) per worker.
  const commissionByWorker = new Map<string, { id: string; name: string | null }>();
  for (const l of ledgers) {
    if (!l.ctvId) continue;
    if (!l.workerId) continue;
    if (commissionByWorker.has(l.workerId)) continue;
    commissionByWorker.set(l.workerId, { id: l.ctvId, name: ctvMap.get(l.ctvId) ?? null });
  }

  // Build enrichment map.
  const out: Record<string, EnrichmentRow> = {};
  for (const id of ids) {
    const list = byWorker.get(id) ?? [];
    // Prefer ACTIVE.
    const active = list.find(a => a.status === 'ACTIVE');
    const pick = active ?? list[0];
    const first = firstDateByWorker.get(id) ?? null;
    const ctv = commissionByWorker.get(id) ?? null;
    out[id] = {
      currentJob: pick
        ? {
            projectId: pick.project.id,
            projectCode: pick.project.code,
            projectName: pick.project.name,
            assignmentStatus: pick.status,
          }
        : null,
      firstJobStartedAt: first ? first.toISOString() : null,
      pmName: pick?.project.pmUser?.name ?? null,
      commissionBeneficiary:
        ctv != null ? { userId: ctv.id, name: ctv.name } : null,
    };
  }
  return out;
}

interface EnrichmentRow {
  currentJob: {
    projectId: string;
    projectCode: string;
    projectName: string;
    assignmentStatus: string;
  } | null;
  firstJobStartedAt: string | null;
  pmName: string | null;
  commissionBeneficiary: { userId: string; name: string | null } | null;
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
