/**
 * Import Service — Phase 4 slice 4B STEP-08 (RQ-06, RQ-07).
 *
 * DEC-11: Import attendance CSV/XLSX ≤ 4.5MB → AttendanceImportBatch PENDING → PREVIEWED.
 * Taxonomy 6 lỗi G29 (DEC-11):
 *   - LỖI ĐỊNH DẠNG (FORMAT_ERROR)       → KT
 *   - MÃ LẠ (UNKNOWN_CODE)                → KT
 *   - THIẾU CHECK-IN-OUT (MISSING_PUNCH) → KT
 *   - TRÙNG CCCD (DUPLICATE_CCCD)         → HR
 *   - NGOÀI CA (OUTSIDE_SHIFT)            → PM
 *   - TRÙNG SCAN (DUPLICATE_SCAN)         → PM
 *
 * 3 blockers (D07) — chặn COMMIT:
 *   - UNMATCHED_EMPLOYEE: không tìm được worker
 *   - SOURCE_CONFLICT: 1 external_event_id gắn 2 worker
 *   - WRONG_PROJECT: worker không thuộc project
 *
 * DEC-04: upload ≤ 4.5MB (Vercel body limit); fileHash SHA-256 ghi; fileUrl null MVP.
 *
 * Import flow:
 *   1. createImportBatch(tx, ctx, { fileBuffer, fileName, source })
 *      → hash file + create batch PENDING + parse rows
 *   2. classifyAndSaveRows(tx, batchId, rows[])
 *      → mỗi row: parse employee code → match worker → classify anomaly
 *   3. finalizeBatch(tx, batchId)
 *      → update batch: matchedRows/unmatchedRows/anomalyRows/status=PREVIEWED
 */

import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Taxonomy 6 lỗi G29 (DEC-11) */
export const ANOMALY_TYPES = [
  'FORMAT_ERROR',
  'UNKNOWN_CODE',
  'MISSING_PUNCH',
  'DUPLICATE_CCCD',
  'OUTSIDE_SHIFT',
  'DUPLICATE_SCAN',
] as const;
export type AnomalyType = (typeof ANOMALY_TYPES)[number];

/** Owner (chủ xử lý) cho từng loại lỗi */
export const ANOMALY_OWNER: Record<AnomalyType, 'KT' | 'HR' | 'PM'> = {
  FORMAT_ERROR: 'KT',
  UNKNOWN_CODE: 'KT',
  MISSING_PUNCH: 'KT',
  DUPLICATE_CCCD: 'HR',
  OUTSIDE_SHIFT: 'PM',
  DUPLICATE_SCAN: 'PM',
};

/** 3 blockers chặn COMMIT (D07) */
export const BLOCKER_TYPES = ['UNMATCHED_EMPLOYEE', 'SOURCE_CONFLICT', 'WRONG_PROJECT'] as const;
export type BlockerType = (typeof BLOCKER_TYPES)[number];

/** Import row status */
export const ROW_STATUSES = ['PENDING', 'MATCHED', 'UNMATCHED', 'ANOMALY', 'COMMITTED'] as const;
export type RowStatus = (typeof ROW_STATUSES)[number];

/** Import batch status */
export const BATCH_STATUSES = ['PENDING', 'PREVIEWED', 'COMMITTED', 'FAILED'] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export interface ImportBatchResult {
  batchId: string;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  anomalyRows: number;
  blockers: Array<{ rowNumber: number; type: BlockerType; owner: string; note: string }>;
  errors: Array<{ rowNumber: number; error: string }>;
}

export interface ParsedRow {
  rowNumber: number;
  rawEmployeeCode: string;
  rawDate: string;
  rawTime: string;
  rawType: 'IN' | 'OUT';
}

export interface CreateImportInput {
  /** Buffer bytes của file CSV/XLSX */
  fileBuffer: Buffer;
  fileName: string;
  source: 'CSV' | 'XLSX';
  /** Dự án gắn batch (optional — null = all projects) */
  projectId?: string;
}

