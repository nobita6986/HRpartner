/**
 * /admin/workers/delete-history
 *
 * Bảng tra cứu lịch sử xóa người lao động từ `audit_logs` (action
 * `WORKER_PERMANENT_DELETE`).
 *
 * Auth: ADMIN + HR_MANAGER + DIRECTOR (route `app/api/admin/worker-delete-history/route.ts`
 * mirror cùng ALLOWED_ROLES). HR_STAFF/PM/SALE vào URL trực tiếp → render
 * placeholder không lộ dữ liệu nhạy cảm.
 *
 * Phân trang/lọc đồng bộ với API:
 *   - `?take=`, `?skip=`, `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`, `?search=`
 *
 * PII: `before.fullName` / `before.userId` mask theo `CAN_VIEW_WORKER_SENSITIVE`.
 */

import { redirect } from 'next/navigation';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import type { Prisma } from '@prisma/client';
import { Breadcrumb } from '@/src/shared/ui/navigation/breadcrumb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Lịch sử xóa người lao động — HRP',
};

const ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR']);

const MASKED = '***';

interface HistoryRow {
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

interface PageProps {
  searchParams: Promise<{
    take?: string;
    skip?: string;
    from?: string;
    to?: string;
    search?: string;
  }>;
}

function parseIsoDate(s: string | undefined): Date | null {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function maskPII(value: string | null | undefined): string | null {
  if (value == null) return null;
  return MASKED;
}

export default async function WorkerDeleteHistoryPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect('/auth/login?returnUrl=/admin/workers/delete-history');
  }
  if (!ALLOWED_ROLES.has(session.role)) {
    return (
      <div className="p-10 max-w-3xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Người lao động', href: '/admin/workers' },
            { label: 'Lịch sử xóa' },
          ]}
        />
        <h1 className="mt-4 text-2xl font-semibold text-[var(--on-surface)]">
          Lịch sử xóa người lao động
        </h1>
        <p className="mt-2 text-sm text-red-600">
          Bạn không có quyền xem lịch sử xóa người lao động.
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const take = Math.min(Math.max(parseInt(params.take ?? '50', 10) || 50, 1), 200);
  const skip = Math.max(parseInt(params.skip ?? '0', 10) || 0, 0);
  const fromParam = params.from;
  const toParam = params.to;
  const search = params.search?.trim() || '';

  const fromDate = parseIsoDate(fromParam);
  const toDate = parseIsoDate(toParam);

