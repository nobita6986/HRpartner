/**
 * job-posting-list.service.ts — AV2 JobPosting editor shell (read-only).
 *
 * Service đọc danh sách JobPosting cho Admin/Sale xem trước khi có backend
 * ghi (chờ contract N3 + AV2 backend). Chỉ SELECT — KHÔNG có UPDATE/INSERT.
 *
 * Vì sao file này tồn tại:
 *  - JobPosting là một phần của V6 Phase 1 (`hrp-v6-p1-job-opening-posting-split`,
 *    merge a43baa1). Model đã có, data có thể có (job_openings → job_postings).
 *  - Đường đọc PUBLIC hiện đi qua `Project` (xem `getPublicJobDetail` ở
 *    `src/domains/job-board/public.service.ts:705`). Nghĩa là `JobPosting`
 *    chưa gắn vào luồng public detail. Editor shell ở vòng này là
 *    read-only viewer để Admin/Sale thấy được JobPosting đã được tạo ở
 *    Phase 1 (thường là DRAFT, chưa PUBLISHED).
 *  - Section content (intro/benefits/requirements/...) đang là fixture local
 *    (`src/domains/job-board/fixtures/detail-sections.fixture.ts`), KHÔNG có
 *    persistence cho JobPosting ở giai đoạn hiện tại. Editor shell vì thế
 *    hiển thị preview bằng cách render fixture, không lưu.
 *
 * Phần bị khóa (xem app/admin/jobs/job-postings/<id>/page.tsx):
 *  - Lưu bản nháp section content → chờ AV2 backend (ngoài phạm vi vòng này).
 *  - Publish JobPosting → chờ contract N3.
 *  - Section content thật (REAL) → chờ AV2 backend + AV6 CMS.
 *
 * QUAN TRỌNG — RLS Phase 2 (DEC-02 + data-scope-security §6.2):
 *  - Bảng `job_postings` bật FORCE ROW LEVEL SECURITY (migration
 *    `20260908001_job_opening_posting_split`). Mọi SELECT phải đi qua GUC
 *    `app.user_id` + `app.role` để RLS policy `job_postings_select`
 *    (gọi `hrp_project_visible_for`) chạy đúng.
 *  - Service này KHÔNG gọi `getPrisma()` trực tiếp. Caller (Server Component
 *    hoặc route handler) phải mở transaction qua `withDbContext(prisma, ctx, ...)`
 *    rồi truyền `tx` vào đây — `applyRlsContext` set GUC transaction-local
 *    ngay đầu transaction, RLS policy tự lọc theo role.
 *  - Vì sao KHÔNG dùng `withAuthScope` (Phase 2 L1)? `JobPosting` chưa có
 *    builder trong `SCOPE_REGISTRY` (xem `src/shared/auth/scopes/index.ts`),
 *    nên L1 sẽ throw `DENY_BY_DEFAULT` cho non-root. L2 RLS ở DB là đủ.
 *
 * Quyết định thiết kế:
 *  - Trả về DTO thuần (không phải Prisma model) để caller dễ serialize
 *    cho Server Component (Date → ISO).
 *  - Sắp xếp theo `updatedAt DESC` để JobPosting vừa đụng hiện lên đầu —
 *    phù hợp với workflow "đang soạn thì mở bản mới nhất".
 *  - Phân trang `take`/`skip` để tránh quét toàn bảng nếu sau này
 *    JobPosting có nhiều row. Limit mặc định 25, max 100.
 *  - Tất cả giá trị take/skip phải là số nguyên dương có giới hạn — nếu
 *    NaN/âm/quá lớn sẽ được clamp thay vì để caller phải xử lý.
 */
import { Prisma } from '@prisma/client';

/** View-model hiển thị ở admin list. Date đã được serialize thành ISO string.
 *
 *  P1-A0 extension: thêm `title`, `salaryDisplay`, `hasContent` flag,
 *  `contentSchemaVersion`. Tất cả OPTIONAL — bản cũ (DRAFT rows from V6 Phase 1)
 *  vẫn đọc được. Consumers hiện hữu chỉ cần check optional chain.
 *
 *  P1-A0.1 extension: thêm `isHot` + `isUrgent` stamp flags — canonical source
 *  of truth cho public "Hot" + "Tuyển gấp" stamps. Default false cho row cũ
 *  (P1-A0.1 migration) và row mới. */
