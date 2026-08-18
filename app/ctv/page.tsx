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
