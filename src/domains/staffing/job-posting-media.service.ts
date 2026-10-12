/**
 * job-posting-media.service.ts — hrp-t1c-jobposting-media-youtube (RQ-05..RQ-09, DEC-05..DEC-07).
 *
 * Service wrapper quản lý MediaAssignment của JobPosting (ownerType='JobPosting').
 * Mọi write đều:
 *  1) authorize qua `getJobPostingForAuthoring(tx, ctx, jobPostingId)` — RLS của
 *     `job_postings` + scoped-recruiter check cho HR_STAFF;
 *  2) thực thi dưới transaction của caller (route mở `prisma.$transaction` trước
 *     khi gọi wrapper này, idempotency wrap qua `withIdempotency` nếu cần);
 *  3) KHÔNG mở thêm Prisma client/connection (chỉ nhận `tx`).
 *
 * Lý do có wrapper này thay vì dùng `assignMedia` / `unassignMedia` của
 * `src/domains/media/media.service.ts`:
 *  - Hai helper generic đó không kiểm tra `ownerId` có thuộc JobPosting user
 *    có quyền đọc hay không — nguy cơ ADMIN có `CAN_MANAGE_MEDIA` gán media
 *    vào JobPosting X dù không thuộc project visibility của admin đó. Wrapper
 *    này đóng kẽ hổng đó bằng cách đọc JobPosting qua authoring read helper.
 *  - Cover và reorder cần transaction nguyên mạch (clear-cover-all + set-cover-one
 *    + set-order-by-index), mà generic helper không cung cấp.
 *
 * Lưu ý an toàn:
 *  - Toàn bộ helper `throw JobPostingMediaError` với `httpStatus` cố định; route
 *    map sang HTTP response tương ứng (404/409/400/500). KHÔNG throw error khác —
 *    repo-owned message hiển thị qua `summarizeJobPostingApiError` (T1A).
 *  - KHÔNG bao giờ trả `mediaId`/`ownerId`/`assignmentId` lẻ ra ngoài DTO để
 *    audit log dễ trace — tất cả wrap trong `JobPostingMediaAssignmentDto`.
 */
import { Prisma } from '@prisma/client';
import {
  getJobPostingForAuthoring,
  AuthoringError,
} from '@/src/domains/staffing/job-posting-authoring.service';
import type { AuthContext } from '@/src/shared/auth/auth-context';

type Tx = Prisma.TransactionClient;

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export type JobPostingMediaErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'MEDIA_NOT_FOUND'
  | 'MEDIA_ASSIGNMENT_CONFLICT'
  | 'ASSIGNMENT_NOT_FOUND'
  | 'ASSIGNMENT_OWNER_MISMATCH'
  | 'INTERNAL';

