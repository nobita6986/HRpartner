'use client';
/**
 * Vendor Portal main page — P1 Portals STEP-06 (RQ-06, RQ-08).
 *
 * 2 tabs: Orders + Kho hồ sơ (G13).
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
  dedupWorkerId: string | null;
  createdAt: string;
}

type Tab = 'orders' | 'pool' | 'statements';

export default function VendorPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [applyOrder, setApplyOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
    else loadSubmissions();
  }, [tab]);

  async function loadOrders() {
    const res = await fetch('/api/vendor/orders');
    if (res.ok) {
      const data = await res.json();
      setOrders(data.items ?? []);
    }
  }

  async function loadSubmissions() {
    const res = await fetch('/api/vendor/submissions');
    if (res.ok) {
      const data = await res.json();
      setSubmissions(data.items ?? []);
    }
  }

  async function handleApply(orderId: string, formData: FormData) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/vendor/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderId,
          fullName: formData.get('fullName'),
          phone: formData.get('phone'),
          cccdNumber: formData.get('cccdNumber') || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const dedupHint = data.dedupHint ? `\n� ${data.dedupHint}` : '';
        setMessage({ type: 'ok', text: `Đã nộp ứng viên.${dedupHint}` });
        setApplyOrder(null);
        loadOrders();
        loadSubmissions();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'err', text: err.message || err.error || 'Lỗi nộp' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Lỗi mạng' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Vendor Portal</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {([['orders', 'Nhu cầu'], ['pool', 'Kho hồ sơ'], ['statements', 'Biên bản']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-md ${
              tab === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm whitespace-pre-line ${
          message.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Orders */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 && (
            <p className="text-center text-gray-400 py-8">Chưa có nhu cầu ACTIVE</p>
          )}
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{o.code}</p>
                  <p className="text-sm text-gray-500">{o.projectName}</p>
                  {o.startDate && o.endDate && (
                    <p className="text-xs text-gray-400 mt-1">{o.startDate} → {o.endDate}</p>
                  )}
                </div>
                <button
                  onClick={() => setApplyOrder(o)}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Nộp ứng viên
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
                {o.slots.map((s) => (
                  <span key={s.id} className={`text-xs px-2 py-1 rounded ${
                    s.remaining > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {s.role}: {s.remaining}/{s.headcount}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kho hồ sơ (G13) */}
      {tab === 'pool' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 mb-2">
            Kho hồ sơ bao gồm mọi trạng thái. Nộp lại 1 chạm cho nhu cầu mới.
          </p>
          {submissions.length === 0 && (
            <p className="text-center text-gray-400 py-8">Chưa có ứng viên nào</p>
          )}
          {submissions.map((s) => (
            <div key={s.id} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{s.fullName}</p>
                  <p className="text-sm text-gray-500">{s.phone}{s.cccdNumber ? ` · CCCD ${s.cccdNumber.slice(-4)}` : ''}</p>
                  {s.orderCode && (
                    <p className="text-xs text-gray-400 mt-1">Cho: {s.orderCode}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  s.status === 'QUALIFIED' ? 'bg-green-100 text-green-700' :
                  s.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                  s.status === 'MERGED' ? 'bg-purple-100 text-purple-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {s.status}
                </span>
              </div>
              {s.blockCode && (
                <p className="text-xs text-red-600 mt-2">Block: {s.blockCode}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'statements' && (
        <div className="text-center text-gray-400 py-8">
          Xem trang <a href="/vendor/statements" className="text-blue-600">/vendor/statements</a>
        </div>
      )}

      {/* Apply dialog */}
      {applyOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="font-semibold mb-4">Nộp ứng viên cho {applyOrder.code}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleApply(applyOrder.id, new FormData(e.currentTarget));
              }}
              className="space-y-3"
            >
              <input
                name="fullName"
                placeholder="Họ tên"
                required
                className="w-full px-3 py-2 border rounded-md"
              />
              <input
                name="phone"
                placeholder="SĐT"
                required
                pattern="^0[0-9]{9}$"
                className="w-full px-3 py-2 border rounded-md"
              />
              <input
                name="cccdNumber"
                placeholder="CCCD (tùy chọn)"
                className="w-full px-3 py-2 border rounded-md"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyOrder(null)}
                  className="flex-1 px-3 py-2 border rounded-md"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
                >
                  {loading ? '�ang nộp...' : 'Nộp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
