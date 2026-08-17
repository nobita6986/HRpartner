'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

interface StaffingOrderRow {
  id: string;
  code: string;
  title: string;
  status: 'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'CANCELLED';
  project: { id: string; name: string; code: string };
  slots: Array<{ id: string; positionTitle: string; slotsNeeded: number; slotsFilled: number }>;
  createdAt: string;
}

interface OrdersResponse {
  orders: StaffingOrderRow[];
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:          { label: 'Mở',        color: '#197a56', bg: '#e8f5e9' },
  CLOSING_SOON: { label: 'Sắp đóng',  color: '#e65100', bg: '#fff3e0' },
  CLOSED:       { label: 'Đã đóng',   color: '#37474f', bg: '#eceff1' },
  CANCELLED:    { label: 'Đã hủy',    color: '#c62828', bg: '#ffebee' },
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

function SlotChip({ needed, filled }: { needed: number; filled: number }) {
  const pct = needed === 0 ? 100 : Math.round((filled / needed) * 100);
  const bg = pct >= 100 ? '#e8f5e9' : pct >= 50 ? '#fff3e0' : '#ffebee';
  const fg = pct >= 100 ? '#197a56' : pct >= 50 ? '#e65100' : '#c62828';
  return (
    <span style={{ background: bg, color: fg }} className="rounded px-1.5 py-0.5 text-xs font-mono">
      {filled}/{needed}
    </span>
  );
}

function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [slotsNeeded, setSlotsNeeded] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId.trim() || !positionTitle.trim()) {
      setErr('Điền đầy đủ các trường bắt buộc.');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      const r = await fetch('/api/staffing/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId.trim(),
          title: title.trim(),
          slots: [{
            positionCode: 'GEN',
            positionTitle: positionTitle.trim(),
            slotsNeeded: parseInt(slotsNeeded, 10) || 1,
            validFrom: new Date().toISOString().slice(0, 10),
          }],
        }),
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
    <div
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface-container-lowest)' }}
        className="w-full max-w-md rounded-lg border p-6 shadow-xl"
        onClick={ev => ev.stopPropagation()}
      >
        <h2 style={{ color: 'var(--on-surface)' }} className="mb-4 text-lg font-semibold">
          Tạo Staffing Order
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Tiêu đề *</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="VD: Tuyển 5 thợ điện Yên Phong"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Project ID *</label>
            <input
              value={projectId} onChange={e => setProjectId(e.target.value)}
              placeholder="VD: seed-prj-ap-qm-1048"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm font-mono"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Vị trí *</label>
              <input
                value={positionTitle} onChange={e => setPositionTitle(e.target.value)}
                placeholder="VD: Thợ điện"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Số lượng</label>
              <input
                type="number" min="1"
                value={slotsNeeded} onChange={e => setSlotsNeeded(e.target.value)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>
          {err && <p style={{ color: 'var(--error)' }} className="text-sm">{err}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
              className="rounded px-4 py-2 text-sm"
            >
              Hủy
            </button>
            <button
              type="submit" disabled={submitting}
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
              className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? 'Đang tạo…' : 'Tạo Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StaffingPage() {
  const [orders, setOrders] = useState<StaffingOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const r = await fetch(`/api/staffing/orders?${params}`);
      if (!r.ok) {
        if (r.status === 401) { setError('Vui lòng đăng nhập.'); return; }
        if (r.status === 403) { setError('Bạn không có quyền xem.'); return; }
        throw new Error(`${r.status}`);
      }
      const d: OrdersResponse = await r.json();
      setOrders(d.orders);
      setTotal(d.total);
    } catch {
      setError('Không thể tải danh sách Orders.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">Staffing Orders</h1>
          <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
            Module M3 — slice 4A (moment 02:10–03:10)
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
          className="rounded px-4 py-2 text-sm font-semibold"
        >
          + Tạo Order
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'OPEN', 'CLOSING_SOON', 'CLOSED', 'CANCELLED'].map(s => (
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

      {loading ? (
        <p style={{ color: 'var(--on-surface-variant)' }} className="py-12 text-center text-sm">Đang tải…</p>
      ) : error ? (
        <div
          style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', borderColor: 'var(--error)' }}
          className="rounded-lg border p-4 text-sm"
        >
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
          className="rounded-lg border p-8 text-center"
        >
          <p className="text-sm">Chưa có Staffing Order nào.</p>
          <p className="mt-1 text-xs">Nhấn &quot;Tạo Order&quot; để bắt đầu.</p>
        </div>
      ) : (
        <div style={{ borderColor: 'var(--outline-variant)' }} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}>
                {['Mã', 'Tiêu đề', 'Dự án', 'Slots', 'Trạng thái', 'Ngày tạo'].map(h => (
                  <th key={h} style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr
                  key={o.id}
                  className="transition-colors hover:opacity-90"
                  style={{ borderBottom: i < orders.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}
                >
                  <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs">{o.code}</td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3">{o.title}</td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">{o.project?.name ?? o.project?.code ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {o.slots.map(s => (
                        <SlotChip key={s.id} needed={s.slotsNeeded} filled={s.slotsFilled} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="border-t px-4 py-2 text-xs">
            Tổng: {total} orders
          </div>
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSuccess={load} />}
    </div>
  );
}
