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

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsError, setProjectsError] = useState('');
  const [positionCode, setPositionCode] = useState('GEN');
  const [positionTitle, setPositionTitle] = useState('');
  const [slotsNeeded, setSlotsNeeded] = useState('1');
  const [hourlyRateVnd, setHourlyRateVnd] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [validTo, setValidTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // Dự án nạp từ API để khỏi phải dán UUID bằng tay.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/projects?take=50');
        const d = await r.json();
        if (!r.ok) throw new Error(d.message ?? `Lỗi ${r.status}`);
        if (!cancelled) setProjects(Array.isArray(d.projects) ? d.projects : []);
      } catch (e) {
        if (!cancelled) setProjectsError(e instanceof Error ? e.message : 'Không tải được danh sách dự án.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !positionTitle.trim() || !positionCode.trim()) {
      setErr('Điền đầy đủ các trường bắt buộc.');
      return;
    }
    const rate = hourlyRateVnd.trim() === '' ? null : Number(hourlyRateVnd);
    if (rate !== null && (!Number.isInteger(rate) || rate < 0)) {
      setErr('Lương giờ phải là số nguyên không âm (VND).');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      // Field để trống thì không gửi — tránh ghi chuỗi rỗng vào DB.
      const slot: Record<string, string | number> = {
        positionCode: positionCode.trim(),
        positionTitle: positionTitle.trim(),
        slotsNeeded: parseInt(slotsNeeded, 10) || 1,
        validFrom: new Date().toISOString().slice(0, 10),
      };
      if (rate !== null) slot.hourlyRateVnd = rate;
      if (shiftStart) slot.shiftStart = shiftStart;
      if (shiftEnd) slot.shiftEnd = shiftEnd;
      if (workLocation.trim()) slot.workLocation = workLocation.trim();
      if (validTo) slot.validTo = validTo;

      const body: Record<string, unknown> = {
        projectId,
        title: title.trim(),
        slots: [slot],
      };
      if (deadlineDate) body.deadlineDate = deadlineDate;

      const r = await fetch('/api/staffing/orders', {
        method: 'POST',
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
    <div
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface-container-lowest)' }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border p-6 shadow-xl"
        onClick={ev => ev.stopPropagation()}
      >
        <h2 style={{ color: 'var(--on-surface)' }} className="mb-4 text-lg font-semibold">
          Tạo đơn tuyển dụng
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
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Dự án *</label>
            <select
              value={projectId} onChange={e => setProjectId(e.target.value)}
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm"
              required
            >
              <option value="">-- Chọn dự án --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
            {projectsError ? (
              <p style={{ color: 'var(--error)' }} className="mt-1 text-xs">{projectsError}</p>
            ) : projects.length === 0 ? (
              <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
                Đang tải danh sách dự án…
              </p>
            ) : null}
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
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Mã vị trí *</label>
              <input
                value={positionCode} onChange={e => setPositionCode(e.target.value)}
                placeholder="VD: DIEN"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm font-mono"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Số lượng</label>
              <input
                type="number" min="1"
                value={slotsNeeded} onChange={e => setSlotsNeeded(e.target.value)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Lương giờ (VND)</label>
              <input
                type="number" min={0} step={1000}
                value={hourlyRateVnd} onChange={e => setHourlyRateVnd(e.target.value)}
                placeholder="VD: 35000"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Giờ vào</label>
              <input
                type="time"
                value={shiftStart} onChange={e => setShiftStart(e.target.value)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Giờ ra</label>
              <input
                type="time"
                value={shiftEnd} onChange={e => setShiftEnd(e.target.value)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Nơi làm việc</label>
            <input
              value={workLocation} onChange={e => setWorkLocation(e.target.value)}
              placeholder="VD: KCN Yên Phong, Bắc Ninh"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Hạn nhận hồ sơ</label>
              <input
                type="date"
                value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Vị trí tuyển đến ngày</label>
              <input
                type="date"
                value={validTo} onChange={e => setValidTo(e.target.value)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs">
            Quá hạn nhận hồ sơ hoặc quá ngày tuyển, slot không còn được tính là trống nên tin sẽ không đăng được.
          </p>
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
              {submitting ? 'Đang tạo…' : 'Tạo đơn'}
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
                  className="transition-colors duration-150 ease-out hover:bg-[var(--color-surface-container)]"
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
