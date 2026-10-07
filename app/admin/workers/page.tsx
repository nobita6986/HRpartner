'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { workerStatusLabel, workerStatusTone } from '@/src/domains/workforce/worker-ui';
import type { WorkerEmploymentStatus } from '@/src/domains/workforce/worker-ui';
import { StatusBadge } from '@/src/shared/ui/status-badge';

interface WorkerRow {
  id: string;
  userId: string;
  fullName: string | null;
  employmentStatus: WorkerEmploymentStatus | null;
  phone: string | null;
  currentProject: { id: string; code: string | null; name: string | null } | null;
  firstWorkDate: string | null;
  currentProjectManager: string | null;
  handler: string | null;
  referrer: string | null;
  commissionBeneficiary: string | null;
}

interface WorkersResponse {
  workers: WorkerRow[];
  total: number;
  take: number;
  skip: number;
}

/**
 * `/admin/workers` — Quản lý thông tin và trạng thái người lao động (T1B-OPS).
 *
 * T1B-OPS — Copy DEC-T1B-OPS-04: bỏ mã phân hệ nội bộ (M5) khỏi UI; mô tả
 * ngắn "Quản lý thông tin và trạng thái người lao động.".
 *
 * T1B-OPS — Bảng thêm 6 cột vận hành dùng canonical relational data:
 *   - currentProject        : ProjectAssignment.status IN (ACTIVE, PAUSED) mới nhất
 *   - firstWorkDate         : MIN(EmploymentEpisode.startedAt) (KHÔNG dùng Worker.createdAt)
 *   - currentProjectManager : Project.pmUserId (qua active assignment)
 *   - handler               : Worker.assignedToId
 *   - referrer              : ProjectAssignment.referrerId
 *   - commissionBeneficiary : SourceClaim.ctvId (claimType='CTV_REFERRAL', accepted=true)
 *
 * Phân biệt rõ 4 thực thể người:
 *   - Quản lý dự án ≠ Người phụ trách (handler) ≠ Người giới thiệu (referrer)
 *     ≠ Người hưởng hoa hồng (CTV_REFERRAL accepted).
 *
 * CTA không POST Worker rời rạc — dẫn sang luồng "Tiếp nhận người lao động"
 * tại `/admin/labor-profiles/new` (Worker chỉ tồn tại qua conversion flow
 * `linkLaborProfileWorker`). Row click mở detail tại `/admin/workers/[id]`
 * (ĐÃ BỎ cột Thao tác / nút "Xem" riêng — T1B-OPS DEC-T1B-OPS-04).
 */