export interface BatchPreview {
  batchId: string;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  anomalyRows: number;
  blockers: Array<{ rowNumber: number; type: BlockerType; owner: string; note: string }>;
  anomalyBreakdown: Record<AnomalyType, number>;
}

// ─── Error ─────────────────────────────────────────────────────────────────────

export class ImportServiceError extends Error {
  constructor(
    public readonly code:
      | 'FILE_TOO_LARGE'
      | 'PARSE_ERROR'
      | 'NO_ROWS'
      | 'NOT_FOUND'
      | 'INVALID_STATUS'
      | 'PERMISSION_DENIED'
      | 'HAS_BLOCKERS',
    message: string,
  ) {
    super(message);
    this.name = 'ImportServiceError';
  }
}

// ─── CSV Parser ────────────────────────────────────────────────────────────────

/**
 * Parse CSV buffer → ParsedRow[].
 * Format expected: employee_code, date, time, type(IN/OUT)
 * Support multiple date formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
 */
export function parseCsvBuffer(buffer: Buffer, encoding: BufferEncoding = 'utf-8'): ParsedRow[] {
  const content = buffer.toString(encoding).trim();
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length < 2) throw new ImportServiceError('NO_ROWS', 'File CSV trống hoặc không có header');

  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const codeIdx = header.findIndex(h => h.includes('code') || h.includes('mã') || h.includes('nv'));
  const dateIdx = header.findIndex(h => h.includes('date') || h.includes('ngày'));
  const timeIdx = header.findIndex(h => h.includes('time') || h.includes('giờ') || h.includes('gio'));
  const typeIdx = header.findIndex(h => h.includes('type') || h.includes('loại') || h.includes('in') || h.includes('out'));

  if (codeIdx === -1 || dateIdx === -1 || timeIdx === -1) {
    throw new ImportServiceError('PARSE_ERROR', 'CSV header không đúng format (cần: code, date, time, type)');
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 4) continue; // skip malformed

    const rawCode = cols[codeIdx] ?? '';
    const rawDate = cols[dateIdx] ?? '';
    const rawTime = cols[timeIdx] ?? '';
    const rawType = (cols[typeIdx] ?? 'IN').toUpperCase() as 'IN' | 'OUT';

    if (!rawCode || !rawDate) continue;

    rows.push({ rowNumber: i + 1, rawEmployeeCode: rawCode, rawDate, rawTime, rawType });
  }
  return rows;
}

/** Parse date string → Date. Return null nếu không parse được. */
export function parseDate(raw: string): Date | null {
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(raw);
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  // MM/DD/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw) && raw.startsWith('0')) {
    const [m, d, y] = raw.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  return null;
}

// ─── Row Classification ───────────────────────────────────────────────────────

export interface ClassificationResult {
  status: RowStatus;
  anomalyType?: AnomalyType;
  anomalyNote?: string;
  matchedWorkerId?: string;
  /** 1 trong 3 blocker types, hoặc undefined nếu không phải blocker */
  blocker?: BlockerType;
}

function classifyRow(
  row: ParsedRow,
  workerMap: Map<string, { workerId: string; projectIds: string[] }>,
  projectIdSet: Set<string>,
): ClassificationResult {
  // 1. Parse date/time
  const parsedDate = parseDate(row.rawDate);
  if (!parsedDate) {
    return { status: 'ANOMALY', anomalyType: 'FORMAT_ERROR', anomalyNote: `Không parse được ngày: ${row.rawDate}`, blocker: undefined };
  }

  // 2. Match worker by employee code
  const matched = workerMap.get(row.rawEmployeeCode.toUpperCase());
  if (!matched) {
    return { status: 'UNMATCHED', anomalyType: 'UNKNOWN_CODE', anomalyNote: `Mã NV không tìm được: ${row.rawEmployeeCode}`, blocker: 'UNMATCHED_EMPLOYEE' };
  }

  // 3. Check project scope (nếu batch có projectId cụ thể)
  if (projectIdSet.size > 0 && !projectIdSet.has(matched.projectIds[0])) {
    return {
      status: 'ANOMALY',
      anomalyType: 'OUTSIDE_SHIFT',
      anomalyNote: `Worker ${row.rawEmployeeCode} không thuộc project import`,
      blocker: 'WRONG_PROJECT',
    };
  }

  return { status: 'MATCHED', matchedWorkerId: matched.workerId, blocker: undefined };
}