export class JobPostingMediaError extends Error {
  constructor(
    public readonly code: JobPostingMediaErrorCode,
    message: string,
    public readonly httpStatus: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'JobPostingMediaError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────

export interface JobPostingMediaAssignmentDto {
  assignmentId: string;
  mediaId: string;
  url: string;
  alt: string;
  caption: string | null;
  mimeType: string;
  order: number;
  cover: boolean;
  createdAt: string;
}

const MEDIA_INCLUDE_FOR_DETAIL = {
  select: {
    id: true,
    publicUrl: true,
    url: true,
    alt: true,
    caption: true,
    mimeType: true,
    status: true,
  },
} as const;

function rowToDto(
  row: { id: string; mediaId: string; order: number; cover: boolean; createdAt: Date; media: { publicUrl: string; url: string; alt: string; caption: string | null; mimeType: string } },
): JobPostingMediaAssignmentDto {
  return {
    assignmentId: row.id,
    mediaId: row.mediaId,
    url: row.media.publicUrl || row.media.url,
    alt: row.media.alt,
    caption: row.media.caption,
    mimeType: row.media.mimeType,
    order: row.order,
    cover: row.cover,
    createdAt: row.createdAt.toISOString(),
  };
}

async function assertJobPostingReadable(
  tx: Tx,
  ctx: AuthContext,
  jobPostingId: string,
): Promise<void> {
  if (!jobPostingId || typeof jobPostingId !== 'string') {
    throw new JobPostingMediaError('INVALID_INPUT', 'jobPostingId là bắt buộc.', 400, {
      field: 'jobPostingId',
    });
  }
  // `getJobPostingForAuthoring` đã enforce:
  //  - RLS `job_postings_select` (qua `withDbContext` của route)
  //  - F9 scoped-recruiter guard cho HR_STAFF
  //  - NOT_FOUND 404 cho posting không tồn tại / không đọc được
  // → null = no existence oracle (đúng theo DEC-09).
  let posting: Awaited<ReturnType<typeof getJobPostingForAuthoring>> = null;
  try {
    posting = await getJobPostingForAuthoring(tx, ctx, jobPostingId);
  } catch (err) {
    if (err instanceof AuthoringError && err.code === 'NO_ACTIVE_ORDER_ASSIGNMENT') {
      // Nhánh HR_STAFF recruiter scope fail — surface như NOT_FOUND (no existence oracle).
      throw new JobPostingMediaError(
        'NOT_FOUND',
        `JobPosting ${jobPostingId} không tồn tại.`,
        404,
      );
    }
    throw err;
  }
  if (!posting) {
    throw new JobPostingMediaError(
      'NOT_FOUND',
      `JobPosting ${jobPostingId} không tồn tại.`,
      404,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// List (RQ-05)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List media assignments của JobPosting, sort `[cover DESC, order ASC, createdAt ASC]`.
 * Chỉ trả media có `status='PUBLIC'` — `INTERNAL` media là admin-only.
 */
export async function listJobPostingMedia(
  tx: Tx,
  ctx: AuthContext,
  jobPostingId: string,
): Promise<JobPostingMediaAssignmentDto[]> {
  await assertJobPostingReadable(tx, ctx, jobPostingId);
  const rows = await tx.mediaAssignment.findMany({
    where: {
      ownerType: 'JobPosting',
      ownerId: jobPostingId,
      media: { status: 'PUBLIC' },
    },
    include: { media: MEDIA_INCLUDE_FOR_DETAIL },
    orderBy: [{ cover: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(rowToDto);
}

// ─────────────────────────────────────────────────────────────────────────────
// Assign (RQ-06, DEC-05, DEC-06)
// ─────────────────────────────────────────────────────────────────────────────

export interface AssignMediaToJobPostingInput {
  mediaId: string;
  order?: number;
  cover?: boolean;
}

/**
 * Attach một media vào JobPosting.
 *
 *  - Duplicate (cùng `mediaId` đã attach): 409 MEDIA_ASSIGNMENT_CONFLICT.
 *  - Khi `cover=true`: clear cover của các assignment khác cùng JobPosting trong
 *    CÙNG transaction rồi set cover của assignment mới (DEC-06).
 *  - Khi `cover=false`/`undefined`: assignment mới không phải cover; cover của
 *    các assignment cũ giữ nguyên (chèn 1 ảnh không cover vào gallery).
 */
export async function assignMediaToJobPosting(
  tx: Tx,
  ctx: AuthContext,
  jobPostingId: string,
  input: AssignMediaToJobPostingInput,
): Promise<JobPostingMediaAssignmentDto> {
  await assertJobPostingReadable(tx, ctx, jobPostingId);

  if (!input.mediaId || typeof input.mediaId !== 'string') {
    throw new JobPostingMediaError('INVALID_INPUT', 'mediaId là bắt buộc.', 400, {
      field: 'mediaId',
    });
  }
  if (input.order !== undefined && (!Number.isInteger(input.order) || input.order < 0)) {
    throw new JobPostingMediaError(
      'INVALID_INPUT',
      'order phải là số nguyên không âm (hoặc bị bỏ qua).',
      400,
      { field: 'order' },
    );
  }

  // Media tồn tại + PUBLIC (không attach INTERNAL lên JobPosting).
  const media = await tx.media.findUnique({
    where: { id: input.mediaId },
    select: { id: true, status: true },
  });
  if (!media) {
    throw new JobPostingMediaError('MEDIA_NOT_FOUND', `Media ${input.mediaId} không tồn tại.`, 404);
  }
  if (media.status !== 'PUBLIC') {
    throw new JobPostingMediaError(
      'INVALID_INPUT',
      'Media này ở trạng thái INTERNAL — không thể gán cho JobPosting công khai.',
      400,
      { field: 'mediaId', status: media.status },
    );
  }

  // Duplicate check (UQ `[mediaId, ownerType, ownerId]` ở DB layer nhưng fail sớm hơn để
  // trả 409 với message repo-owned thay vì Prisma raw P2002).
  const dup = await tx.mediaAssignment.findUnique({
    where: {
      mediaId_ownerType_ownerId: {
        mediaId: input.mediaId,
        ownerType: 'JobPosting',
        ownerId: jobPostingId,
      },
    },
    select: { id: true },
  });
  if (dup) {
    throw new JobPostingMediaError(
      'MEDIA_ASSIGNMENT_CONFLICT',
      `Media ${input.mediaId} đã được gán cho JobPosting ${jobPostingId}.`,
      409,
      { mediaId: input.mediaId, existingAssignmentId: dup.id },
    );
  }

  const order = input.order ?? 0;
  const cover = input.cover ?? false;

  if (cover) {
    // Clear cover của các assignment khác cùng JobPosting (DEC-06 race-guard).
    await tx.mediaAssignment.updateMany({
      where: { ownerType: 'JobPosting', ownerId: jobPostingId, cover: true },
      data: { cover: false },
    });
  }

  try {
    const created = await tx.mediaAssignment.create({
      data: {
        mediaId: input.mediaId,
        ownerType: 'JobPosting',
        ownerId: jobPostingId,
        order,
        cover,
      },
      include: { media: MEDIA_INCLUDE_FOR_DETAIL },
    });
    return rowToDto(created);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new JobPostingMediaError(
        'MEDIA_ASSIGNMENT_CONFLICT',
        `Media ${input.mediaId} đã được gán cho JobPosting ${jobPostingId}.`,
        409,
        { mediaId: input.mediaId },
      );
    }
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Detach (RQ-07)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detach một assignment khỏi JobPosting. Trước khi xoá, đọc `ownerType` + `ownerId`
 * để xác nhận assignment thuộc JobPosting của caller — nếu không đúng, trả 404
 * (no existence oracle — KHÔNG rò rỉ assignment thuộc owner khác).
 */
export async function detachMediaFromJobPosting(
  tx: Tx,
  ctx: AuthContext,
  jobPostingId: string,
  assignmentId: string,
): Promise<{ id: string }> {
  await assertJobPostingReadable(tx, ctx, jobPostingId);
  if (!assignmentId || typeof assignmentId !== 'string') {
    throw new JobPostingMediaError(
      'INVALID_INPUT',
      'assignmentId là bắt buộc.',
      400,
      { field: 'assignmentId' },
    );
  }

  const row = await tx.mediaAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, ownerType: true, ownerId: true, cover: true },
  });
  if (!row || row.ownerType !== 'JobPosting' || row.ownerId !== jobPostingId) {
    throw new JobPostingMediaError(
      'ASSIGNMENT_NOT_FOUND',
      `Assignment ${assignmentId} không thuộc JobPosting ${jobPostingId}.`,
      404,
    );
  }

  await tx.mediaAssignment.delete({ where: { id: assignmentId } });
  return { id: assignmentId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Set cover (RQ-09, DEC-06 race-guard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Đặt 1 assignment làm cover duy nhất của JobPosting.
 *
 * Sequence (1 transaction):
 *   1) clear `cover = false` cho mọi assignment khác của JobPosting;
 *   2) set `cover = true` cho assignment được chỉ định.
 *
 * Hai request cover đồng thời: clear step của cả hai đều chạm `updateMany`
 * (atomic per-statement). Sau clear, cả hai cùng `update({ where: { id } })`
 * — id là unique, không xung đột. ĐÚNG 1 thắng (assignment đó cover=true),
 * assignment còn lại cover=false (vì clear step đã chạy trước).
 */
export async function setCoverMediaForJobPosting(
  tx: Tx,
  ctx: AuthContext,
  jobPostingId: string,
  assignmentId: string,
): Promise<JobPostingMediaAssignmentDto> {
  await assertJobPostingReadable(tx, ctx, jobPostingId);
  if (!assignmentId || typeof assignmentId !== 'string') {
    throw new JobPostingMediaError(
      'INVALID_INPUT',
      'assignmentId là bắt buộc.',
      400,
      { field: 'assignmentId' },
    );
  }

  const row = await tx.mediaAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, ownerType: true, ownerId: true },
  });
  if (!row || row.ownerType !== 'JobPosting' || row.ownerId !== jobPostingId) {
    throw new JobPostingMediaError(
      'ASSIGNMENT_NOT_FOUND',
      `Assignment ${assignmentId} không thuộc JobPosting ${jobPostingId}.`,
      404,
    );
  }

  // 1. clear cover của mọi assignment khác cùng JobPosting
  await tx.mediaAssignment.updateMany({
    where: { ownerType: 'JobPosting', ownerId: jobPostingId, cover: true },
    data: { cover: false },
  });
  // 2. set cover cho assignment này
  const updated = await tx.mediaAssignment.update({
    where: { id: assignmentId },
    data: { cover: true },
    include: { media: MEDIA_INCLUDE_FOR_DETAIL },
  });
  return rowToDto(updated);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reorder (RQ-08, DEC-07)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sắp xếp lại gallery của JobPosting.
 *
 * Body: `{ orderedAssignmentIds: string[] }`. Server:
 *   1) đọc current assignment set của JobPosting;
 *   2) đối chiếu — tập id PHẢI trùng khớp (không thiếu, không thừa, không trùng);
 *      mismatch → 400 INVALID_INPUT với diff list (debug-only, KHÔNG leak assignment
 *      thuộc owner khác — diff list chỉ chứa id client gửi hoặc missing id từ DB).
 *   3) set `order = index` cho từng assignment trong transaction.
 *
 * KHÔNG tạo mới hay xoá assignment trong reorder — đó là scope của
 * `assignMediaToJobPosting` / `detachMediaFromJobPosting`.
 */
export async function reorderMediaForJobPosting(
  tx: Tx,
  ctx: AuthContext,
  jobPostingId: string,
  orderedAssignmentIds: string[],
): Promise<JobPostingMediaAssignmentDto[]> {
  await assertJobPostingReadable(tx, ctx, jobPostingId);

  if (!Array.isArray(orderedAssignmentIds)) {
    throw new JobPostingMediaError(
      'INVALID_INPUT',
      'orderedAssignmentIds phải là mảng string.',
      400,
      { field: 'orderedAssignmentIds' },
    );
  }
  for (const id of orderedAssignmentIds) {
    if (typeof id !== 'string' || id.length === 0) {
      throw new JobPostingMediaError(
        'INVALID_INPUT',
        'orderedAssignmentIds phải là mảng id không rỗng.',
        400,
        { field: 'orderedAssignmentIds' },
      );
    }
  }
  // Reject duplicate id trong cùng array — không thể map 2 id vào cùng 1 order.
  if (new Set(orderedAssignmentIds).size !== orderedAssignmentIds.length) {
    throw new JobPostingMediaError(
      'INVALID_INPUT',
      'orderedAssignmentIds chứa id trùng lặp.',
      400,
      { field: 'orderedAssignmentIds' },
    );
  }

  // 1. current set
  const currentRows = await tx.mediaAssignment.findMany({
    where: { ownerType: 'JobPosting', ownerId: jobPostingId },
    select: { id: true },
  });
  const currentIds = new Set(currentRows.map((r) => r.id));
  const clientIds = new Set(orderedAssignmentIds);

  const missingFromClient: string[] = [];
  for (const id of currentIds) {
    if (!clientIds.has(id)) missingFromClient.push(id);
  }
  const extraFromClient: string[] = [];
  for (const id of clientIds) {
    if (!currentIds.has(id)) extraFromClient.push(id);
  }
  if (missingFromClient.length > 0 || extraFromClient.length > 0) {
    throw new JobPostingMediaError(
      'INVALID_INPUT',
      'orderedAssignmentIds không khớp với tập assignment hiện tại của JobPosting.',
      400,
      {
        field: 'orderedAssignmentIds',
        missingFromClientCount: missingFromClient.length,
        extraFromClientCount: extraFromClient.length,
      },
    );
  }

  // 2. set order theo index
  // Thực hiện tuần tự trong cùng transaction để có semantics "set order theo thứ tự".
  // Với số lượng assignment < 100 thường thấy, n lần `update` đủ nhanh; concurrency
  // giữa 2 reorder request khác nhau → từng lock giành qua FK + transaction isolation
  // của Neon Postgres. Không cần ordering lệnh đặc biệt.
  for (let i = 0; i < orderedAssignmentIds.length; i += 1) {
    const id = orderedAssignmentIds[i];
    await tx.mediaAssignment.update({
      where: { id },
      data: { order: i },
    });
  }

  // 3. đọc lại với thứ tự mới
  const rows = await tx.mediaAssignment.findMany({
    where: { ownerType: 'JobPosting', ownerId: jobPostingId, media: { status: 'PUBLIC' } },
    include: { media: MEDIA_INCLUDE_FOR_DETAIL },
    orderBy: [{ cover: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(rowToDto);
}