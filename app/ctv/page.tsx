'use client';
/**
 * CTV Dashboard — P1 Portals STEP-08 (RQ-09).
 *
 * Claims list + summary + affCode.
 */
import { useState, useEffect } from 'react';

interface Claim {
  id: string;
  workerId: string;
  claimType: string;
  status: string;
  createdAt: string;
}

interface CommissionSummary {
  ctvId: string;
  balance: string; // BigInt → string
  totalDebt: string;
  ledger: { items: LedgerRow[]; total: number; take: number; skip: number };
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

function CommissionSection() {
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ctv/commission/summary')
      .then(async (r) => {
        if (r.status === 403) { setError('CTV không có quyền'); return null; }
        return r.ok ? r.json() : null;
      })
      .then((d) => { if (d) setSummary(d); })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return null;
  if (!summary) return null;

  const balance = Number(summary.balance);
  const debt = Number(summary.totalDebt);

  return (
    <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm mb-6">
      <h2 className="text-base font-semibold mb-3">Hoa hồng (P2)</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-md p-3 bg-green-50">
          <p className="text-xs text-gray-500">Số dư khả dụng</p>
          <p className="font-bold text-lg text-green-700">{balance.toLocaleString('vi-VN')} ₫</p>
        </div>
        <div className="rounded-md p-3 bg-red-50">
          <p className="text-xs text-gray-500">Nợ hoa hồng</p>
          <p className="font-bold text-lg text-red-700">{debt.toLocaleString('vi-VN')} ₫</p>
        </div>
      </div>
      {summary.ledger.items.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-3">Chưa có dòng hoa hồng nào.</p>
      ) : (
        <div className="space-y-2">
          {summary.ledger.items.slice(0, 10).map((l) => (
            <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium">{l.milestone}</p>
                <p className="text-xs text-gray-500">{l.month}/{l.year} · {l.direction}</p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-sm ${l.direction === 'REVERSAL' ? 'text-red-600' : 'text-green-700'}`}>
                  {l.direction === 'REVERSAL' ? '-' : ''}{Number(l.amount).toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-gray-500">{l.status}</p>
              </div>
            </div>
          ))}
          {summary.ledger.total > 10 && (
            <p className="text-xs text-gray-400 text-center pt-2">+{summary.ledger.total - 10} dòng khác</p>
          )}
        </div>
      )}
    </div>
  );
}

interface Summary {
  affCode: string | null;
  phone: string | null;
  counts: { total: number; pending: number; accepted: number; rejected: number; merged: number };
  estimatedCommission: string;
  note: string;
}

export default function CtvPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [c, s] = await Promise.all([
      fetch('/api/ctv/claims').then((r) => r.ok ? r.json() : null),
      fetch('/api/ctv/summary').then((r) => r.ok ? r.json() : null),
    ]);
    if (c?.items) setClaims(c.items);
    if (s) setSummary(s);
  }

  async function copyCode() {
    if (!summary?.affCode) return;
    try {
      await navigator.clipboard.writeText(summary.affCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">CTV Dashboard</h1>

      {/* Summary */}
      {summary && (
        <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500">Mã giới thiệu</p>
              <div className="flex items-center gap-2 mt-1">
                <code className="font-mono text-lg bg-gray-100 px-2 py-1 rounded">{summary.affCode ?? '—'}</code>
                {summary.affCode && (
                  <button
                    onClick={copyCode}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Tích lũy dự kiến</p>
              <p className="font-bold text-lg">{Number(summary.estimatedCommission).toLocaleString('vi-VN')} ₫</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 pt-3 border-t border-gray-50">
            {(['total', 'pending', 'accepted', 'rejected', 'merged'] as const).map((k) => (
              <div key={k} className="text-center">
                <p className="text-2xl font-bold">{summary.counts[k]}</p>
                <p className="text-xs text-gray-500 capitalize">{k}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">{summary.note}</p>
        </div>
      )}

      {/* Commission Summary (P2 STEP-05) */}
      <CommissionSection />

      {/* Claims list */}
      <h2 className="font-semibold mb-3">Danh sách claims</h2>
      <div className="space-y-3">
        {claims.length === 0 && (
          <p className="text-center text-gray-400 py-8">Chưa có claim nào</p>
        )}
        {claims.map((c) => (
          <div key={c.id} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">Worker {c.workerId.slice(-6)}</p>
                <p className="text-sm text-gray-500">{c.claimType}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                c.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {c.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