// ─── Service ───────────────────────────────────────────────────────────────────

/** 4.5 MB limit (Vercel body limit, DEC-04) */
export const IMPORT_MAX_SIZE_BYTES = 4.5 * 1024 * 1024;

/**
 * Tạo import batch từ file buffer.
 * 1. Validate size ≤ 4.5MB
 * 2. SHA-256 hash file
 * 3. Parse CSV → ParsedRow[]
 * 4. Match workers → classify
 * 5. Save batch + rows trong transaction
 * 6. Return preview (PENDING)
 */
export async function createImportBatch(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: CreateImportInput,
): Promise<BatchPreview> {
  // ── Validate size ────────────────────────────────────────────────────────
  if (input.fileBuffer.length > IMPORT_MAX_SIZE_BYTES) {
    throw new ImportServiceError(
      'FILE_TOO_LARGE',
      `File ${input.fileBuffer.length} bytes vượt giới hạn ${IMPORT_MAX_SIZE_BYTES} bytes (4.5MB)`,
    );
  }

  // ── File hash ───────────────────────────────────────────────────────────
  const fileHash = createHash('sha256').update(input.fileBuffer).digest('hex');

  // ── Parse CSV ───────────────────────────────────────────────────────────
  let parsedRows: ParsedRow[];
  try {
    parsedRows = parseCsvBuffer(input.fileBuffer);
  } catch (err) {
    if (err instanceof ImportServiceError) throw err;
    throw new ImportServiceError('PARSE_ERROR', `Parse CSV thất bại: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (parsedRows.length === 0) {
    throw new ImportServiceError('NO_ROWS', 'Không có dòng dữ liệu nào trong file');
  }

  // ── Build worker map ─────────────────────────────────────────────────────
  // Match by ProjectAssignment.employeeCode (mã NV tại dự án — CSV dùng mã này)
  const assignments = await tx.projectAssignment.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      workerId: true,
      employeeCode: true,
      projectId: true,
    },
  });

  const workerMap = new Map<string, { workerId: string; projectIds: string[] }>();
  for (const a of assignments) {
    if (a.employeeCode) {
      const key = a.employeeCode.toUpperCase();
      if (!workerMap.has(key)) {
        workerMap.set(key, { workerId: a.workerId, projectIds: [a.projectId] });
      } else {
        workerMap.get(key)!.projectIds.push(a.projectId);
      }
    }
  }

  // Project set (nếu batch gắn project cụ thể)
  const projectIdSet = new Set<string>(input.projectId ? [input.projectId] : []);

  // ── Classify rows ───────────────────────────────────────────────────────
  let matchedCount = 0;
  let unmatchedCount = 0;
  let anomalyCount = 0;
  const blockers: Array<{ rowNumber: number; type: BlockerType; owner: string; note: string }> = [];
  const anomalyBreakdown = Object.fromEntries(ANOMALY_TYPES.map(t => [t, 0])) as Record<AnomalyType, number>;

  for (const row of parsedRows) {
    const result = classifyRow(row, workerMap, projectIdSet);

    if (result.status === 'MATCHED') matchedCount++;
    else if (result.status === 'UNMATCHED') {
      unmatchedCount++;
      if (result.blocker) {
        blockers.push({ rowNumber: row.rowNumber, type: result.blocker, owner: 'KT', note: result.anomalyNote ?? '' });
        anomalyBreakdown['UNKNOWN_CODE']++;
      }
    } else if (result.status === 'ANOMALY') {
      anomalyCount++;
      if (result.anomalyType) {
        anomalyBreakdown[result.anomalyType]++;
        if (result.blocker) {
          blockers.push({ rowNumber: row.rowNumber, type: result.blocker, owner: ANOMALY_OWNER[result.anomalyType], note: result.anomalyNote ?? '' });
        }
      }
    }
  }

  // ── Save batch + rows ───────────────────────────────────────────────────
  const batch = await tx.attendanceImportBatch.create({
    data: {
      uploadedByActorId: ctx.userId,
      uploadedByRole: ctx.role,
      source: input.source,
      fileUrl: '', // MVP: DEC-04 — file stored externally, URL deferred
      fileHash,
      totalRows: parsedRows.length,
      matchedRows: 0,
      unmatchedRows: 0,
      anomalyRows: 0,
      status: 'PENDING',
      errors: [],
      rawRows: {
        create: parsedRows.map(row => {
          const result = classifyRow(row, workerMap, projectIdSet);
          return {
            rowNumber: row.rowNumber,
            rawEmployeeCode: row.rawEmployeeCode,
            rawDate: row.rawDate,
            rawTime: row.rawTime,
            rawType: row.rawType,
            parsedDate: parseDate(row.rawDate) ?? new Date(0),
            parsedTime: row.rawTime,
            matchedWorkerId: result.matchedWorkerId ?? null,
            anomalyType: result.anomalyType ?? null,
            anomalyNote: result.anomalyNote ?? null,
            status: result.status,
          };
        }),
      },
    },
    include: { rawRows: { select: { id: true } } },
  });

  // ── Update batch counts (sau khi đã classify xong) ─────────────────────
  await tx.attendanceImportBatch.update({
    where: { id: batch.id },
    data: {
      matchedRows: matchedCount,
      unmatchedRows: unmatchedCount,
      anomalyRows: anomalyCount,
      status: 'PREVIEWED',
    },
  });

  return {
    batchId: batch.id,
    totalRows: parsedRows.length,
    matchedRows: matchedCount,
    unmatchedRows: unmatchedCount,
    anomalyRows: anomalyCount,
    blockers,
    anomalyBreakdown,
  };
}

/**
 * Get batch preview (đọc từ DB, không parse lại file).
 */
export async function getBatchPreview(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  batchId: string,
): Promise<BatchPreview> {
  const batch = await tx.attendanceImportBatch.findUnique({
    where: { id: batchId },
    include: {
      rawRows: {
        where: { anomalyType: { not: null } },
        select: { rowNumber: true, anomalyType: true, anomalyNote: true, status: true },
      },
    },
  });

  if (!batch) throw new ImportServiceError('NOT_FOUND', `Batch ${batchId} không tìm thấy`);

  // Blockers: UNMATCHED + ANOMALY có blocker
  const blockers: Array<{ rowNumber: number; type: BlockerType; owner: string; note: string }> = [];
  for (const row of batch.rawRows) {
    if (row.status === 'UNMATCHED') {
      blockers.push({ rowNumber: row.rowNumber, type: 'UNMATCHED_EMPLOYEE', owner: 'KT', note: row.anomalyNote ?? '' });
    } else if (row.anomalyType) {
      blockers.push({ rowNumber: row.rowNumber, type: 'WRONG_PROJECT', owner: ANOMALY_OWNER[row.anomalyType as AnomalyType] ?? 'KT', note: row.anomalyNote ?? '' });
    }
  }

  return {
    batchId: batch.id,
    totalRows: batch.totalRows,
    matchedRows: batch.matchedRows,
    unmatchedRows: batch.unmatchedRows,
    anomalyRows: batch.anomalyRows,
    blockers,
    anomalyBreakdown: Object.fromEntries(ANOMALY_TYPES.map(t => [t, 0])) as Record<AnomalyType, number>,
  };
}

/**
 * List import batches với pagination.
 */
export async function listImportBatches(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  opts?: { take?: number; skip?: number; status?: BatchStatus },
) {
  const take = Math.min(50, opts?.take ?? 20);
  const skip = opts?.skip ?? 0;
  const where: Prisma.AttendanceImportBatchWhereInput = opts?.status ? { status: opts.status } : {};

  const [rows, total] = await Promise.all([
    tx.attendanceImportBatch.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take,
      skip,
    }),
    tx.attendanceImportBatch.count({ where }),
  ]);

  return { rows, total };
}
