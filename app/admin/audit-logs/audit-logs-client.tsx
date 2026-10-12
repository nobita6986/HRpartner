'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  createdAt: string;
  diffSafe: unknown;
}

interface AuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  skip: number;
  take: number;
}

const PAGE_TAKE = 50;

/**
 * `/admin/audit-logs` — T1B-OPS Audit log viewer (ADMIN-only).
 *
 * DEC-T1B-OPS-02 / 03: Bảng tra cứu audit_log với filter + pagination. Default
 * filter `entityType=Worker`. Hiển thị `diffSafe` (PII đã được redact ở service).
 *
 * Permission: page wrapper (server component) check ADMIN-only; client component
 * chỉ render form/table — backend mới là authority cuối cùng.
 */
function AuditLogListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [entityType, setEntityType] = useState('Worker');
  const [entityId, setEntityId] = useState('');
  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [skip, setSkip] = useState(0);

  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sync from URL on first mount.
  useEffect(() => {
    setEntityType(searchParams.get('entityType') ?? 'Worker');
    setEntityId(searchParams.get('entityId') ?? '');
    setActorId(searchParams.get('actorId') ?? '');
    setAction(searchParams.get('action') ?? '');
    setFromDate(searchParams.get('fromDate') ?? '');
    setToDate(searchParams.get('toDate') ?? '');
    setSkip(parseInt(searchParams.get('skip') ?? '0', 10) || 0);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (entityType) params.set('entityType', entityType);
      if (entityId) params.set('entityId', entityId);
      if (actorId) params.set('actorId', actorId);
      if (action) params.set('action', action);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      params.set('skip', String(skip));
      params.set('take', String(PAGE_TAKE));

      const r = await fetch(`/api/admin/audit-logs?${params}`);
      if (!r.ok) {
        if (r.status === 401) { setError('Vui lòng đăng nhập.'); return; }
        if (r.status === 403) { setError('Bạn không có quyền tra cứu audit log.'); return; }
        throw new Error(`${r.status}`);
      }
      const d: AuditLogsResponse = await r.json();
      setData(d);
    } catch {
      setError('Không thể tải nhật ký kiểm toán.');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, actorId, action, fromDate, toDate, skip]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const applyFilter = () => {
    setSkip(0);
    const params = new URLSearchParams();
    if (entityType) params.set('entityType', entityType);
    if (entityId) params.set('entityId', entityId);
    if (actorId) params.set('actorId', actorId);
    if (action) params.set('action', action);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    router.replace(`/admin/audit-logs${params.toString() ? '?' + params.toString() : ''}`);
  };

  const page = Math.floor(skip / PAGE_TAKE) + 1;
  const hasPrev = skip > 0;
  const hasNext = data ? skip + PAGE_TAKE < data.total : false;

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6">
        <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">
          Nhật ký kiểm toán
        </h1>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
          Tra cứu lịch sử thao tác (mặc định: <strong>Worker</strong>). Thông tin
          nhạy cảm trong diff đã được ẩn tự động ở server.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4"
        style={{ borderColor: 'var(--outline-variant)', background: 'var(--surface-container-lowest)' }}>
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
            Loại bản ghi
          </label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          >
            <option value="Worker">Worker</option>
            <option value="LaborProfile">LaborProfile</option>
            <option value="User">User</option>
            <option value="ProjectAssignment">ProjectAssignment</option>
            <option value="PlacementCase">PlacementCase</option>
            <option value="Ticket">Ticket</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
            Mã bản ghi
          </label>
          <input
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="UUID"
            className="w-full rounded border px-3 py-2 text-sm font-mono"
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
            Hành động
          </label>
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="VD: WORKER_PERMANENT_DELETE"
            className="w-full rounded border px-3 py-2 text-sm font-mono"
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
            Người thao tác
          </label>
          <input
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            placeholder="User ID"
            className="w-full rounded border px-3 py-2 text-sm font-mono"
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
            Từ ngày
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
            Đến ngày
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-2">
          <button
            type="button"
            onClick={applyFilter}
            style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            className="rounded px-4 py-2 text-sm font-semibold"
          >
            Áp dụng
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--on-surface-variant)' }} className="py-12 text-center text-sm">
          Đang tải…
        </p>
      ) : error ? (
        <div
          style={{
            background: 'var(--error-container)',
            color: 'var(--on-error-container)',
            borderColor: 'var(--error)',
          }}
          className="rounded-lg border p-4 text-sm"
        >
          {error}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div
          style={{
            background: 'var(--surface-container-lowest)',
            borderColor: 'var(--outline-variant)',
            color: 'var(--on-surface-variant)',
          }}
          className="rounded-lg border p-8 text-center"
        >
          <p className="text-sm">Chưa có nhật ký nào khớp bộ lọc.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    background: 'var(--surface-container)',
                    borderBottom: '1px solid var(--outline-variant)',
                  }}
                >
                  {['Thời điểm', 'Hành động', 'Loại', 'Mã', 'Người thao tác', 'Lý do'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-3 text-left font-semibold"
                      style={{ color: 'var(--on-surface-variant)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom:
                        i < data.items.length - 1 ? '1px solid var(--outline-variant)' : 'none',
                    }}
                  >
                    <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3 font-mono text-xs">
                      {row.action}
                    </td>
                    <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3 text-xs">
                      {row.entityType}
                    </td>
                    <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs">
                      {row.entityId.slice(0, 8)}…
                    </td>
                    <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                      {row.actorId ? `${row.actorId.slice(0, 8)}…` : '—'}
                      {row.actorRole ? ` (${row.actorRole})` : ''}
                    </td>
                    <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                      {row.reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
              className="border-t px-4 py-2 text-xs"
            >
              Tổng: {data.total} bản ghi · Trang {page}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => setSkip(Math.max(0, skip - PAGE_TAKE))}
              className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
            >
              ← Trang trước
            </button>
            <span style={{ color: 'var(--on-surface-variant)' }} className="text-xs">
              Trang {page}
            </span>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => setSkip(skip + PAGE_TAKE)}
              className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
            >
              Trang sau →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[var(--on-surface-variant)]">Đang tải…</div>}>
      <AuditLogListInner />
    </Suspense>
  );
}