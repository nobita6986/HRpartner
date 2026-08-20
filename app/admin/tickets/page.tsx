'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

type TicketStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'CANCELLED';
type TicketType = 'TIMESHEET_DISPUTE' | 'LEAVE_REQUEST' | 'ADVANCE_REQUEST' | 'OTHER';
type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

interface TicketRow {
  id: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  worker: { id: string; fullName: string; empCode: string } | null;
  createdAt: string;
  workDate: string | null;
  requestedHours: string | null;
  deltaHours: string | null;
  reasonCode: string | null;
}

interface TicketsResponse {
  tickets: TicketRow[];
  total: number;
  take: number;
  skip: number;
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  PENDING:     { label: 'Chờ xử lý', color: '#e65100', bg: '#fff3e0' },
  IN_PROGRESS: { label: 'Đang xử lý', color: '#1565c0', bg: '#e3f2fd' },
  RESOLVED:    { label: 'Đã giải quyết', color: '#197a56', bg: '#e8f5e9' },
  REJECTED:    { label: 'Từ chối', color: '#c62828', bg: '#ffebee' },
  CANCELLED:   { label: 'Đã hủy', color: '#37474f', bg: '#eceff1' },
};

const TYPE_LABELS: Record<TicketType, string> = {
  TIMESHEET_DISPUTE: 'Khiếu nại công',
  LEAVE_REQUEST: 'Đơn nghỉ phép',
  ADVANCE_REQUEST: 'Tạm ứng',
  OTHER: 'Khác',
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; bg: string }> = {
  LOW:    { label: 'Thấp', color: '#37474f', bg: '#eceff1' },
  NORMAL: { label: 'Bình thường', color: '#1565c0', bg: '#e3f2fd' },
  HIGH:   { label: 'Cao', color: '#e65100', bg: '#fff3e0' },
  URGENT: { label: 'Khẩn cấp', color: '#c62828', bg: '#ffebee' },
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#37474f', bg: '#eceff1' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color }} className="rounded-full px-2 py-0.5 text-xs font-semibold">
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: TicketType }) {
  return (
    <span style={{ background: '#f3e5f5', color: '#6a1b9a' }} className="rounded px-1.5 py-0.5 text-xs font-medium">
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? { label: priority, color: '#37474f', bg: '#eceff1' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color }} className="rounded px-1.5 py-0.5 text-xs font-medium">
      {cfg.label}
    </span>
  );
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ take: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      const r = await fetch(`/api/tickets?${params}`);
      if (!r.ok) {
        if (r.status === 401) { setError('Vui lòng đăng nhập.'); return; }
        if (r.status === 403) { setError('Bạn không có quyền xem.'); return; }
        throw new Error(`${r.status}`);
      }
      const d: TicketsResponse = await r.json();
      setTickets(d.tickets);
      setTotal(d.total);
    } catch {
      setError('Không thể tải danh sách phản ánh.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6">
        <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">Phản ánh / Khiếu nại</h1>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
          Module M6 — Quản lý tickets từ người dùng
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {['', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CANCELLED'].map(s => (
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
              {s === '' ? 'Tất cả' : STATUS_CONFIG[s as TicketStatus]?.label ?? s}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">Tất cả loại</option>
          <option value="TIMESHEET_DISPUTE">Khiếu nại công</option>
          <option value="LEAVE_REQUEST">Đơn nghỉ phép</option>
          <option value="ADVANCE_REQUEST">Tạm ứng</option>
          <option value="OTHER">Khác</option>
        </select>
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
      ) : tickets.length === 0 ? (
        <div
          style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
          className="rounded-lg border p-8 text-center"
        >
          <p className="text-sm">Chưa có phản ánh nào.</p>
        </div>
      ) : (
        <div style={{ borderColor: 'var(--outline-variant)' }} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}>
                {['ID', 'Loại', 'Nhân viên', 'Trạng thái', 'Ưu tiên', 'Ngày làm việc', 'Chênh lệch', 'Ngày tạo'].map(h => (
                  <th key={h} style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, i) => (
                <tr
                  key={t.id}
                  className="transition-colors hover:opacity-90 cursor-pointer"
                  style={{ borderBottom: i < tickets.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}
                >
                  <td style={{ color: 'var(--primary)' }} className="px-4 py-3 font-mono text-xs">{t.id.slice(0, 8)}</td>
                  <td className="px-4 py-3"><TypeBadge type={t.type} /></td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-4 py-3 text-xs">
                    {t.worker ? `${t.worker.fullName} (${t.worker.empCode})` : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {t.workDate ? new Date(t.workDate).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs font-mono">
                    {t.deltaHours !== null ? `${t.deltaHours}h` : '—'}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-4 py-3 text-xs">
                    {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }} className="border-t px-4 py-2 text-xs">
            Tổng: {total} tickets
          </div>
        </div>
      )}
    </div>
  );
}
