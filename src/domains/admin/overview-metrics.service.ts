/**
 * overview-metrics.service.ts — hrp-v6-admin-overview-dashboard (vòng đầu, READ-ONLY).
 *
 * Trả về 3 KPI cards cho trang `/admin`:
 *  - KPI-1: JobOpening.status = 'OPEN' (đơn tuyển đang mở)
 *  - KPI-2: CandidateSubmission.status = 'NEW' (ứng viên mới)
 *  - KPI-3: Ticket.status = 'PENDING' (phản ánh chờ xử lý)
 *
 * RLS Phase 2 (DEC-02 + data-scope-security §6.2):
 *  - Mỗi bảng đã bật FORCE ROW LEVEL SECURITY. Mọi SELECT phải đi qua GUC
 *    `app.user_id` + `app.role` để policy chạy đúng.
 *  - Service này KHÔNG gọi `getPrisma()` trực tiếp. Caller (Server Component)
 *    phải mở transaction qua `withDbContext(prisma, ctx, ...)` rồi truyền `tx`.
 *
 * Quyết định thiết kế (theo directive Tier 0 13/09/2026 10:33):
 *  - **Ma trận quyền theo từng KPI** — không có VIEWER_ROLES chung cho cả 3.
 *    Mỗi KPI declare một tập role được phép đọc; với role ngoài tập, trả
 *    `hasPermission: false` (KHÔNG truy vấn DB cho KPI đó).
 *  - **Số 0 có nghĩa** là đã truy vấn hợp lệ — KHÔNG giả. KPI không có
 *    quyền KHÔNG đếm (trả fallback "Không có quyền xem" thay vì 0).
 *  - **Scope label** phân biệt "toàn hệ thống" (root) vs "trong phạm vi của bạn"
 *    (PM/CTV/vendor) — Tier 0 chỉ rõ không gọi số bị RLS giới hạn là tổng.
 *  - **Vòng đầu không cache chung** giữa user/role (caller wrap trong
 *    Server Component, không có `unstable_cache`).
 *
 * Out of scope (vòng sau):
 *  - Drill-down, real-time, filter range, cache per-user, 3 KPI còn lại.
 */
import type { Prisma, SystemRole } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/** Một KPI card trả về cho UI. Có/không có giá trị đều được biểu diễn rõ. */
export type KpiEntry =
  | {
      key: 'JOB_OPENINGS_OPEN';
      label: string;
      hasPermission: true;
      value: number;
      scopeLabel: string;
      href: string;
    }
  | {
      key: 'CANDIDATE_SUBMISSIONS_NEW';
      label: string;
      hasPermission: true;
      value: number;
      scopeLabel: string;
      href: string;
    }
  | {
      key: 'TICKETS_PENDING';
      label: string;
      hasPermission: true;
      value: number;
      scopeLabel: string;
      href: string;
    }
  | {
      key: 'JOB_OPENINGS_OPEN';
      label: string;
      hasPermission: false;
      fallback: string;
      href: null;
    }
  | {
      key: 'CANDIDATE_SUBMISSIONS_NEW';
      label: string;
      hasPermission: false;
      fallback: string;
      href: null;
    }
  | {
      key: 'TICKETS_PENDING';
      label: string;
      hasPermission: false;
      fallback: string;
      href: null;
    };