export interface JobPostingListItemDto {
  id: string;
  jobOpeningId: string;
  slug: string;
  revision: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Tên JobOpening mà posting này gắn vào (snapshot lúc list). Có thể null nếu FK đã xoá. */
  openingStaffingOrderCode: string | null;
  openingStatus: string | null;
  /** P1-A0: title (display), salaryDisplay (free-form). null nếu DRAFT rows từ Phase 1 chưa set. */
  title: string | null;
  salaryDisplay: string | null;
  /** P1-A0: true khi bất kỳ rich content field nào (description/requirements/benefits/applicationInstructions) có JSON. */
  hasContent: boolean;
  /** P1-A0: contentSchemaVersion mà row này được author (default 1 cho legacy rows). */
  contentSchemaVersion: number;
  /** P1-A0.1 stamp flags — được dùng cho chip "Hot" + "Tuyển gấp" trên admin list row. */
  isHot: boolean;
  isUrgent: boolean;
}

export interface JobPostingListPage {
  items: JobPostingListItemDto[];
  total: number;
  take: number;
  skip: number;
}

export interface ListJobPostingsOptions {
  take?: number;
  skip?: number;
  /** Lọc theo status DRAFT|PUBLISHED|ARCHIVED. Mặc định: không lọc. */
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

const DEFAULT_TAKE = 25;
const MAX_TAKE = 100;

/** Clamp về số nguyên dương có giới hạn. Trả về số nguyên hoặc default nếu input không hợp lệ. */
export function clampPositiveInt(value: number | undefined, opts: { default: number; max: number }): number {
  if (value === undefined || value === null || !Number.isFinite(value)) return opts.default;
  const truncated = Math.trunc(value);
  if (truncated <= 0) return opts.default;
  return Math.min(opts.max, truncated);
}

function clampTake(value: number | undefined): number {
  return clampPositiveInt(value, { default: DEFAULT_TAKE, max: MAX_TAKE });
}

function clampSkip(value: number | undefined): number {
  return clampPositiveInt(value, { default: 0, max: 1_000_000 });
}

/**
 * Đọc danh sách JobPosting + JobOpening liên kết (left join — JobPosting có
 * thể mồ côi nếu data bị xoá cục bộ, KHÔNG tự lọc theo FK).
 *
 * QUAN TRỌNG: caller phải mở transaction đã set GUC qua `withDbContext` trước
 * khi gọi — RLS policy `job_postings_select` chỉ chạy khi GUC đã có.
 *
 * @param tx — Prisma TransactionClient (KHÔNG phải PrismaClient — đã qua
 *   `prisma.$transaction(async (tx) => { await applyRlsContext(tx, ctx); ... })`).
 * @param options — take/skip/status filter (đã clamp).
 */
export async function listJobPostingsForAdmin(
  tx: Prisma.TransactionClient,
  options: ListJobPostingsOptions = {},
): Promise<JobPostingListPage> {
  const take = clampTake(options.take);
  const skip = clampSkip(options.skip);
  const where = options.status ? { status: options.status } : {};

  const [rows, total] = await Promise.all([
    tx.jobPosting.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take,
      skip,
      include: {
        jobOpening: {
          select: {
            id: true,
            staffingOrder: { select: { code: true } },
            status: true,
          },
        },
      },
    }),
    tx.jobPosting.count({ where }),
  ]);

  const items: JobPostingListItemDto[] = rows.map((row) => ({
    id: row.id,
    jobOpeningId: row.jobOpeningId,
    slug: row.slug,
    revision: row.revision,
    status: row.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    openingStaffingOrderCode: row.jobOpening?.staffingOrder?.code ?? null,
    openingStatus: row.jobOpening?.status ?? null,
    title: row.title,
    salaryDisplay: row.salaryDisplay,
    hasContent:
      row.descriptionJson != null ||
      row.requirementsJson != null ||
      row.benefitsJson != null ||
      row.applicationInstructionsJson != null,
    contentSchemaVersion: row.contentSchemaVersion,
    isHot: row.isHot,
    isUrgent: row.isUrgent,
  }));

  return { items, total, take, skip };
}

/**
 * Đọc 1 JobPosting + JobOpening. Trả về null nếu không tồn tại.
 * Dùng cho trang detail editor shell.
 *
 * Vì RLS FORCE: có thể vẫn null khi job tồn tại nhưng role hiện tại không
 * đủ quyền đọc (`hrp_project_visible_for` trả false). Đây là fail-closed
 * đúng nghĩa — caller nên kiểm tra role trước khi gọi.
 */
