'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

interface ProjectRow {
  id: string;
  code: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  clientCompanyId: string;
  startDate: string;
  createdAt: string;
  /** Chỉ tiêu nhân sự. Quota 0 sẽ chặn lần chuyển ứng viên đầu tiên. */
  quota?: number | null;
  siteAddress?: string | null;
}

interface ProjectsResponse {
  projects: ProjectRow[];
  total: number;
  take: number;
  skip: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Nháp',     color: '#37474f', bg: '#eceff1' },
  ACTIVE:    { label: 'Hoạt động', color: '#197a56', bg: '#e8f5e9' },
  PAUSED:    { label: 'Tạm dừng', color: '#e65100', bg: '#fff3e0' },
  COMPLETED: { label: 'Hoàn thành', color: '#1565c0', bg: '#e3f2fd' },
  CANCELLED: { label: 'Đã hủy',    color: '#c62828', bg: '#ffebee' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#37474f', bg: '#eceff1' };
  return <span style={{ background: cfg.bg, color: cfg.color }} className="rounded-full px-2 py-0.5 text-xs font-semibold">{cfg.label}</span>;
}

function Modal({ onClose, onSuccess, editData, clientCompanies }: {
  onClose: () => void; onSuccess: () => void; editData?: ProjectRow;
  clientCompanies: Array<{ id: string; code: string; name: string }>;
}) {
  const [code, setCode] = useState(editData?.code ?? '');
  const [name, setName] = useState(editData?.name ?? '');
  const [clientCompanyId, setClientCompanyId] = useState(editData?.clientCompanyId ?? '');
  const [startDate, setStartDate] = useState(editData?.startDate?.slice(0, 10) ?? '');
  const [status, setStatus] = useState<string>(editData?.status ?? 'DRAFT');
  const [quota, setQuota] = useState(
    editData?.quota === null || editData?.quota === undefined ? '' : String(editData.quota),
  );
  const [siteAddress, setSiteAddress] = useState(editData?.siteAddress ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const isEdit = !!editData;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && (!code.trim() || !name.trim() || !clientCompanyId || !startDate)) {
      setErr('Điền đầy đủ các trường bắt buộc.');
      return;
    }
    if (isEdit && (!name.trim() || !clientCompanyId || !startDate)) {
      setErr('Điền đầy đủ các trường bắt buộc.');
      return;
    }
    const quotaText = quota.trim();
    const quotaNumber = quotaText === '' ? null : Number(quotaText);
    if (quotaNumber !== null && (!Number.isInteger(quotaNumber) || quotaNumber < 0)) {
      setErr('Chỉ tiêu nhân sự phải là số nguyên không âm.');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      const url = isEdit ? `/api/projects/${editData.id}` : '/api/projects';
      const method = isEdit ? 'PUT' : 'POST';
      const body: Record<string, string | number> = {};
      if (!isEdit) body.code = code.trim();
      body.name = name.trim();
      body.clientCompanyId = clientCompanyId;
      body.startDate = startDate;
      body.status = status;
      // Để trống thì không gửi: tạo mới API mặc định 0, sửa thì giữ giá trị cũ.
      if (quotaNumber !== null) body.quota = quotaNumber;
      if (siteAddress.trim()) body.siteAddress = siteAddress.trim();

      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); setErr(d.message ?? `Lỗi ${r.status}`); return; }
      onSuccess();
      onClose();
    } catch { setErr('Lỗi kết nối server.'); } finally { setSubmitting(false); }
  };

  return (
    <div style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div style={{ background: 'var(--surface-container-lowest)' }} className="w-full max-w-md rounded-lg border p-6 shadow-xl" onClick={ev => ev.stopPropagation()}>
        <h2 style={{ color: 'var(--on-surface)' }} className="mb-4 text-lg font-semibold">{isEdit ? 'Sửa dự án' : 'Thêm dự án mới'}</h2>
        <form onSubmit={submit} className="space-y-4">
          {!isEdit && (
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Mã dự án *</label>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="VD: PRJ-2026-001"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm font-mono" required />
            </div>
          )}
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Tên dự án *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Yên Phong Factory"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm" required />
          </div>
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Khách hàng *</label>
            <select value={clientCompanyId} onChange={e => setClientCompanyId(e.target.value)}
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm" required>
              <option value="">-- Chọn khách hàng --</option>
              {clientCompanies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Ngày bắt đầu *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm" required />
            </div>
            {isEdit && (
              <div>
                <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Trạng thái</label>
                <select value={status} onChange={e => setStatus(e.target.value as string)}
                  style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm">
                  <option value="DRAFT">Nháp</option>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="PAUSED">Tạm dừng</option>
                  <option value="COMPLETED">Hoàn thành</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Chỉ tiêu nhân sự (quota)</label>
            <input type="number" min={0} step={1} value={quota} onChange={e => setQuota(e.target.value)} placeholder="VD: 20"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm" />
            <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
              Để trống nghĩa là 0. Quota 0 sẽ chặn lần chuyển ứng viên đầu tiên vào dự án.
            </p>
          </div>
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Địa chỉ công trường</label>
            <input value={siteAddress} onChange={e => setSiteAddress(e.target.value)} placeholder="VD: KCN Yên Phong, Bắc Ninh"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm" />
          </div>
          {err && <p style={{ color: 'var(--error)' }} className="text-sm">{err}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }} className="rounded px-4 py-2 text-sm">Hủy</button>
            <button type="submit" disabled={submitting} style={{ background: 'var(--primary)', color: 'var(--on-primary)' }} className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {submitting ? 'Đang lưu…' : isEdit ? 'Lưu' : 'Thêm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clientCompanies, setClientCompanies] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editRow, setEditRow] = useState<ProjectRow | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const r = await fetch('/api/clients?take=100');
      if (r.ok) {
        const d = await r.json();
        setClientCompanies(d.clients ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ take: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const r = await fetch(`/api/projects?${params}`);
      if (!r.ok) { if (r.status === 401) { setError('Vui lòng đăng nhập.'); return; } if (r.status === 403) { setError('Bạn không có quyền xem dự án.'); return; } throw new Error(`${r.status}`); }
      const d: ProjectsResponse = await r.json();
      setProjects(d.projects);
      setTotal(d.total);
    } catch { setError('Không thể tải danh sách dự án.'); } finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">Dự án</h1>
          <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">Module M5 — Quản lý master data dự án</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ background: 'var(--primary)', color: 'var(--on-primary)' }} className="rounded px-4 py-2 text-sm font-semibold">+ Thêm dự án</button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Tìm kiếm…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="rounded border px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-2">
          {['', 'DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ borderColor: statusFilter === s ? 'var(--primary)' : 'var(--outline-variant)', background: statusFilter === s ? 'var(--primary-container)' : 'var(--surface-container-lowest)', color: statusFilter === s ? 'var(--on-primary-container)' : 'var(--on-surface-variant)' }}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-colors">
              {s === '' ? 'Tất cả' : STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--on-surface-variant)' }} className="py-12 text-center text-sm">Đang tải…</p>
      : error ? <div style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', borderColor: 'var(--error)' }} className="rounded-lg border p-4 text-sm">{error}</div>
      : projects.length === 0 ? <div style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="rounded-lg border p-8 text-center"><p className="text-sm">Chưa có dự án nào.</p></div>
      : (
        <div style={{ borderColor: 'var(--outline-variant)' }} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}>
                {['Mã', 'Tên dự án', 'Trạng thái', 'Ngày bắt đầu', 'Ngày tạo', 'Hành động'].map(h => (
                  <th key={h} style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={p.id} className="transition-colors hover:opacity-90" style={{ borderBottom: i < projects.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}>
                  <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs">{p.code}</td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{new Date(p.startDate).toLocaleDateString('vi-VN')}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{new Date(p.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3"><button onClick={() => setEditRow(p)} style={{ color: 'var(--primary)' }} className="text-xs font-medium hover:underline">Sửa</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="border-t px-4 py-2 text-xs">Tổng: {total} dự án</div>
        </div>
      )}

      {showCreate && <Modal onClose={() => setShowCreate(false)} onSuccess={load} clientCompanies={clientCompanies} />}
      {editRow && <Modal onClose={() => setEditRow(null)} onSuccess={load} editData={editRow} clientCompanies={clientCompanies} />}
    </div>
  );
}
