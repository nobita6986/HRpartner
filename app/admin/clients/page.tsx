'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

interface ClientRow {
  id: string;
  code: string;
  name: string;
  taxCode: string | null;
  industry: string | null;
  companySize: string | null;
  status: string;
  createdAt: string;
}

interface ClientsResponse {
  clients: ClientRow[];
  total: number;
  take: number;
  skip: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PROSPECT:    { label: 'Tiềm năng', color: '#e65100', bg: '#fff3e0' },
  ACTIVE:      { label: 'Đang hợp tác', color: '#197a56', bg: '#e8f5e9' },
  BLACKLISTED: { label: 'Đen', color: '#c62828', bg: '#ffebee' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#37474f', bg: '#eceff1' };
  return <span style={{ background: cfg.bg, color: cfg.color }} className="rounded-full px-2 py-0.5 text-xs font-semibold">{cfg.label}</span>;
}

function Modal({ onClose, onSuccess, editData }: { onClose: () => void; onSuccess: () => void; editData?: ClientRow }) {
  const [code, setCode] = useState(editData?.code ?? '');
  const [name, setName] = useState(editData?.name ?? '');
  const [taxCode, setTaxCode] = useState(editData?.taxCode ?? '');
  const [industry, setIndustry] = useState(editData?.industry ?? '');
  const [companySize, setCompanySize] = useState(editData?.companySize ?? '');
  const [status, setStatus] = useState(editData?.status ?? 'PROSPECT');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const isEdit = !!editData;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && (!code.trim() || !name.trim())) { setErr('Điền đầy đủ các trường bắt buộc.'); return; }
    if (isEdit && !name.trim()) { setErr('Tên công ty bắt buộc.'); return; }
    setSubmitting(true);
    setErr('');
    try {
      const url = isEdit ? `/api/clients/${editData.id}` : '/api/clients';
      const method = isEdit ? 'PUT' : 'POST';
      const body: Record<string, string> = {};
      if (!isEdit) body.code = code.trim();
      body.name = name.trim();
      if (taxCode.trim()) body.taxCode = taxCode.trim();
      if (industry.trim()) body.industry = industry.trim();
      if (companySize) body.companySize = companySize;
      if (isEdit) body.status = status;

      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); setErr(d.message ?? `Lỗi ${r.status}`); return; }
      onSuccess();
      onClose();
    } catch { setErr('Lỗi kết nối server.'); } finally { setSubmitting(false); }
  };

  return (
    <div style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div style={{ background: 'var(--surface-container-lowest)' }} className="w-full max-w-md rounded-lg border p-6 shadow-xl" onClick={ev => ev.stopPropagation()}>
        <h2 style={{ color: 'var(--on-surface)' }} className="mb-4 text-lg font-semibold">{isEdit ? 'Sửa khách hàng' : 'Thêm khách hàng mới'}</h2>
        <form onSubmit={submit} className="space-y-4">
          {!isEdit && (
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Mã khách hàng *</label>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="VD: CC-001"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm font-mono" required />
            </div>
          )}
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Tên công ty *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Công ty ABC"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Mã số thuế</label>
              <input value={taxCode} onChange={e => setTaxCode(e.target.value)} placeholder="VD: 0123456789"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Ngành</label>
              <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="VD: Sản xuất"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Quy mô</label>
              <select value={companySize} onChange={e => setCompanySize(e.target.value)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm">
                <option value="">-- Chọn --</option>
                <option value="SMALL">Nhỏ</option>
                <option value="MEDIUM">Vừa</option>
                <option value="LARGE">Lớn</option>
                <option value="ENTERPRISE">Doanh nghiệp</option>
              </select>
            </div>
            {isEdit && (
              <div>
                <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Trạng thái</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="w-full rounded border px-3 py-2 text-sm">
                  <option value="PROSPECT">Tiềm năng</option>
                  <option value="ACTIVE">Đang hợp tác</option>
                  <option value="BLACKLISTED">Đen</option>
                </select>
              </div>
            )}
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

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editRow, setEditRow] = useState<ClientRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ take: '50' });
      if (search.trim()) params.set('search', search.trim());
      const r = await fetch(`/api/clients?${params}`);
      if (!r.ok) { if (r.status === 401) { setError('Vui lòng đăng nhập.'); return; } if (r.status === 403) { setError('Bạn không có quyền xem.'); return; } throw new Error(`${r.status}`); }
      const d: ClientsResponse = await r.json();
      setClients(d.clients);
      setTotal(d.total);
    } catch { setError('Không thể tải danh sách khách hàng.'); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">Khách hàng</h1>
          <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">Module M5 — Quản lý master data khách hàng</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ background: 'var(--primary)', color: 'var(--on-primary)' }} className="rounded px-4 py-2 text-sm font-semibold">+ Thêm khách hàng</button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Tìm kiếm mã / tên / MST…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }} className="rounded border px-3 py-2 text-sm" />
      </div>

      {loading ? <p style={{ color: 'var(--on-surface-variant)' }} className="py-12 text-center text-sm">Đang tải…</p>
      : error ? <div style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', borderColor: 'var(--error)' }} className="rounded-lg border p-4 text-sm">{error}</div>
      : clients.length === 0 ? <div style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="rounded-lg border p-8 text-center"><p className="text-sm">Chưa có khách hàng nào.</p></div>
      : (
        <div style={{ borderColor: 'var(--outline-variant)' }} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}>
                {['Mã KH', 'Tên công ty', 'MST', 'Ngành', 'Quy mô', 'Trạng thái', 'Ngày tạo', 'Hành động'].map(h => (
                  <th key={h} style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => (
                <tr key={c.id} className="transition-colors hover:opacity-90" style={{ borderBottom: i < clients.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}>
                  <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs">{c.code}</td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">{c.name}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{c.taxCode ?? '—'}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{c.industry ?? '—'}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{c.companySize ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3"><button onClick={() => setEditRow(c)} style={{ color: 'var(--primary)' }} className="text-xs font-medium hover:underline">Sửa</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="border-t px-4 py-2 text-xs">Tổng: {total} khách hàng</div>
        </div>
      )}

      {showCreate && <Modal onClose={() => setShowCreate(false)} onSuccess={load} />}
      {editRow && <Modal onClose={() => setEditRow(null)} onSuccess={load} editData={editRow} />}
    </div>
  );
}
