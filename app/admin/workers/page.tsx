'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

type WorkerStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';

interface WorkerRow {
  id: string;
  userId: string;
  fullName: string;
  status: WorkerStatus;
  phone: string | null;
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

function StatusBadge({ status }: { status: WorkerStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#37474f', bg: '#eceff1' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color }} className="rounded-full px-2 py-0.5 text-xs font-semibold">
      {cfg.label}
    </span>
  );
}

function Modal({ onClose, onSuccess, editData }: { onClose: () => void; onSuccess: () => void; editData?: WorkerRow }) {
  const [userId, setUserId] = useState(editData?.userId ?? '');
  const [fullName, setFullName] = useState(editData?.fullName ?? '');
  const [phone, setPhone] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [status, setStatus] = useState<WorkerStatus>(editData?.status ?? 'ACTIVE');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const isEdit = !!editData;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || (!isEdit && !userId.trim())) {
      setErr('Điền đầy đủ các trường bắt buộc.');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      const url = isEdit ? `/api/workers/${editData.id}` : '/api/workers';
      const method = isEdit ? 'PUT' : 'POST';
      const body: Record<string, string> = {};
      if (!isEdit) body.userId = userId.trim();
      body.fullName = fullName.trim();
      if (phone.trim()) body.phone = phone.trim();
      if (cccdNumber.trim()) body.cccdNumber = cccdNumber.trim();
      body.status = status;

      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json();
        setErr(d.message ?? `Lỗi ${r.status}`);
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setErr('Lỗi kết nối server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div style={{ background: 'var(--surface-container-lowest)' }} className="w-full max-w-md rounded-lg border p-6 shadow-xl" onClick={ev => ev.stopPropagation()}>
        <h2 style={{ color: 'var(--on-surface)' }} className="mb-4 text-lg font-semibold">
          {isEdit ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          {!isEdit && (
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">User ID *</label>
              <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="VD: USR-001"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm font-mono" required />
            </div>
          )}
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Họ tên *</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="VD: Nguyễn Văn A"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Điện thoại</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="VD: 0901234567"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">CCCD</label>
              <input value={cccdNumber} onChange={e => setCccdNumber(e.target.value)} placeholder="VD: 001234567890"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm font-mono" />
            </div>
          </div>
          {isEdit && (
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Trạng thái</label>
              <select value={status} onChange={e => setStatus(e.target.value as WorkerStatus)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm">
                <option value="ACTIVE">Đang làm</option>
                <option value="ON_LEAVE">Nghỉ phép</option>
                <option value="SUSPENDED">Tạm ngưng</option>
                <option value="TERMINATED">Đã nghỉ</option>
              </select>
            </div>
          )}
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

export default function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editRow, setEditRow] = useState<WorkerRow | null>(null);

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
          <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">Module M5 — Quản lý master data nhân viên</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ background: 'var(--primary)', color: 'var(--on-primary)' }} className="rounded px-4 py-2 text-sm font-semibold">
          + Thêm nhân viên
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Tìm kiếm…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          className="rounded border px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-2">
          {['', 'ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                borderColor: statusFilter === s ? 'var(--primary)' : 'var(--outline-variant)',
                background: statusFilter === s ? 'var(--primary-container)' : 'var(--surface-container-lowest)',
                color: statusFilter === s ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
              }}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-colors">
              {s === '' ? 'Tất cả' : STATUS_CONFIG[s as WorkerStatus]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--on-surface-variant)' }} className="py-12 text-center text-sm">Đang tải…</p>
      ) : error ? (
        <div style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', borderColor: 'var(--error)' }} className="rounded-lg border p-4 text-sm">{error}</div>
      ) : workers.length === 0 ? (
        <div style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="rounded-lg border p-8 text-center">
          <p className="text-sm">Chưa có nhân viên nào.</p>
        </div>
      ) : (
        <div style={{ borderColor: 'var(--outline-variant)' }} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}>
                {['User ID', 'Họ tên', 'Điện thoại', 'Trạng thái', 'Ngày tạo', 'Hành động'].map(h => (
                  <th key={h} style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workers.map((w, i) => (
                <tr key={w.id} className="transition-colors duration-150 ease-out hover:bg-[var(--color-surface-container)]"
                  style={{ borderBottom: i < workers.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}>
                  <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs">{w.userId}</td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">{w.fullName}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{w.phone ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{new Date(w.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditRow(w)} style={{ color: 'var(--primary)' }} className="text-xs font-medium hover:underline">Sửa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="border-t px-4 py-2 text-xs">Tổng: {total} nhân viên</div>
        </div>
      )}

      {showCreate && <Modal onClose={() => setShowCreate(false)} onSuccess={load} />}
      {editRow && <Modal onClose={() => setEditRow(null)} onSuccess={load} editData={editRow} />}
    </div>
  );
}