export default function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // T1B-OPS follow-up #1: hiển thị banner "Đã xóa người lao động …" khi list
  // được mở từ luồng delete thành công (redirect kèm ?deleted=<id>&name=<name>).
  // Banner render NGAY TRƯỚC filter row; auto-dismiss sau 6s; vẫn cho phép
  // đóng thủ công. useSearchParams yêu cầu Suspense boundary, đã có sẵn ở
  // layout mức app vì /admin/workers nằm trong admin segment.
  const searchParams = useSearchParams();
  const deletedId = searchParams?.get('deleted') ?? null;
  const deletedNameRaw = searchParams?.get('name') ?? null;
  const deletedName = (() => {
    if (!deletedNameRaw) return null;
    try { return decodeURIComponent(deletedNameRaw); } catch { return null; }
  })();
  const [showDeletedBanner, setShowDeletedBanner] = useState<boolean>(Boolean(deletedId));

  useEffect(() => {
    if (!deletedId) return;
    setShowDeletedBanner(true);
    const t = setTimeout(() => setShowDeletedBanner(false), 6000);
    return () => clearTimeout(t);
  }, [deletedId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ take: '50' });
      if (statusFilter) params.set('status', statusFilter);
      const r = await fetch(`/api/workers?${params}`);
      if (!r.ok) {
        if (r.status === 401) {
          setError('Vui lòng đăng nhập.');
          return;
        }
        if (r.status === 403) {
          setError('Bạn không có quyền xem.');
          return;
        }
        throw new Error(`${r.status}`);
      }
      const d: WorkersResponse = await r.json();
      setWorkers(d.workers);
      setTotal(d.total);
    } catch {
      setError('Không thể tải danh sách người lao động.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">
            Danh sách người lao động
          </h1>
          <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
            Quản lý thông tin và trạng thái người lao động.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/workers/delete-history"
            style={{
              background: 'var(--surface-container)',
              color: 'var(--on-surface)',
            }}
            className="rounded border px-4 py-2 text-sm font-medium"
          >
            Lịch sử xóa
          </Link>
          <Link
            href="/admin/labor-profiles/new"
            style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            className="rounded px-4 py-2 text-sm font-semibold"
          >
            + Tiếp nhận người lao động
          </Link>
        </div>
      </div>

      {showDeletedBanner && deletedId && (
        <div
          role="status"
          aria-live="polite"
          style={{
            // T1B-OPS follow-up #1: dùng semantic tokens đã đăng ký trong
            // app/globals.css (`--success-soft` + `--success` + `--on-surface`).
            // KHÔNG dùng `--success-container` / `--on-success-container` /
            // `--success` vì các alias "container" chưa tồn tại trong
            // design-token gate RQ-04/AC-03.
            background: 'var(--color-success-soft)',
            color: 'var(--color-success)',
            borderColor: 'var(--color-success)',
          }}
          className="mb-4 flex items-start justify-between gap-3 rounded-lg border p-3"
        >
          <p className="text-sm font-medium">
            Đã xóa người lao động
            {deletedName ? <strong className="font-semibold"> {deletedName}</strong> : null}
            . Hành động đã được ghi vào{' '}
            <Link
              href={`/admin/audit-logs?entityType=Worker&entityId=${encodeURIComponent(deletedId)}&action=WORKER_PERMANENT_DELETE`}
              style={{ color: 'var(--color-on-surface)' }}
              className="underline"
            >
              nhật ký kiểm toán
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={() => setShowDeletedBanner(false)}
            aria-label="Đóng thông báo"
            className="rounded px-2 py-1 text-xs font-semibold"
            style={{ color: 'var(--color-on-surface)' }}
          >
            Đóng
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {['', 'NONE', 'ACTIVE', 'SUSPENDED', 'TERMINATED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                borderColor: statusFilter === s ? 'var(--primary)' : 'var(--outline-variant)',
                background: statusFilter === s ? 'var(--primary-container)' : 'var(--surface-container-lowest)',
                color: statusFilter === s ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
              }}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
            >
              {s === '' ? 'Tất cả' : workerStatusLabel(s)}
            </button>
          ))}
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
      ) : workers.length === 0 ? (
        <div
          style={{
            background: 'var(--surface-container-lowest)',
            borderColor: 'var(--outline-variant)',
            color: 'var(--on-surface-variant)',
          }}
          className="rounded-lg border p-8 text-center"
        >
          <p className="text-sm">Chưa có người lao động nào.</p>
          <p className="mt-2 text-xs">
            Người chưa chuyển đổi vẫn là{' '}
            <Link href="/admin/labor-profiles" style={{ color: 'var(--primary)' }} className="underline">
              Hồ sơ tiếp nhận
            </Link>
            . Tạo mới tại{' '}
            <Link href="/admin/labor-profiles/new" style={{ color: 'var(--primary)' }} className="underline">
              /admin/labor-profiles/new
            </Link>
            .
          </p>
        </div>
      ) : (
        <div style={{ borderColor: 'var(--outline-variant)' }} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  background: 'var(--surface-container)',
                  borderBottom: '1px solid var(--outline-variant)',
                }}
              >
                {[
                  'Họ tên',
                  'Trạng thái',
                  'Dự án đang làm',
                  'Ngày làm đầu tiên',
                  'Quản lý dự án',
                  'Người phụ trách',
                  'Người giới thiệu',
                  'Người hưởng hoa hồng',
                ].map(h => (
                  <th
                    key={h}
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                    scope="col"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workers.map((w, i) => (
                <tr
                  key={w.id}
                  className="cursor-pointer transition-colors duration-150 ease-out hover:bg-[var(--color-surface-container)]"
                  style={{
                    borderBottom: i < workers.length - 1 ? '1px solid var(--outline-variant)' : 'none',
                  }}
                  onClick={() => {
                    window.location.href = `/admin/workers/${w.id}`;
                  }}
                >
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">
                    {w.fullName ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      module="worker"
                      status={w.employmentStatus ?? 'NONE'}
                      tone={workerStatusTone(w.employmentStatus)}
                    >
                      {workerStatusLabel(w.employmentStatus)}
                    </StatusBadge>
                  </td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3 text-xs">
                    {w.currentProject
                      ? `${w.currentProject.code ?? '—'}${w.currentProject.name ? ` · ${w.currentProject.name}` : ''}`
                      : '—'}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs whitespace-nowrap">
                    {w.firstWorkDate ? new Date(w.firstWorkDate).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {w.currentProjectManager ?? '—'}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {w.handler ?? '—'}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {w.referrer ?? '—'}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {w.commissionBeneficiary ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
            className="border-t px-4 py-2 text-xs"
          >
            Tổng: {total} người lao động
          </div>
        </div>
      )}
    </div>
  );
}
