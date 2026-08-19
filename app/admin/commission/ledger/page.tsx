/**
 * /admin/commission/ledger — P2 Commission STEP-05 (RQ-06).
 *
 * Sổ cái hoa hồng cho kế toán/HR. Approve/Pay/Reject/Reverse.
 */
'use client';

import { useEffect, useState } from 'react';

interface LedgerRow {
  id: string;
  ctvId: string;
  workerId: string | null;
  assignmentId: string | null;
  policyId: string;
  milestone: string;
  amount: string;
  direction: 'CREDIT' | 'REVERSAL';
  reversalOfId: string | null;
  month: number;
  year: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function StatusBadge({ s }: { s: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[s] ?? 'bg-gray-100 text-gray-700'}`}>
      {s}
    </span>
  );
}

export default function AdminCommissionLedgerPage() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCtv, setFilterCtv] = useState<string>('');
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (filterStatus) qs.set('status', filterStatus);
      if (filterCtv) qs.set('ctvId', filterCtv);
      const r = await fetch(`/api/admin/commission-ledger?${qs.toString()}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.message ?? d.error ?? 'Fetch failed');
      setRows(d.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filterStatus, filterCtv]);

  async function action(id: string, kind: 'approve' | 'pay' | 'reject' | 'reverse') {
    const reason = kind === 'reject' || kind === 'reverse'
      ? prompt(`Reason cho ${kind}?`) ?? ''
      : '';
    if ((kind === 'reject' || kind === 'reverse') && !reason) return;
    setBusy(`${id}-${kind}`);
    try {
      const r = await fetch(`/api/admin/commission-ledger/${id}/${kind}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': `${kind}-${id}-${Date.now()}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        alert(`${d.error ?? 'ERR'}: ${d.message ?? 'Failed'}`);
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--surface)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--on-surface)' }}>
            Commission Ledger
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Duyệt (APPROVE) → Chi trả (PAY) / Từ chối (REJECT) / Đảo (REVERSE)
          </p>
        </div>

        <div className="mb-4 flex gap-3 items-end">
          <div>
            <label className="block text-xs font-medium mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">Tất cả</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PAID">PAID</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">CTV ID</label>
            <input
              value={filterCtv}
              onChange={(e) => setFilterCtv(e.target.value)}
              placeholder="CTV-XXX"
              className="w-full border rounded px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--outline)' }}
        >
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--primary-container)' }}>
              <tr>
                <th className="text-left px-3 py-3 font-semibold">CTV</th>
                <th className="text-left px-3 py-3 font-semibold">Worker</th>
                <th className="text-left px-3 py-3 font-semibold">Milestone</th>
                <th className="text-right px-3 py-3 font-semibold">Amount</th>
                <th className="text-center px-3 py-3 font-semibold">Dir</th>
                <th className="text-center px-3 py-3 font-semibold">Month</th>
                <th className="text-center px-3 py-3 font-semibold">Status</th>
                <th className="text-center px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center" style={{ color: 'var(--on-surface-variant)' }}>
                    Đang tải…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center" style={{ color: 'var(--on-surface-variant)' }}>
                    Chưa có ledger nào.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={r.id} style={{ borderTop: idx > 0 ? '1px solid var(--outline)' : 'none' }}>
                    <td className="px-3 py-3 font-mono text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                      {r.ctvId.slice(-8)}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                      {r.workerId ? r.workerId.slice(-8) : '-'}
                    </td>
                    <td className="px-3 py-3" style={{ color: 'var(--on-surface)' }}>{r.milestone}</td>
                    <td className="px-3 py-3 text-right font-mono" style={{ color: r.direction === 'REVERSAL' ? 'var(--error)' : 'var(--on-surface)' }}>
                      {r.direction === 'REVERSAL' ? '-' : ''}{Number(r.amount).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-3 text-center text-xs">{r.direction}</td>
                    <td className="px-3 py-3 text-center text-xs font-mono">{r.month}/{r.year}</td>
                    <td className="px-3 py-3 text-center"><StatusBadge s={r.status} /></td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {r.status === 'PENDING' && r.direction === 'CREDIT' && (
                          <>
                            <button
                              onClick={() => action(r.id, 'approve')}
                              disabled={busy === `${r.id}-approve`}
                              className="text-xs px-2 py-1 rounded"
                              style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => action(r.id, 'reject')}
                              disabled={busy === `${r.id}-reject`}
                              className="text-xs px-2 py-1 rounded bg-red-100 text-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {r.status === 'APPROVED' && r.direction === 'CREDIT' && (
                          <button
                            onClick={() => action(r.id, 'pay')}
                            disabled={busy === `${r.id}-pay`}
                            className="text-xs px-2 py-1 rounded"
                            style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}
                          >
                            Pay
                          </button>
                        )}
                        {(r.status === 'APPROVED' || r.status === 'PAID') && r.direction === 'CREDIT' && (
                          <button
                            onClick={() => action(r.id, 'reverse')}
                            disabled={busy === `${r.id}-reverse`}
                            className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700"
                          >
                            Reverse
                          </button>
                        )}
                        {r.status === 'PENDING' && r.direction === 'REVERSAL' && (
                          <button
                            onClick={() => action(r.id, 'approve')}
                            disabled={busy === `${r.id}-approve`}
                            className="text-xs px-2 py-1 rounded"
                            style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}
                            title="Approve REVERSAL — tạo Debt nếu vượt balance"
                          >
                            Approve Rev
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
