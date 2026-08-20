'use client';
/**
 * Vendor Portal main page — M9 RQ-03, RQ-04
 * Synced with Design System warm_professionalism.
 */
import { useState, useEffect } from 'react';

interface OrderSlot {
  id: string;
  role: string;
  headcount: number;
  filled: number;
  remaining: number;
}

interface Order {
  id: string;
  code: string;
  projectName: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  slots: OrderSlot[];
}

interface Submission {
  id: string;
  orderId: string | null;
  orderCode: string | null;
  projectName: string | null;
  fullName: string;
  phone: string;
  cccdNumber: string | null;
  status: string;
  blockCode: string | null;
  overrideCase: string | null;
  createdAt: string;
}

interface StatementRow {
  id: string;
  periodLabel: string;
  status: string;
  disputeCount: number;
  confirmDeadlineAt: string | null;
  totalAmount: string;
}

type Tab = 'orders' | 'pool' | 'statements';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  QUALIFIED:  { bg: '#dcfce7', text: '#15803d' },
  REJECTED:   { bg: '#fee2e2', text: '#dc2626' },
  MERGED:     { bg: '#f3e8ff', text: '#7c3aed' },
  PENDING:    { bg: '#fef9c3', text: '#854d0e' },
  OPEN:       { bg: '#dbeafe', text: '#1d4ed8' },
  CONFIRMED:  { bg: '#dcfce7', text: '#15803d' },
  DISPUTED:   { bg: '#fee2e2', text: '#dc2626' },
  PAID:       { bg: '#dcfce7', text: '#15803d' },
};

function getStatusStyle(status: string) {
  return STATUS_COLORS[status] ?? { bg: '#f1f5f9', text: '#475569' };
}

