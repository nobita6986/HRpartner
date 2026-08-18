'use client';
/**
 * Vendor statements page — P1 Portals STEP-07 (RQ-07).
 * Tab: Statements
 */
import { useState, useEffect } from 'react';

interface Statement {
  id: string;
  periodLabel: string;
  status: string;
  disputeCount: number;
  confirmDeadlineAt: string | null;
  totalAmount: string;
}

export default function VendorStatementsPage() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [disputeOpen, setDisputeOpen] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch('/api/vendor/statements');
    if (res.ok) {
      const data = await res.json();
      setStatements(data.items ?? []);
    }
  }

  async function handleConfirm(id: string) {
    setActionMsg(null);
    const res = await fetch(`/api/vendor/statements/${id}/confirm`, { method: 'POST' });
    if (res.ok) {
      setActionMsg({ type: 'ok', text: 'Đã xác nhận biên bản' });
      load();
    } else {
      const err = await res.json().catch(() => ({}));
      setActionMsg({ type: 'err', text: err.message || err.error || 'Lỗi' });
    }
  }

  async function handleDispute(id: string) {
    setActionMsg(null);
    const res = await fetch(`/api/vendor/statements/${id}/dispute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: disputeReason }),
    });
    if (res.ok) {
      setActionMsg({ type: 'ok', text: 'Đã gửi phản đối' });
      setDisputeOpen(null);
      setDisputeReason('');
      load();
    } else {
      const err = await res.json().catch(() => ({}));
      setActionMsg({ type: 'err', text: err.message || err.error || 'Lỗi' });
    }
  }

  async function handleExport(id: string) {
    window.open(`/api/vendor/statements/${id}/export`, '_blank');
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Biên bản đối soát</h1>

      {actionMsg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          actionMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {actionMsg.text}
        </div>
      )}

      <div className="space-y-4">
        {statements.length === 0 && (
          <p className="text-center text-gray-400 py-8">Chưa có biên bản nào</p>
        )}
        {statements.map((s) => (
          <div key={s.id} className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-gray-900">{s.periodLabel}</p>
                <p className="text-sm text-gray-500">Tổng: {Number(s.totalAmount).toLocaleString('vi-VN')} ₫</p>
                {s.confirmDeadlineAt && new Date(s.confirmDeadlineAt) > new Date() && s.status === 'SENT' && (
                  <p className="text-xs text-amber-600 mt-1">
                    Hạn xác nhận: {new Date(s.confirmDeadlineAt).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                s.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                s.status === 'DISPUTED' ? 'bg-red-100 text-red-700' :
                s.status === 'SENT' ? 'bg-yellow-100 text-yellow-700' :
                s.status === 'PAID' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {s.status}
              </span>
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-50">
              {s.status === 'SENT' && (
                <>
                  <button
                    onClick={() => handleConfirm(s.id)}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Xác nhận
                  </button>
                  <button
                    onClick={() => setDisputeOpen(s.id)}
                    disabled={s.disputeCount >= 2}
                    className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Phản đối {s.disputeCount >= 2 && '(max)'}
                  </button>
                </>
              )}
              <button
                onClick={() => handleExport(s.id)}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Xuất CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dispute dialog */}
      {disputeOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="font-semibold mb-4">Phản đối biên bản</h3>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Lý do phản đối..."
              rows={3}
              className="w-full px-3 py-2 border rounded-md mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDisputeOpen(null); setDisputeReason(''); }}
                className="flex-1 px-3 py-2 border rounded-md"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDispute(disputeOpen)}
                disabled={!disputeReason.trim()}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md disabled:opacity-50"
              >
                Gửi phản đối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
