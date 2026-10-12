/**
 * business-code.ts — T1D Business Code Generator (RQ-01..RQ-04, STEP-01).
 *
 * Server-side generator authority duy nhất cho 5 loại business code master
 * data: ClientCompany.code, Project.code, Vendor.code, Worker.userId,
 * StaffingOrderSlot.positionCode. Race-safe qua pg_advisory_xact_lock +
 * SELECT MAX regex-filtered.
 *
 * DEC-01..DEC-06 (xem DECISION_REQUEST.md §4):
 * - DEC-T0-01: giữ format hiện hành; zero-pad 3 là MIN width (không cap 999).
 * - DEC-T0-02: Worker dùng Worker.userId (không thêm Worker.code).
 * - DEC-T0-03: NO MIGRATION; mã legacy giữ nguyên.
 * - DEC-T0-04: strict reject 400 SERVER_GENERATED_CODE ở route layer.
 * - DEC-T0-05: StaffingOrderSlot.positionCode trong scope; batch trong cùng tx.
 *
 * Pattern tham chiếu: src/domains/staffing/order.service.ts:108-122
 * (generateOrderCode dùng `pg_advisory_xact_lock(hashtext('staffing_order_code'))`).
 *
 * Caller PHẢI mở transaction trước (qua `withDbContext` / `$transaction`).
 */
import type { Prisma } from '@prisma/client';

/** Các loại business code mà generator hỗ trợ. */
export type BusinessCodeKind =
  | 'CLIENT' // ClientCompany.code → "CC-nnn"
  | 'PROJECT' // Project.code → "PRJ-{YYYY}-nnn", year-aware
  | 'VENDOR' // Vendor.code → "VD-nnn"
  | 'WORKER_USER_ID' // Worker.userId → "USR-EMP-nnn"
  | 'STAFFING_ORDER_SLOT_POSITION'; // StaffingOrderSlot.positionCode → "POS-nnn"

interface KindConfig {
  /** Prefix ngắn xuất hiện trong mã (vd "CC", "PRJ", "USR-EMP"). */
  readonly prefix: string;
  /** Số chữ số zero-pad tối thiểu (DEC-T0-01: min width, không cap 999). */
  readonly padWidth: number;
  /** Project là năm-aware (PRJ-YYYY-nnn); các kind khác thì false. */
  readonly includeYear: boolean;
  /** Tên bảng thật trong DB (cho raw SQL). */
  readonly table: string;
  /** Tên cột mã trong bảng đó. */
  readonly column: string;
  /** Hằng số cho advisory lock key (vd "client_code", "worker_user_id"). */
  readonly lockKey: string;
  /**
   * Vị trí bắt đầu cắt số (1-indexed) trong SUBSTRING(column FROM n).
   * Tính = `len(prefix) + (len("-") + len(year) + len("-")) nếu includeYear, else len(prefix) + 1.
   */
  readonly numberFrom: number;
}

const CONFIG: Readonly<Record<BusinessCodeKind, KindConfig>> = {
  CLIENT: {
    prefix: 'CC',
    padWidth: 3,
    includeYear: false,
    table: 'client_companies',
    column: 'code',
    lockKey: 'client_code',
    numberFrom: 4, // "CC-"
  },
  PROJECT: {
    prefix: 'PRJ',
    padWidth: 3,
    includeYear: true,
    table: 'outsourcing_projects',
    column: 'code',
    lockKey: 'project_code',
    numberFrom: 10, // "PRJ-2026-"
  },
  VENDOR: {
    prefix: 'VD',
    padWidth: 3,
    includeYear: false,
    table: 'vendors',
    column: 'code',
    lockKey: 'vendor_code',
    numberFrom: 4, // "VD-"
  },
  WORKER_USER_ID: {
    prefix: 'USR-EMP',
    padWidth: 3,
    includeYear: false,
    table: 'workers',
    column: 'user_id',
    lockKey: 'worker_user_id',
    numberFrom: 9, // "USR-EMP-"
  },
  STAFFING_ORDER_SLOT_POSITION: {
    prefix: 'POS',
    padWidth: 3,
    includeYear: false,
    table: 'staffing_order_slots',
    column: 'position_code',
    lockKey: 'slot_position_code',
    numberFrom: 5, // "POS-"
  },
};

/** Mã lỗi throw khi caller vi phạm contract. */
export class BusinessCodeError extends Error {
  constructor(
    public readonly code: 'KIND_NOT_SUPPORTED' | 'YEAR_REQUIRED' | 'INVALID_COUNT' | 'INVALID_YEAR',
    message: string,
  ) {
    super(message);
    this.name = 'BusinessCodeError';
  }
}

/**
 * Build regex filter cho MAX query. Cho phép:
 * - Legacy: bất kỳ giá trị nào không match regex đều bị bỏ qua (DEC-T0-03).
 * - PROJECT year-aware: scope tìm max trong cùng năm (vd "PRJ-2026-001" → "PRJ-2026-002").
 */
