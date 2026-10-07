/**
 * GET /api/admin/worker-delete-history
 *
 * Tra cứu lịch sử xóa người lao động từ `audit_logs` với action
 * `WORKER_PERMANENT_DELETE` (entityType = 'Worker'). Phục vụ operator xem
 * lại các lần xóa đã thực hiện để kiểm tra/đối chiếu.
 *
 * Auth:
 *   - 401 nếu thiếu session.
 *   - 403 nếu role không thuộc {ADMIN, HR_MANAGER, DIRECTOR}.
 *
 * Quy tắc projection:
 *   - `before.fullName` / `before.userId` mask '***' khi thiếu
 *     `CAN_VIEW_WORKER_SENSITIVE`.
 *   - CCCD/CCCD image/selfie image KHÔNG xuất hiện trong `before` snapshot
 *     (service `deleteWorker` chỉ ghi 4 trường canonical: id, userId,
 *     fullName, createdAt) — giữ nguyên từ T1B.
 *
 * Phân trang / lọc:
 *   - `?take=` (1..200, default 50)
 *   - `?skip=` (default 0)
 *   - `?from=` ISO date (YYYY-MM-DD). Nếu truyền → `createdAt >= from`.
 *   - `?to=` ISO date (YYYY-MM-DD). Nếu truyền → `createdAt < to+1day`.
 *   - `?search=` match case-insensitive `actor.name`, `reason`,
 *     `before.fullName`, `before.userId`. Khi `canSeeSensitive` = false,
 *     KHÔNG search `before.fullName`/`before.userId`.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { withDbContext } from '@/src/shared/auth/with-db-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR']);

const MASKED = '***';

interface DeleteHistoryItem {
  auditId: string;
  deletedAt: string;
  actorId: string | null;
  actorRole: string | null;
  actorName: string | null;
  reason: string | null;
  before: {
    id: string | null;
    userId: string | null;
    fullName: string | null;
    createdAt: string | null;
  };
}

function maskPII(value: string | null | undefined): string | null {
  if (value == null) return null;
  return MASKED;
}

function parseIsoDate(s: string): Date | null {
  if (!s) return null;
  // YYYY-MM-DD only — refuse anything else to avoid TZ ambiguity.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

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

  if (!ALLOWED_ROLES.has(ctx.role)) {
    return NextResponse.json(
      {
        error: 'FORBIDDEN',
        message: `Role ${ctx.role} không có quyền xem lịch sử xóa người lao động.`,
      },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const takeRaw = parseInt(searchParams.get('take') ?? '50', 10);
  const take = Number.isFinite(takeRaw) ? Math.min(Math.max(takeRaw, 1), 200) : 50;
  const skipRaw = parseInt(searchParams.get('skip') ?? '0', 10);
  const skip = Number.isFinite(skipRaw) ? Math.max(skipRaw, 0) : 0;
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const search = searchParams.get('search')?.trim() || '';

  const fromDate = fromParam ? parseIsoDate(fromParam) : null;
  const toDate = toParam ? parseIsoDate(toParam) : null;
  if (fromParam && !fromDate) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'from phải là YYYY-MM-DD' },
      { status: 400 },
    );
  }
  if (toParam && !toDate) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'to phải là YYYY-MM-DD' },
      { status: 400 },
    );
  }
  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'from phải nhỏ hơn hoặc bằng to' },
      { status: 400 },
    );
  }

  const permissions = await resolveEffectivePermissions({
    userId: ctx.userId,
    role: ctx.role,
  });
  const canSeeSensitive = permissions.has('CAN_VIEW_WORKER_SENSITIVE');

  const where: Prisma.AuditLogWhereInput = {
    entityType: 'Worker',
    action: 'WORKER_PERMANENT_DELETE',
  };
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) (where.createdAt as Prisma.DateTimeFilter).gte = fromDate;
    if (toDate) {
      const toExclusive = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);
      (where.createdAt as Prisma.DateTimeFilter).lt = toExclusive;
    }
  }
  if (search) {
    // Search only over fields visible to the current role.
    const ors: Prisma.AuditLogWhereInput[] = [
      { reason: { contains: search, mode: 'insensitive' } },
    ];
    if (canSeeSensitive) {
      // Search over JSON fields via Prisma `path` filter (Postgres supported).
      ors.push({
        diff: {
          path: ['before', 'fullName'],
          string_contains: search,
        },
      });
      ors.push({
        diff: {
          path: ['before', 'userId'],
          string_contains: search,
        },
      });
    }
    // Search over actor.name requires a User lookup; we fall back to actorId exact-match
    // (no PII) — keeps the API self-contained without an extra join in the where clause.
    if (search.length <= 64) ors.push({ actorId: { contains: search } });
    where.OR = ors;
  }

  const prisma = getPrisma();
  try {
    const data = await withDbContext(prisma, ctx, async (tx) => {
      const [total, rows] = await Promise.all([
        tx.auditLog.count({ where }),
        tx.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
          skip,
          select: {
            id: true,
            createdAt: true,
            actorId: true,
            actorRole: true,
            reason: true,
            diff: true,
          },
        }),
      ]);
      return { total, rows };
    });

    // Resolve actor names (best-effort; missing = null). Best effort.
    const actorIds = Array.from(new Set(data.rows.map(r => r.actorId).filter((v): v is string => Boolean(v))));
    const actorMap = new Map<string, string | null>();
    if (actorIds.length > 0) {
      const actors = await withDbContext(prisma, ctx, async (tx) => {
        return tx.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true },
        });
      });
      for (const a of actors) actorMap.set(a.id, a.name);
    }

    const items: DeleteHistoryItem[] = data.rows.map(row => {
      const diffObj = (row.diff && typeof row.diff === 'object' ? row.diff : {}) as Record<string, unknown>;
      const before = (diffObj.before && typeof diffObj.before === 'object' ? diffObj.before : {}) as Record<string, unknown>;
      const beforeId = typeof before.id === 'string' ? before.id : null;
      const beforeUserId = typeof before.userId === 'string' ? before.userId : null;
      const beforeFullName = typeof before.fullName === 'string' ? before.fullName : null;
      const beforeCreatedAt =
        typeof before.createdAt === 'string'
          ? before.createdAt
          : before.createdAt instanceof Date
            ? before.createdAt.toISOString()
            : null;
      return {
        auditId: row.id,
        deletedAt: row.createdAt.toISOString(),
        actorId: row.actorId,
        actorRole: row.actorRole,
        actorName: row.actorId ? (actorMap.get(row.actorId) ?? null) : null,
        reason: row.reason,
        before: {
          id: beforeId,
          userId: canSeeSensitive ? beforeUserId : maskPII(beforeUserId),
          fullName: canSeeSensitive ? beforeFullName : maskPII(beforeFullName),
          createdAt: beforeCreatedAt,
        },
      };
    });

    return NextResponse.json({ items, total: data.total, take, skip });
  } catch (err) {
    console.error('[api/admin/worker-delete-history] error:', err);
    return NextResponse.json(
      {
        error: 'INTERNAL',
        message: 'Không thể tải lịch sử xóa người lao động. Vui lòng thử lại.',
      },
      { status: 500 },
    );
  }
}