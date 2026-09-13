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
import type { Prisma } from '@prisma/client';

/** View-model hiển thị ở admin list. Date đã được serialize thành ISO string. */
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
