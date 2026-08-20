'use client';
/**
 * CTV Dashboard — M9 RQ-01, RQ-02
 * Redesigned with Gamification, income chart, withdrawal request.
 */
import { useState, useEffect } from 'react';

interface CommissionSummary {
  ctvId: string;
  balance: string;
  totalDebt: string;
  ledger: { items: LedgerRow[]; total: number };
}

interface LedgerRow {
  id: string;
  milestone: string;
  amount: string;
  direction: 'CREDIT' | 'REVERSAL';
  month: number;
  year: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  createdAt: string;
}

interface Summary {
  affCode: string | null;
  phone: string | null;
  counts: { total: number; pending: number; accepted: number; rejected: number; merged: number };
  estimatedCommission: string;
  note: string;
}

interface Claim {
  id: string;
  workerId: string;
  claimType: string;
  status: string;
  createdAt: string;
}

// ── Inline SVG Bar Chart (no external deps) ───────────────────────────────
function BarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  if (data.length === 0) return <p className="text-xs text-gray-400 text-center py-6">Chưa có dữ liệu</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-28 px-2">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-blue-100 rounded-t relative" style={{ height: `${Math.max(pct, 4)}%` }}>
              <div className="absolute inset-x-0 bottom-0 bg-blue-500 rounded-t" style={{ height: '100%' }}>
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-mono text-blue-600 whitespace-nowrap">
                  {(d.value / 1_000_000).toFixed(1)}M
                </span>
              </div>
            </div>
            <span className="text-xs text-gray-400">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Progress Badge ─────────────────────────────────────────────────────
function LevelBadge({ level }: { level: number }) {
  const colors = ['#94a3b8', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];
  const names = ['Tân binh', 'Đồng', 'Bạc', 'Vàng', 'Kim cương', 'Huyền thoại'];
  const idx = Math.min(level, colors.length - 1);
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: colors[idx] + '20', color: colors[idx] }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors[idx] }} />
      {names[idx]}
    </span>
  );
}

