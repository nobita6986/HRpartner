'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

interface ProjectRow {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  clientCompany: { id: string; name: string; code: string } | null;
  createdAt: string;
}

interface ProjectsResponse {
  projects: ProjectRow[];
  total: number;
  take: number;
  skip: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:   { label: 'Hoạt động', color: '#197a56', bg: '#e8f5e9' },
  INACTIVE: { label: 'Tạm dừng', color: '#e65100', bg: '#fff3e0' },
  ARCHIVED: { label: 'Đã đóng',  color: '#37474f', bg: '#eceff1' },
};

function StatusBadge({ status }: { status: string }) {
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
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
      const r = await fetch(`/api/projects?${params}`);
      if (!r.ok) {
        if (r.status === 401) { setError('Vui lòng đăng nhập.'); return; }
        if (r.status === 403) { setError('Bạn không có quyền xem dự án.'); return; }
        throw new Error(`${r.status}`);
      }
      const d: ProjectsResponse = await r.json();
      setProjects(d.projects);
      setTotal(d.total);
    } catch {
      setError('Không thể tải danh sách dự án.');
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
          <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">Dự án</h1>
          <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
            Module M5 — Quản lý master data dự án
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Tìm kiếm mã / tên dự án…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          className="rounded border px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {['', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].map(s => (
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
              {s === '' ? 'Tất cả' : STATUS_CONFIG[s]?.label ?? s}
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
      ) : projects.length === 0 ? (
        <div
          style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
          className="rounded-lg border p-8 text-center"
        >
          <p className="text-sm">Chưa có dự án nào.</p>
        </div>
      ) : (
        <div style={{ borderColor: 'var(--outline-variant)' }} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}>
                {['Mã', 'Tên dự án', 'Khách hàng', 'Trạng thái', 'Ngày tạo'].map(h => (
                  <th key={h} style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr
                  key={p.id}
                  className="transition-colors hover:opacity-90"
                  style={{ borderBottom: i < projects.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}
                >
                  <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs">{p.code}</td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">{p.name}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {p.clientCompany ? `${p.clientCompany.name} (${p.clientCompany.code})` : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="border-t px-4 py-2 text-xs">
            Tổng: {total} dự án
          </div>
        </div>
      )}
    </div>
  );
}
