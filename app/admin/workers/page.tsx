'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { workerStatusLabel, workerStatusTone } from '@/src/domains/workforce/worker-ui';
import type { WorkerEmploymentStatus } from '@/src/domains/workforce/worker-ui';
import { StatusBadge } from '@/src/shared/ui/status-badge';

interface WorkerRow {
  id: string;
  userId: string;
  fullName: string;
  employmentStatus: WorkerEmploymentStatus | null;
  phone: string | null;
  createdAt: string;
}

interface EnrichmentRow {
  currentJob: {
    projectId: string;
    projectCode: string;
    projectName: string;
    assignmentStatus: string;
  } | null;
  firstJobStartedAt: string | null;
  pmName: string | null;
  commissionBeneficiary: { userId: string; name: string | null } | null;
}

interface WorkersResponse {
  workers: WorkerRow[];
  enrichment: Record<string, EnrichmentRow>;
  total: number;
  take: number;
  skip: number;
}

/**
 * `/admin/workers` — M5 Người lao động (T1B PRE-P2 HOTFIX, T1C admin-ux-hotfix 2).
 *
 * Bảng gọn, CTA KHÔNG POST Worker rời rạc — dẫn operator sang luồng
 * "Tiếp nhận người lao động" tại `/admin/labor-profiles/new`. Worker chỉ
 * tồn tại qua conversion flow (`linkLaborProfileWorker` / PR #107), tạo
 * POST trực tiếp sẽ phá invariant `LaborProfile.workerId`. Row click
 * mở detail tại `/admin/workers/[id]`.
 *
 * Cột vận hành (T1C admin-ux-hotfix 2 — DEC-03):
 *   - "Dự án/Job đang làm": ProjectAssignment ACTIVE mới nhất → Project.code/name.
 *     Fallback sang assignment gần nhất nếu không ACTIVE.
 *   - "Ngày làm đầu tiên": MIN(EmploymentEpisode.startedAt, ProjectAssignment.validFrom)
 *     qua Worker. KHÔNG suy diễn từ Worker.createdAt.
 *   - "Quản lý dự án": Project.pmUser.name. NULL → "—".
 *   - "Người hưởng hoa hồng": CommissionLedger.ctvId CTV mới nhất gắn Worker
 *     (User.name). KHÔNG fallback sang Worker.assignedToId.
 *
 * Phân biệt với `/admin/labor-profiles` (Hồ sơ tiếp nhận): chưa convert
 * vẫn là LaborProfile, không phải Worker.
 */
export default function WorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [enrichment, setEnrichment] = useState<Record<string, EnrichmentRow>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
      setEnrichment(d.enrichment ?? {});
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
    <div style={{ background: 'var(--surface)' }} className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
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
                  'Mã',
                  'Họ tên',
                  'Điện thoại',
                  'Trạng thái',
                  'Dự án/Job đang làm',
                  'Ngày làm đầu tiên',
                  'Quản lý dự án',
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
              {workers.map((w, i) => {
                const e = enrichment[w.id];
                return (
                  <tr
                    key={w.id}
                    className="cursor-pointer transition-colors duration-150 ease-out hover:bg-[var(--color-surface-container)]"
                    style={{
                      borderBottom: i < workers.length - 1 ? '1px solid var(--outline-variant)' : 'none',
                    }}
                    onClick={() => router.push(`/admin/workers/${w.id}`)}
                  >
                    <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                      {w.userId}
                    </td>
                    <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3 whitespace-nowrap">
                      {w.fullName}
                    </td>
                    <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                      {w.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge
                        module="worker"
                        status={w.employmentStatus ?? 'NONE'}
                        tone={workerStatusTone(w.employmentStatus)}
                      >
                        {workerStatusLabel(w.employmentStatus)}
                      </StatusBadge>
                    </td>
                    <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3 text-xs">
                      {e?.currentJob ? (
                        <>
                          <span className="font-mono">{e.currentJob.projectCode}</span>{' '}
                          {e.currentJob.projectName}
                        </>
                      ) : (
                        <span style={{ color: 'var(--on-surface-variant)' }}>—</span>
                      )}
                    </td>
                    <td
                      style={{ color: 'var(--on-surface-variant)' }}
                      className="px-4 py-3 text-xs whitespace-nowrap"
                    >
                      {e?.firstJobStartedAt
                        ? new Date(e.firstJobStartedAt).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                      {e?.pmName ?? '—'}
                    </td>
                    <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                      {e?.commissionBeneficiary?.name ?? '—'}
                    </td>
                  </tr>
                );
              })}
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