function buildRegexFilter(kind: BusinessCodeKind, year?: number): string {
  const { prefix, includeYear } = CONFIG[kind];
  // Escape prefix (chỉ cần cho ký tự đặc biệt regex; "USR-EMP", "CC" đều an toàn).
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (includeYear) {
    if (typeof year !== 'number' || !Number.isInteger(year)) {
      throw new BusinessCodeError(
        'YEAR_REQUIRED',
        `Business code kind '${kind}' yêu cầu opts.year là số nguyên hợp lệ.`,
      );
    }
    return `^${escaped}-${year}-[0-9]+$`;
  }
  return `^${escaped}-[0-9]+$`;
}

function validateYear(year: number): void {
  const current = new Date().getUTCFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > current + 10) {
    throw new BusinessCodeError(
      'INVALID_YEAR',
      `opts.year=${year} ngoài khoảng cho phép [2000, ${current + 10}].`,
    );
  }
}

/** Sinh 1 mã mới, race-safe. Caller phải mở transaction trước. */
export async function nextBusinessCode(
  tx: Prisma.TransactionClient,
  kind: BusinessCodeKind,
  opts?: { readonly year?: number },
): Promise<string> {
  const cfg = CONFIG[kind];
  const year = opts?.year;
  if (cfg.includeYear) {
    if (typeof year !== 'number') {
      throw new BusinessCodeError(
        'YEAR_REQUIRED',
        `Business code kind '${kind}' yêu cầu opts.year.`,
      );
    }
    validateYear(year);
  }
  const regex = buildRegexFilter(kind, year);

  // Race-safe: advisory lock với key ổn định (T0 đã chốt dùng `pg_advisory_xact_lock`).
  await tx.$executeRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtext($1))`,
    `business_code:${cfg.lockKey}`,
  );

  // Lấy max dạng số từ các mã match regex; bỏ qua legacy.
  const rows = await tx.$queryRawUnsafe<Array<{ max_num: bigint | null }>>(
    `SELECT MAX(SUBSTRING(${cfg.column} FROM ${cfg.numberFrom})::bigint) AS max_num
     FROM ${cfg.table}
     WHERE ${cfg.column} ~ $1`,
    regex,
  );
  const next = Number(rows[0]?.max_num ?? 0n) + 1;
  return formatCode(kind, next, year);
}

/**
 * Sinh N mã liên tiếp trong CÙNG transaction, race-safe. Tất cả mã được
 * cấp phát từ 1 lần SELECT MAX; không có query MAX riêng rẽ trước
 * nested-create (DEC-T0-05: "không query MAX riêng rẽ trước khi
 * nested-create").
 *
 * Trả về mảng [next+1, next+2, ..., next+count].
 */
export async function nextBusinessCodeBatch(
  tx: Prisma.TransactionClient,
  kind: BusinessCodeKind,
  count: number,
  opts?: { readonly year?: number },
): Promise<string[]> {
  if (!Number.isInteger(count) || count <= 0) {
    throw new BusinessCodeError('INVALID_COUNT', `count=${count} phải là số nguyên dương.`);
  }
  if (count > 1000) {
    // Hard cap chống DoS; 1000 slot/transaction đã rất lớn cho nghiệp vụ staffing.
    throw new BusinessCodeError(
      'INVALID_COUNT',
      `count=${count} vượt trần 1000. Chia nhỏ request hoặc liên hệ platform.`,
    );
  }
  const cfg = CONFIG[kind];
  const year = opts?.year;
  if (cfg.includeYear) {
    if (typeof year !== 'number') {
      throw new BusinessCodeError(
        'YEAR_REQUIRED',
        `Business code kind '${kind}' yêu cầu opts.year.`,
      );
    }
    validateYear(year);
  }
  const regex = buildRegexFilter(kind, year);

  await tx.$executeRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtext($1))`,
    `business_code:${cfg.lockKey}`,
  );

  const rows = await tx.$queryRawUnsafe<Array<{ max_num: bigint | null }>>(
    `SELECT MAX(SUBSTRING(${cfg.column} FROM ${cfg.numberFrom})::bigint) AS max_num
     FROM ${cfg.table}
     WHERE ${cfg.column} ~ $1`,
    regex,
  );
  const start = Number(rows[0]?.max_num ?? 0n) + 1;
  const out: string[] = new Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = formatCode(kind, start + i, year);
  }
  return out;
}

/** Format 1 số thành mã hoàn chỉnh. */
function formatCode(kind: BusinessCodeKind, n: number, year?: number): string {
  const cfg = CONFIG[kind];
  const numStr = String(n).padStart(cfg.padWidth, '0');
  if (cfg.includeYear) {
    return `${cfg.prefix}-${year}-${numStr}`;
  }
  return `${cfg.prefix}-${numStr}`;
}

/** Expose CONFIG cho test (đọc-only). */
export const __INTERNAL_CONFIG__: Readonly<Record<BusinessCodeKind, KindConfig>> = CONFIG;