  const permissions = await resolveEffectivePermissions({
    userId: session.userId,
    role: session.role,
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
    const ors: Prisma.AuditLogWhereInput[] = [
      { reason: { contains: search, mode: 'insensitive' } },
    ];
    if (canSeeSensitive) {
      ors.push({ diff: { path: ['before', 'fullName'], string_contains: search } });
      ors.push({ diff: { path: ['before', 'userId'], string_contains: search } });
    }
    if (search.length <= 64) ors.push({ actorId: { contains: search } });
    where.OR = ors;
  }

  const prisma = getPrisma();
  const { rows, total } = await withDbContext(prisma, session as never, async tx => {
    const [r, totalRows] = await Promise.all([
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
      tx.auditLog.count({ where }),
    ]);
    return { rows: r, total: totalRows };
  });

  // Resolve actor names (best-effort; missing → null).
  const actorIds = Array.from(new Set(rows.map(r => r.actorId).filter((v): v is string => Boolean(v))));
  const actorMap = new Map<string, string | null>();
  if (actorIds.length > 0) {
    const actors = await withDbContext(prisma, session as never, async tx =>
      tx.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }),
    );
    for (const a of actors) actorMap.set(a.id, a.name);
  }

  const items: HistoryRow[] = rows.map(row => {
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

  const totalPages = Math.max(1, Math.ceil(total / take));
  const currentPage = Math.floor(skip / take) + 1;

  function pageHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (fromParam) sp.set('from', fromParam);
    if (toParam) sp.set('to', toParam);
    if (search) sp.set('search', search);
    sp.set('take', String(take));
    sp.set('skip', String((targetPage - 1) * take));
    return `/admin/workers/delete-history?${sp.toString()}`;
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto space-y-6">
      <Breadcrumb
        items={[
          { label: 'Người lao động', href: '/admin/workers' },
          { label: 'Lịch sử xóa' },
        ]}
      />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--on-surface)]">
            Lịch sử xóa người lao động
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)] mt-1">
            Tra cứu các lần xóa người lao động đã được ghi nhận vào nhật ký kiểm toán.
          </p>
        </div>
      </header>

      <form
        action="/admin/workers/delete-history"
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
        style={{
          background: 'var(--surface-container-lowest)',
          borderColor: 'var(--outline-variant)',
        }}
      >
        <div>
          <label className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1">
            Từ ngày
          </label>
          <input
            type="date"
            name="from"
            defaultValue={fromParam ?? ''}
            className="rounded border px-3 py-1.5 text-sm"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--outline)',
              color: 'var(--on-surface)',
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1">
            Đến ngày
          </label>
          <input
            type="date"
            name="to"
            defaultValue={toParam ?? ''}
            className="rounded border px-3 py-1.5 text-sm"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--outline)',
              color: 'var(--on-surface)',
            }}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1">
            Tìm theo lý do / mã nhân viên / tên
          </label>
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder={canSeeSensitive ? 'lý do, mã, tên…' : 'lý do…'}
            className="w-full rounded border px-3 py-1.5 text-sm"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--outline)',
              color: 'var(--on-surface)',
            }}
          />
        </div>
        <button
          type="submit"
          className="rounded px-4 py-2 text-sm font-semibold"
          style={{
            background: 'var(--primary)',
            color: 'var(--on-primary)',
          }}
        >
          Lọc
        </button>
        <a
          href="/admin/workers/delete-history"
          className="rounded px-4 py-2 text-sm font-medium"
          style={{
            background: 'var(--surface-container)',
            color: 'var(--on-surface)',
          }}
        >
          Đặt lại
        </a>
      </form>

      <div
        className="overflow-x-auto rounded-lg border"
        style={{ borderColor: 'var(--outline-variant)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                background: 'var(--surface-container)',
                borderBottom: '1px solid var(--outline-variant)',
              }}
            >
              {[
                'Thời điểm xóa',
                'Người thực hiện',
                'Lý do',
                'Mã bị xóa',
                'Họ tên',
                'Ngày tạo',
              ].map(h => (
                <th
                  key={h}
                  scope="col"
                  style={{ color: 'var(--on-surface-variant)' }}
                  className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ color: 'var(--on-surface-variant)' }}
                  className="px-4 py-8 text-center"
                >
                  Chưa có lần xóa nào được ghi nhận trong vùng lọc này.
                </td>
              </tr>
            ) : (
              items.map(item => (
                <tr
                  key={item.auditId}
                  style={{
                    borderBottom: '1px solid var(--outline-variant)',
                  }}
                >
                  <td
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="px-4 py-3 text-xs whitespace-nowrap"
                  >
                    {new Date(item.deletedAt).toLocaleString('vi-VN')}
                  </td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">
                    {item.actorName ?? (
                      <span style={{ color: 'var(--on-surface-variant)' }}>
                        {item.actorId ?? '—'}
                      </span>
                    )}
                    {item.actorRole && (
                      <div className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                        {item.actorRole}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">
                    {item.reason ?? (
                      <span style={{ color: 'var(--on-surface-variant)' }}>—</span>
                    )}
                  </td>
                  <td
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="px-4 py-3 font-mono text-xs"
                  >
                    {item.before.userId ?? '—'}
                  </td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">
                    {item.before.fullName ?? (
                      <span style={{ color: 'var(--on-surface-variant)' }}>—</span>
                    )}
                  </td>
                  <td
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="px-4 py-3 text-xs"
                  >
                    {item.before.createdAt
                      ? new Date(item.before.createdAt).toLocaleDateString('vi-VN')
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div
          style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
          className="border-t px-4 py-2 text-xs"
        >
          Tổng: {total} lần xóa
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <a
            aria-disabled={currentPage <= 1}
            href={currentPage > 1 ? pageHref(currentPage - 1) : '#'}
            className={`rounded px-3 py-1 text-sm ${
              currentPage <= 1 ? 'pointer-events-none opacity-50' : ''
            }`}
            style={{
              background: 'var(--surface-container-high)',
              color: 'var(--on-surface)',
            }}
          >
            ← Trước
          </a>
          <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Trang {currentPage} / {totalPages}
          </span>
          <a
            aria-disabled={currentPage >= totalPages}
            href={currentPage < totalPages ? pageHref(currentPage + 1) : '#'}
            className={`rounded px-3 py-1 text-sm ${
              currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''
            }`}
            style={{
              background: 'var(--surface-container-high)',
              color: 'var(--on-surface)',
            }}
          >
            Sau →
          </a>
        </div>
      )}
    </div>
  );
}