export interface JobPostingDetailDto {
  id: string;
  jobOpeningId: string;
  slug: string;
  revision: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** P1-A0: rich content (validated JSON; null nếu DRAFT rows chưa set). */
  title: string | null;
  salaryDisplay: string | null;
  descriptionJson: unknown | null;
  requirementsJson: unknown | null;
  benefitsJson: unknown | null;
  applicationInstructionsJson: unknown | null;
  contentSchemaVersion: number;
  /** P1-A0.1 stamp flags — đồng bộ với `JobPostingDto.isHot` / `isUrgent`. */
  isHot: boolean;
  isUrgent: boolean;
  opening: {
    id: string;
    status: string;
    openedAt: string | null;
    closedAt: string | null;
    staffingOrderId: string;
    staffingOrderCode: string;
    staffingOrderSlotId: string | null;
  } | null;
}

export async function getJobPostingForAdmin(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<JobPostingDetailDto | null> {
  if (!id || typeof id !== 'string') return null;
  const row = await tx.jobPosting.findUnique({
    where: { id },
    include: {
      jobOpening: {
        select: {
          id: true,
          status: true,
          openedAt: true,
          closedAt: true,
          staffingOrderId: true,
          staffingOrderSlotId: true,
          staffingOrder: { select: { code: true } },
        },
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    jobOpeningId: row.jobOpeningId,
    slug: row.slug,
    revision: row.revision,
    status: row.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    title: row.title,
    salaryDisplay: row.salaryDisplay,
    descriptionJson: row.descriptionJson,
    requirementsJson: row.requirementsJson,
    benefitsJson: row.benefitsJson,
    applicationInstructionsJson: row.applicationInstructionsJson,
    contentSchemaVersion: row.contentSchemaVersion,
    isHot: row.isHot,
    isUrgent: row.isUrgent,
    opening: row.jobOpening
      ? {
          id: row.jobOpening.id,
          status: row.jobOpening.status,
          openedAt: row.jobOpening.openedAt ? row.jobOpening.openedAt.toISOString() : null,
          closedAt: row.jobOpening.closedAt ? row.jobOpening.closedAt.toISOString() : null,
          staffingOrderId: row.jobOpening.staffingOrderId,
          staffingOrderCode: row.jobOpening.staffingOrder?.code ?? '',
          staffingOrderSlotId: row.jobOpening.staffingOrderSlotId,
        }
      : null,
  };
}

/**
 * P1-A0.1 — DTO cho một StaffingOrderSlot đủ điều kiện tạo JobPosting mới.
 * Trả về cho Server Component `app/admin/jobs/job-postings/page.tsx` để render
 * dropdown selector trong client form (T0 §2 "Slot selector" — single source
 * of truth ở server, selector client không phải authorization authority).
 *
 * Eligibility predicate (DEC-03, locked T0 §2 + C-02 correction batch 1/1):
 *   - StaffingOrder.status ∈ {OPEN, CLOSING_SOON}
 *   - `deadlineDate` IS NULL OR `deadlineDate >= now()`
 *   - `validTo` IS NULL OR `validTo >= now()`  (HR được prep draft trước `validFrom`)
 *   - `slotsFilled < slotsNeeded`
 *   - slot không resolve sang một canonical JobPosting đã tồn tại
 *     (qua `jobOpeningId` → `JobOpening.posting` IS NULL — slot có JobOpening chưa có
 *     JobPosting VẪN đủ điều kiện vì POST sẽ reuse JobOpening và tạo posting).
 *
 * POST endpoint (`/api/admin/jobs/job-postings`) sẽ re-read + revalidate
 * predicate trong transaction — selector client KHÔNG phải authorization authority.
 */
export interface JobPostingSlotSelectorDto {
  id: string;
  positionTitle: string;
  positionCode: string;
  workLocation: string | null;
  slotsNeeded: number;
  slotsFilled: number;
  /** C-02: derived slotsAvailable = slotsNeeded - slotsFilled. Server-computed, không UI suy. */
  slotsAvailable: number;
  validTo: string | null;
  staffingOrderId: string;
  staffingOrderCode: string;
  /**
   * C-02: actual StaffingOrder.status tại thời điểm đọc — `'OPEN' | 'CLOSING_SOON'`.
   * Predicate đã giới hạn 2 giá trị này, nhưng DTO vẫn carry để UI render chip badge
   * "Đang tuyển" / "Sắp hết hạn" mà KHÔNG hard-code trong client.
   */
  orderStatus: 'OPEN' | 'CLOSING_SOON';
}

/**
 * Canonical eligibility predicate (hrp-p1-a0-1 C-02 correction batch 1/1).
 *
 * One repo-owned helper consumed by BOTH:
 *  - `listEligibleSlotsForNewJobPosting` (selector for admin create form).
 *  - `assertSlotEligibleForNewJobPosting` (write-path authority inside the
 *    `createOrReuseJobOpeningForSlot` transaction).
 *
 * Two drifting copies caused v1.0 drift: selector said `job_opening_id IS NULL`
 * but the write path semantics require "no canonical JobPosting". C-02 fixes
 * this by sharing one predicate function on the same SQL fragment.
 *
 * Returns the SQL `Prisma.sql` fragment for direct embedding into a query.
 */
export function eligibleSlotPredicateSql(now: Date): Prisma.Sql {
  return Prisma.sql`
    so.status IN ('OPEN', 'CLOSING_SOON')
    AND (so.deadline_date IS NULL OR so.deadline_date >= ${now})
    AND (s.valid_to IS NULL OR s.valid_to >= ${now})
    AND s.slots_filled < s.slots_needed
    AND NOT EXISTS (
      SELECT 1 FROM job_postings jp
      INNER JOIN job_openings jo ON jo.id = jp.job_opening_id
      WHERE jo.staffing_order_slot_id = s.id
    )
  `;
}

/**
 * Đọc danh sách StaffingOrderSlot đủ điều kiện tạo JobPosting mới.
 *
 * Predicate dịch sang SQL qua `prisma.$queryRaw` — Prisma findMany không có
 * field-to-field comparison cho `slotsFilled < slotsNeeded`, nên ta viết
 * raw SQL để giữ predicate atomic ở DB (DEC-03, locked T0 §2 + C-02).
 *
 * Predicate được compose từ `eligibleSlotPredicateSql(now)` — CẢ selector và write
 * path (POST) chia sẻ đúng MỘT helper để tránh drift (C-02).
 *
 * POST endpoint (`/api/admin/jobs/job-postings`) sẽ re-read + revalidate
 * predicate trong transaction — selector client KHÔNG phải authorization authority.
 *
 * Caller phải mở transaction đã set GUC qua `withDbContext` trước khi gọi — RLS
 * policy của `staffing_order_slots` / `staffing_orders` chỉ chạy khi GUC đã có.
 *
 * @param tx — Prisma TransactionClient (KHÔNG phải PrismaClient — đã qua `withDbContext`).
 * @param options.now — override thời điểm "now" cho predicate; default `new Date()`.
 * @param options.limit — cap để tránh scan lớn; default 100, max 500.
 */
export async function listEligibleSlotsForNewJobPosting(
  tx: Prisma.TransactionClient,
  options: { now?: Date; limit?: number } = {},
): Promise<JobPostingSlotSelectorDto[]> {
  const now = options.now ?? new Date();
  const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 500) : 100;

  type EligibleRow = {
    id: string;
    position_title: string;
    position_code: string;
    work_location: string | null;
    slots_needed: number;
    slots_filled: number;
    valid_to: Date | null;
    staffing_order_id: string;
    staffing_order_code: string;
    order_status: string;
  };

  const rows = await tx.$queryRaw<EligibleRow[]>(Prisma.sql`
    SELECT
      s.id,
      s.position_title,
      s.position_code,
      s.work_location,
      s.slots_needed,
      s.slots_filled,
      s.valid_to,
      s.staffing_order_id,
      so.code AS staffing_order_code,
      so.status AS order_status
    FROM staffing_order_slots s
    INNER JOIN staffing_orders so ON so.id = s.staffing_order_id
    WHERE ${eligibleSlotPredicateSql(now)}
    ORDER BY so.code ASC, s.position_code ASC
    LIMIT ${limit}
  `);

  return rows.map((row) => ({
    id: row.id,
    positionTitle: row.position_title,
    positionCode: row.position_code,
    workLocation: row.work_location,
    slotsNeeded: row.slots_needed,
    slotsFilled: row.slots_filled,
    slotsAvailable: Math.max(0, row.slots_needed - row.slots_filled),
    validTo: row.valid_to ? row.valid_to.toISOString() : null,
    staffingOrderId: row.staffing_order_id,
    staffingOrderCode: row.staffing_order_code,
    // Predicate đã giới hạn {OPEN, CLOSING_SOON}, nhưng giữ narrowing để TS narrowing chuẩn.
    orderStatus: row.order_status === 'CLOSING_SOON' ? 'CLOSING_SOON' : 'OPEN',
  }));
}
