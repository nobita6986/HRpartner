/**
 * audit-logs.read-service.ts — T1B-OPS audit log viewer service (ADMIN-only).
 *
 * DEC-T1B-OPS-02 / 03: tra cứu audit_logs với filter + pagination cho ADMIN.
 * Diff (JSON) chứa PII (CCCD, phone, bank) — service ép buộc redact qua
 * `AUDIT_DIFF_PII_KEYS` deep-walk; key trùng (case-insensitive) → replace value
 * với '***'.
 *
 * Auth:
 *   - ADMIN-only (caller — route / page wrapper — phải gate trước; service vẫn
 *     re-check `assertAdminRole`).
 *   - HR_MANAGER / HR_STAFF / PM / … không được tra cứu.
 *
 * Out of scope: KHÔNG cho phép export Excel/CSV (Phase 4 §4); không cho phép
 * xóa audit log (immutable). Endpoint `GET /api/admin/audit-logs` chỉ đọc.
 */
import type { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';

/**
 * Các key trong JSON tree sẽ bị replace value → '***'. So khớp
 * case-insensitive theo segment cuối của key path.
 *
 * Lý do: tránh lộ CCCD/phone/bank account qua audit diff. Nếu audit_log có
 * field sensitive thì service redact — UI vẫn thấy shape diff nhưng value bị
 * mask.
 */
export const AUDIT_DIFF_PII_KEYS: ReadonlySet<string> = new Set([
  'cccdnumber',
  'phone',
  'bankaccount',
  'bankname',
  'bankbranch',
  'taxcode',
  'insurancecode',
  'cccdimageurl',
  'selfieimageurl',
]);

export interface AuditLogFilter {
  entityType?: string | null;
  entityId?: string | null;
  action?: string | null;
  actorId?: string | null;
  fromDate?: string;
  toDate?: string;
  skip?: number;
  take?: number;
}

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  createdAt: string;
  /** Diff đã được redact PII. */
  diffSafe: unknown;
}

export interface AuditLogListResponse {
  items: AuditLogItem[];
  total: number;
  skip: number;
  take: number;
}

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

/**
 * Re-throw AuthError nếu caller không phải ADMIN.
 */
export function assertAdminRole(role: string): asserts role is 'Admin' | 'ADMIN' {
  if (role !== 'ADMIN') {
    throw new AuthError(
      'FORBIDDEN',
      `Role ${role} không có quyền tra cứu nhật ký kiểm toán.`,
    );
  }
}

/**
 * Deep-redact PII keys. Mutate không — tạo bản sao.
 *
 * Quy tắc:
 *   - Plain object → iterate keys, nếu key match `AUDIT_DIFF_PII_KEYS`
 *     (case-insensitive) → value = '***'.
 *   - Array → recurse từng element.
 *   - Nested object → recurse.
 *   - Non-object value (string, number, boolean, null) → giữ nguyên.
 */
export function redactAuditDiff(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((v) => redactAuditDiff(v));
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (AUDIT_DIFF_PII_KEYS.has(k.toLowerCase())) {
        out[k] = '***';
      } else {
        out[k] = redactAuditDiff(v);
      }
    }
    return out;
  }
  return input;
}

/**
 * List audit_logs với filter + PII-redact.
 *
 * Permission: ADMIN-only — throws AuthError nếu role khác.
 *
 * Pagination: skip/take với `take <= MAX_TAKE` clamp.
 */
export async function listAuditLogs(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  filter: AuditLogFilter = {},
): Promise<AuditLogListResponse> {
  assertAdminRole(ctx.role);

  const take = Math.min(filter.take ?? DEFAULT_TAKE, MAX_TAKE);
  const skip = Math.max(filter.skip ?? 0, 0);

  const where: Prisma.AuditLogWhereInput = {};
  if (filter.entityType) where.entityType = filter.entityType;
  if (filter.entityId) where.entityId = filter.entityId;
  if (filter.action) where.action = filter.action;
  if (filter.actorId) where.actorId = filter.actorId;
  if (filter.fromDate || filter.toDate) {
    const range: Prisma.DateTimeFilter = {};
    if (filter.fromDate) range.gte = new Date(filter.fromDate);
    if (filter.toDate) {
      // include toDate's whole day
      const end = new Date(filter.toDate);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    where.createdAt = range;
  }

  const [total, rows] = await Promise.all([
    tx.auditLog.count({ where }),
    tx.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        action: true,
        entityType: true,
        entityId: true,
        reason: true,
        diff: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      actorId: r.actorId,
      actorRole: r.actorRole,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
      diffSafe: redactAuditDiff(r.diff),
    })),
    total,
    skip,
    take,
  };
}

/**
 * AuthError — typed error cho auth/permission failure.
 * Route layer map sang HTTP 401/403.
 */
export class AuthError extends Error {
  constructor(
    public readonly code: 'FORBIDDEN' | 'UNAUTHENTICATED',
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}