// ── Withdrawal Modal ────────────────────────────────────────────────────
function WithdrawModal({ balance, onClose, onSuccess }: {
  balance: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const numAmount = parseInt(amount || '0', 10);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0 || numAmount > balance) {
      setErr('Số tiền không hợp lệ.');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const r = await fetch('/api/ctv/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountVnd: numAmount, bankAccount, bankName }),
      });
      if (!r.ok) {
        const d = await r.json();
        setErr(d.message ?? `Lỗi ${r.status}`);
        return;
      }
      onSuccess();
      onClose();
    } catch { setErr('Lỗi kết nối.'); } finally { setLoading(false); }
  };

  return (
    <div style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div style={{ background: 'var(--surface-container-lowest)' }} className="w-full max-w-sm rounded-lg border p-6 shadow-xl" onClick={ev => ev.stopPropagation()}>
        <h2 style={{ color: 'var(--on-surface)' }} className="text-lg font-semibold mb-1">Yêu cầu rút tiền</h2>
        <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs mb-4">
          Số dư khả dụng: <strong>{balance.toLocaleString('vi-VN')} ₫</strong>
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Số tiền (₫)</label>
            <input type="number" min={10000} max={balance} step={10000}
              value={amount} onChange={e => setAmount(e.target.value)}
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm font-mono" required />
          </div>
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Số tài khoản</label>
            <input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="VD: 1234567890"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm font-mono" required />
          </div>
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">Tên ngân hàng</label>
            <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="VD: Vietcombank"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm" required />
          </div>
          {err && <p style={{ color: 'var(--error)' }} className="text-sm">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
              className="flex-1 rounded px-4 py-2 text-sm">Hủy</button>
            <button type="submit" disabled={loading}
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
              className="flex-1 rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {loading ? 'Đang gửi…' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CtvPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [commission, setCommission] = useState<CommissionSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [c, s, comm] = await Promise.all([
      fetch('/api/ctv/claims').then(r => r.ok ? r.json() : null),
      fetch('/api/ctv/summary').then(r => r.ok ? r.json() : null),
      fetch('/api/ctv/commission/summary').then(r => r.ok ? r.json() : null),
    ]);
    if (c?.items) setClaims(c.items);
    if (s) setSummary(s);
    if (comm) setCommission(comm);
  }

  async function copyCode() {
    if (!summary?.affCode) return;
    try {
      await navigator.clipboard.writeText(summary.affCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function formatVnd(v: string | number) {
    return Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 0 });
  }

  // Derive chart data from ledger
  const chartData = (() => {
    if (!commission?.ledger?.items) return [];
    const months: Record<string, number> = {};
    for (const item of commission.ledger.items) {
      const key = `${item.year}-${String(item.month).padStart(2, '0')}`;
      const amt = Number(item.amount);
      months[key] = (months[key] ?? 0) + (item.direction === 'CREDIT' ? amt : -amt);
    }
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, val]) => ({
        label: key.slice(5),
        value: Math.max(0, val),
      }));
  })();

  const balance = commission ? Number(commission.balance) : 0;
  const level = Math.min(Math.floor(balance / 5_000_000), 5);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-bold">CTV Dashboard</h1>
          <p style={{ color: 'var(--on-surface-variant)' }} className="text-sm mt-0.5">Chào mừng trở lại!</p>
        </div>
        <LevelBadge level={level} />
      </div>

      {/* Summary card */}
      {summary && (
        <div className="rounded-xl p-5 mb-5 shadow-sm" style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs mb-1">Mã giới thiệu</p>
              <div className="flex items-center gap-2">
                <code style={{ color: 'var(--primary)', background: 'var(--surface-container)' }}
                  className="font-mono text-base px-2 py-1 rounded">{summary.affCode ?? '—'}</code>
                {summary.affCode && (
                  <button onClick={copyCode} style={{ color: 'var(--primary)' }}
                    className="text-xs font-medium hover:underline">
                    {copied ? '✓' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
            <div className="text-right">
              <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs mb-1">Tích lũy dự kiến</p>
              <p style={{ color: 'var(--on-surface)' }} className="text-xl font-bold">{formatVnd(summary.estimatedCommission)} ₫</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 pt-3" style={{ borderTop: '1px solid var(--outline-variant)' }}>
            {(['total', 'pending', 'accepted', 'rejected', 'merged'] as const).map(k => (
              <div key={k} className="text-center">
                <p className="text-2xl font-bold" style={{ color: 'var(--on-surface)' }}>{summary.counts[k]}</p>
                <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs capitalize">{k === 'total' ? 'Tổng' : k}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission card */}
      {commission && (
        <div className="rounded-xl p-5 mb-5 shadow-sm" style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ color: 'var(--on-surface)' }} className="text-sm font-semibold">Thu nhập hoa hồng</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg p-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <p className="text-xs" style={{ color: '#166534' }}>Số dư khả dụng</p>
              <p className="font-bold text-lg" style={{ color: '#15803d' }}>{formatVnd(commission.balance)} ₫</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <p className="text-xs" style={{ color: '#991b1b' }}>Nợ hoa hồng</p>
              <p className="font-bold text-lg" style={{ color: '#dc2626' }}>{formatVnd(commission.totalDebt)} ₫</p>
            </div>
          </div>
          {/* Bar chart */}
          <BarChart data={chartData} />
          <button onClick={() => setShowWithdraw(true)} disabled={balance <= 0}
            style={{ background: balance > 0 ? 'var(--primary)' : 'var(--surface-container)', color: balance > 0 ? 'var(--on-primary)' : 'var(--on-surface-variant)' }}
            className="mt-4 w-full rounded-lg py-2.5 text-sm font-semibold disabled:cursor-not-allowed transition-colors">
            Rút tiền
          </button>
        </div>
      )}

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

      {/* Claims */}
      <h2 style={{ color: 'var(--on-surface)' }} className="text-sm font-semibold mb-3">Danh sách claims</h2>
      <div className="space-y-3">
        {claims.length === 0 && (
          <p className="text-center py-8" style={{ color: 'var(--on-surface-variant)' }}>Chưa có claim nào</p>
        )}
        {claims.map(c => (
          <div key={c.id} className="rounded-lg p-4 shadow-sm" style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}>
            <div className="flex justify-between items-start">
              <div>
                <p style={{ color: 'var(--on-surface)' }} className="font-medium text-sm">Worker {c.workerId.slice(-6)}</p>
                <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs mt-0.5">{c.claimType}</p>
                <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs mt-0.5">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: c.status === 'ACCEPTED' ? '#dcfce7' : '#fef9c3',
                  color: c.status === 'ACCEPTED' ? '#15803d' : '#854d0e',
                }}>
                {c.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showWithdraw && (
        <WithdrawModal
          balance={balance}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => { setMsg({ type: 'ok', text: 'Yêu cầu rút tiền đã được gửi!' }); load(); }}
        />
      )}
    </div>
  );
}