export default function VendorPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [statements, setStatements] = useState<StatementRow[]>([]);
  const [applyOrder, setApplyOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
    else if (tab === 'pool') loadSubmissions();
    else loadStatements();
  }, [tab]);

  async function loadOrders() {
    const res = await fetch('/api/vendor/orders');
    if (res.ok) {
      const d = await res.json();
      setOrders(d.items ?? []);
    }
  }

  async function loadSubmissions() {
    const res = await fetch('/api/vendor/submissions');
    if (res.ok) {
      const d = await res.json();
      setSubmissions(d.items ?? []);
    }
  }

  async function loadStatements() {
    const res = await fetch('/api/vendor/statements');
    if (res.ok) {
      const d = await res.json();
      setStatements(d.items ?? []);
    }
  }

  async function handleApply(orderId: string, formData: FormData) {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/vendor/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          fullName: formData.get('fullName'),
          phone: formData.get('phone'),
          cccdNumber: formData.get('cccdNumber') || undefined,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const hint = d.dedupHint ? `\n→ ${d.dedupHint}` : '';
        setMsg({ type: 'ok', text: `Đã nộp ứng viên.${hint}` });
        setApplyOrder(null);
        loadOrders();
        loadSubmissions();
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg({ type: 'err', text: err.message || err.error || 'Lỗi nộp' });
      }
    } catch {
      setMsg({ type: 'err', text: 'Lỗi mạng.' });
    } finally {
      setLoading(false);
    }
  }

  function fmtAmount(v: string) {
    return Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 0 });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-bold">Vendor Portal</h1>
        <p style={{ color: 'var(--on-surface-variant)' }} className="text-sm mt-0.5">Quản lý nhu cầu tuyển dụng</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 mb-6 rounded-lg" style={{ background: 'var(--surface-container)' }}>
        {([['orders', 'Nhu cầu'], ['pool', 'Kho hồ sơ'], ['statements', 'Đối soát']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 text-sm font-medium rounded-md transition-all"
            style={{
              background: tab === t ? 'var(--surface-container-lowest)' : 'transparent',
              color: tab === t ? 'var(--primary)' : 'var(--on-surface-variant)',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Message */}
      {msg && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{
          background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2',
          color: msg.type === 'ok' ? '#15803d' : '#dc2626',
          border: `1px solid ${msg.type === 'ok' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* ── Orders ─────────────────────────────────────── */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--on-surface-variant)' }}>
              <p className="text-sm">Chưa có nhu cầu ACTIVE</p>
            </div>
          )}
          {orders.map(o => (
            <div key={o.id} className="rounded-xl p-5 shadow-sm" style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p style={{ color: 'var(--on-surface)' }} className="font-semibold">{o.code}</p>
                  <p style={{ color: 'var(--on-surface-variant)' }} className="text-sm mt-0.5">{o.projectName}</p>
                  {o.startDate && o.endDate && (
                    <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                      {o.startDate} → {o.endDate}
                    </p>
                  )}
                </div>
                <button onClick={() => setApplyOrder(o)}
                  style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-90">
                  Nộp ứng viên
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid var(--outline-variant)' }}>
                {o.slots.map(s => (
                  <span key={s.id}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      background: s.remaining > 0 ? '#eff6ff' : 'var(--surface-container)',
                      color: s.remaining > 0 ? '#1d4ed8' : 'var(--on-surface-variant)',
                    }}>
                    {s.role}: {s.remaining}/{s.headcount}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Kho hồ sơ ─────────────────────────────────── */}
      {tab === 'pool' && (
        <div className="space-y-3">
          {submissions.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--on-surface-variant)' }}>
              <p className="text-sm">Chưa có ứng viên nào</p>
            </div>
          )}
          {submissions.map(s => {
            const sStyle = getStatusStyle(s.status);
            return (
              <div key={s.id} className="rounded-xl p-4 shadow-sm" style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p style={{ color: 'var(--on-surface)' }} className="font-medium text-sm">{s.fullName}</p>
                    <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs mt-0.5">
                      {s.phone}{s.cccdNumber ? ` · CCCD ***${s.cccdNumber.slice(-4)}` : ''}
                    </p>
                    {s.orderCode && (
                      <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs mt-1">Cho: {s.orderCode}</p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: sStyle.bg, color: sStyle.text }}>
                    {s.status}
                  </span>
                </div>
                {s.blockCode && (
                  <p className="text-xs mt-2" style={{ color: '#dc2626' }}>Block: {s.blockCode}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Đối soát ──────────────────────────────────── */}
      {tab === 'statements' && (
        <div className="space-y-3">
          {statements.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--on-surface-variant)' }}>
              <p className="text-sm">Chưa có biên bản đối soát nào</p>
            </div>
          )}
          {statements.map(s => {
            const sStyle = getStatusStyle(s.status);
            return (
              <div key={s.id} className="rounded-xl p-4 shadow-sm" style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p style={{ color: 'var(--on-surface)' }} className="font-semibold">{s.periodLabel}</p>
                    <p style={{ color: 'var(--on-surface-variant)' }} className="text-sm mt-0.5">
                      Tổng tiền: <strong style={{ color: 'var(--on-surface)' }}>{fmtAmount(s.totalAmount)} ₫</strong>
                    </p>
                    {s.confirmDeadlineAt && (
                      <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                        Hạn xác nhận: {new Date(s.confirmDeadlineAt).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: sStyle.bg, color: sStyle.text }}>
                      {s.status}
                    </span>
                    {s.disputeCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: '#fef9c3', color: '#854d0e' }}>
                        {s.disputeCount} khiếu nại
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Apply dialog */}
      {applyOrder && (
        <div style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setApplyOrder(null)}>
          <div style={{ background: 'var(--surface-container-lowest)' }}
            className="w-full max-w-sm rounded-xl border p-6 shadow-xl"
            onClick={ev => ev.stopPropagation()}>
            <h2 style={{ color: 'var(--on-surface)' }} className="text-base font-semibold mb-4">
              Nộp ứng viên cho {applyOrder.code}
            </h2>
            <form onSubmit={e => {
              e.preventDefault();
              handleApply(applyOrder.id, new FormData(e.currentTarget));
            }} className="space-y-3">
              <input name="fullName" placeholder="Họ tên" required
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)', color: 'var(--on-surface)' }}
                className="w-full px-3 py-2 rounded-lg border text-sm" />
              <input name="phone" placeholder="SĐT (0xxxxxxxxx)" required pattern="^0[0-9]{9}$"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)', color: 'var(--on-surface)' }}
                className="w-full px-3 py-2 rounded-lg border text-sm" />
              <input name="cccdNumber" placeholder="CCCD (tùy chọn)"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)', color: 'var(--on-surface)' }}
                className="w-full px-3 py-2 rounded-lg border text-sm" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setApplyOrder(null)}
                  style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
                  className="flex-1 rounded-lg px-4 py-2 text-sm">Hủy</button>
                <button type="submit" disabled={loading}
                  style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                  className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
                  {loading ? 'Đang nộp…' : 'Nộp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