export interface OverviewMetrics {
  kpis: KpiEntry[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Ma trận quyền theo từng KPI (DEC trong TASK.md §2)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * KPI-1: JobOpening OPEN.
 *
 * RLS `hrp_project_visible_for(project_id)` mở cho: ADMIN, HR_MANAGER, DIRECTOR, SALE,
 * PM (chỉ projects mình). HR_STAFF + ACCOUNTANT KHÔNG có nhánh → deny-by-default.
 * Worktree phụ (WORKER, VENDOR, CTV) không phải entry point admin — service không
 * kiểm tra vì page `/admin` đã gate ở Server Component.
 */
const KPI1_ALLOWED: ReadonlySet<SystemRole> = new Set<SystemRole>([
  'ADMIN',
  'HR_MANAGER',
  'DIRECTOR',
  'SALE',
  'PM',
]);

/**
 * KPI-2: CandidateSubmission NEW.
 *
 * RLS policy m14 `hrp_candidate_submission_scope` mở cho: ADMIN, HR_MANAGER, DIRECTOR,
 * SALE, ACCOUNTANT (toàn hệ thống), PM (chỉ projects mình), VENDOR_* (own vendor),
 * CTV (own ctv). HR_STAFF không có nhánh → deny.
 */
const KPI2_ALLOWED: ReadonlySet<SystemRole> = new Set<SystemRole>([
  'ADMIN',
  'HR_MANAGER',
  'DIRECTOR',
  'SALE',
  'ACCOUNTANT',
  'PM',
]);

/**
 * KPI-3: Ticket PENDING.
 *
 * RLS policy m1_07a `hrp_ticket_select` (helper `hrp_ticket_visible`): ROOT+
 * HR_STAFF xem all. PM xem tickets của worker ACTIVE ở project mình. ACCOUNTANT
 * chỉ xem ADVANCE_SALARY ở HR_APPROVED/APPROVED/PAID/REJECTED/CLOSED → KHÔNG
 * vào được PENDING. SALE không có nhánh → deny.
 */
const KPI3_ALLOWED: ReadonlySet<SystemRole> = new Set<SystemRole>([
  'ADMIN',
  'HR_MANAGER',
  'DIRECTOR',
  'HR_STAFF',
  'PM',
]);

// ═══════════════════════════════════════════════════════════════════════════
// Scope label — phân biệt "toàn hệ thống" vs "trong phạm vi của bạn"
// ═══════════════════════════════════════════════════════════════════════════

/** Role xem toàn hệ thống (root + một số role RLS mở all). */
const FULL_SYSTEM_ROLES: ReadonlySet<SystemRole> = new Set<SystemRole>([
  'ADMIN',
  'HR_MANAGER',
  'DIRECTOR',
  'SALE', // RLS mở all projects cho SALE
  'ACCOUNTANT', // candidate_submissions RLS mở all
  'HR_STAFF', // ticket review queue = full ticket table
]);

function scopeLabel(role: SystemRole): string {
  return FULL_SYSTEM_ROLES.has(role) ? 'toàn hệ thống' : 'trong phạm vi của bạn';
}

// ═══════════════════════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════════════════════

const FALLBACK_NO_PERMISSION = 'Không có quyền xem';

export interface LoadOverviewMetricsContext {
  role: SystemRole;
}

/**
 * Đọc 3 KPI cho dashboard. Mỗi KPI độc lập về quyền:
 *  - Nếu role không có trong tập allowed → trả về `hasPermission: false` NGAY
 *    (KHÔNG query DB cho KPI đó — tránh surface thông tin "có N row" qua timing).
 *  - Nếu role có quyền → query và trả số + scopeLabel.
 *
 * Lỗi Prisma bubble lên — caller (Server Component) bắt và render fallback
 * "Chưa tải được số liệu". KHÔNG trả 0 khi lỗi.
 *
 * @param ctx — chỉ cần `role` để tra cứu ma trận quyền. `userId` đã được set
 *   GUC bởi `withDbContext` ở layer trên.
 * @param tx — Prisma TransactionClient (đã set GUC qua `applyRlsContext`).
 */
export async function loadOverviewMetrics(
  ctx: LoadOverviewMetricsContext,
  tx: Prisma.TransactionClient,
): Promise<OverviewMetrics> {
  const kpis: KpiEntry[] = [];

  // KPI-1: JobOpening.status = 'OPEN'
  if (KPI1_ALLOWED.has(ctx.role)) {
    const value = await tx.jobOpening.count({ where: { status: 'OPEN' } });
    kpis.push({
      key: 'JOB_OPENINGS_OPEN',
      label: 'Đơn tuyển dụng đang mở',
      hasPermission: true,
      value,
      scopeLabel: scopeLabel(ctx.role),
      href: '/admin/jobs',
    });
  } else {
    kpis.push({
      key: 'JOB_OPENINGS_OPEN',
      label: 'Đơn tuyển dụng đang mở',
      hasPermission: false,
      fallback: FALLBACK_NO_PERMISSION,
      href: null,
    });
  }

  // KPI-2: CandidateSubmission.status = 'NEW'
  if (KPI2_ALLOWED.has(ctx.role)) {
    const value = await tx.candidateSubmission.count({ where: { status: 'NEW' } });
    kpis.push({
      key: 'CANDIDATE_SUBMISSIONS_NEW',
      label: 'Ứng viên mới',
      hasPermission: true,
      value,
      scopeLabel: scopeLabel(ctx.role),
      href: '/admin/applications',
    });
  } else {
    kpis.push({
      key: 'CANDIDATE_SUBMISSIONS_NEW',
      label: 'Ứng viên mới',
      hasPermission: false,
      fallback: FALLBACK_NO_PERMISSION,
      href: null,
    });
  }

  // KPI-3: Ticket.status = 'PENDING'
  if (KPI3_ALLOWED.has(ctx.role)) {
    const value = await tx.ticket.count({ where: { status: 'PENDING' } });
    kpis.push({
      key: 'TICKETS_PENDING',
      label: 'Phản ánh chờ xử lý',
      hasPermission: true,
      value,
      scopeLabel: scopeLabel(ctx.role),
      href: '/admin/tickets',
    });
  } else {
    kpis.push({
      key: 'TICKETS_PENDING',
      label: 'Phản ánh chờ xử lý',
      hasPermission: false,
      fallback: FALLBACK_NO_PERMISSION,
      href: null,
    });
  }

  return { kpis };
}
