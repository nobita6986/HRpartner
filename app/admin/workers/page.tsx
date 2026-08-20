'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

type WorkerStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
type WorkerRole = 'TECHNICIAN' | 'SUPERVISOR' | 'FOREMAN' | 'QC' | 'OTHER';

interface WorkerRow {
  id: string;
  empCode: string;
  fullName: string;
  status: WorkerStatus;
  role: WorkerRole;
  phone: string | null;
  project: { id: string; name: string; code: string } | null;
  createdAt: string;
}

interface WorkersResponse {
  workers: WorkerRow[];
  total: number;
  take: number;
  skip: number;
}

const STATUS_CONFIG: Record<WorkerStatus, { label: string; color: string; bg: string }> = {
  ACTIVE:     { label: 'Đang làm',   color: '#197a56', bg: '#e8f5e9' },
  ON_LEAVE:   { label: 'Nghỉ phép',  color: '#e65100', bg: '#fff3e0' },
  SUSPENDED:  { label: 'Tạm ngưng',  color: '#6a1b9a', bg: '#f3e5f5' },
  TERMINATED: { label: 'Đã nghỉ',    color: '#c62828', bg: '#ffebee' },
};

const ROLE_LABELS: Record<WorkerRole, string> = {
  TECHNICIAN: 'Thợ',
  SUPERVISOR: 'Giám sát',
  FOREMAN:    'Trưởng nhóm',
  QC:         'QC',
  OTHER:      'Khác',
};

function StatusBadge({ status }: { status: WorkerStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#37474f', bg: '#eceff1' };
  return (
    <span
      style={{ background: cfg.bg, color: cfg.color }}
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
    >
      {cfg.label}
    </span>
  );
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ take: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const r = await fetch(`/api/workers?${params}`);
      if (!r.ok) {
        if (r.status === 401) { setError('Vui lòng đăng nhập.'); return; }
        if (r.status === 403) { setError('Bạn không có quyền xem.'); return; }
        throw new Error(`${r.status}`);
      }
      const d: WorkersResponse = await r.json();
      setWorkers(d.workers);
      setTotal(d.total);
    } catch {
      setError('Không thể tải danh sách nhân viên.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">Nhân viên</h1>
          <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
            Module M5 — Quản lý master data nhân viên
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Tìm kiếm mã / tên / SĐT…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          className="rounded border px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {['', 'ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'].map(s => (
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
              {s === '' ? 'Tất cả' : STATUS_CONFIG[s as WorkerStatus]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--on-surface-variant)' }} className="py-12 text-center text-sm">Đang tải…</p>
      ) : error ? (
        <div
          style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', borderColor: 'var(--error)' }}
          className="rounded-lg border p-4 text-sm"
        >
          {error}
        </div>
      ) : workers.length === 0 ? (
        <div
          style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
          className="rounded-lg border p-8 text-center"
        >
          <p className="text-sm">Chưa có nhân viên nào.</p>
        </div>
      ) : (
        <div style={{ borderColor: 'var(--outline-variant)' }} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}>
                {['Mã NV', 'Họ tên', 'Vai trò', 'Điện thoại', 'Dự án', 'Trạng thái', 'Ngày tạo'].map(h => (
                  <th key={h} style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workers.map((w, i) => (
                <tr
                  key={w.id}
                  className="transition-colors hover:opacity-90"
                  style={{ borderBottom: i < workers.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}
                >
                  <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs">{w.empCode}</td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">{w.fullName}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {ROLE_LABELS[w.role] ?? w.role}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{w.phone ?? '—'}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {w.project ? `${w.project.name} (${w.project.code})` : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {new Date(w.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="border-t px-4 py-2 text-xs">
            Tổng: {total} nhân viên
          </div>
        </div>
      )}
    </div>
  );
}
