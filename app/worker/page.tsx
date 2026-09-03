'use client';
/**
 * Worker PWA main page — P1 Portals STEP-04 (RQ-03, RQ-04).
 * M8 STEP-04: Thêm tab "Phiếu lương" đọc từ Redis cache.
 */
import { useState, useEffect, useRef } from 'react';

type Tab = 'checkin' | 'history' | 'payslips' | 'tickets';

interface CheckinResult {
  ok: boolean;
  id?: string;
  message?: string;
  riskFlag?: boolean;
}

interface AttendanceRow {
  id: string;
  workDate: string;
  checkInTime: string;
  checkOutTime?: string;
  source: string;
  geofenceResult?: string;
  riskFlag?: boolean;
}

interface TicketRow {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  type: string;
}

interface PayslipRow {
  workerId: string;
  periodMonth: number;
  periodYear: number;
  grossSalary: number;
  netSalary: number;
  deductions: Record<string, number>;
  earned: Record<string, number>;
  computedAt: string;
}

export default function WorkerPage() {
  const [tab, setTab] = useState<Tab>('checkin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [history, setHistory] = useState<AttendanceRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const swReg = useRef<ServiceWorkerRegistration | null>(null);

  // ── PWA: register service worker ────────────────────────────────────────
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        swReg.current = reg;
      }).catch(console.error);
    }
  }, []);

  // ── Load history + tickets when tab changes ─────────────────────────────
  useEffect(() => {
    if (tab === 'history') loadHistory();
    if (tab === 'tickets') loadTickets();
    if (tab === 'payslips') loadPayslips();
  }, [tab]);

  // ── Sync queue size ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!('indexedDB' in window)) return;
    const dbReq = indexedDB.open('hrp_worker_db', 1);
    dbReq.onsuccess = () => {
      const tx = dbReq.result.transaction('checkin_queue', 'readonly');
      const store = tx.objectStore('checkin_queue');
      const countReq = store.count();
      countReq.onsuccess = () => setQueueSize(countReq.result);
    };
  }, []);

  function loadHistory() {
    fetch('/api/worker/attendance')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.items) setHistory(d.items); })
      .catch(() => {});
  }

  function loadTickets() {
    fetch('/api/worker/tickets')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.items) setTickets(d.items); })
      .catch(() => {});
  }

  async function loadPayslips() {
    setPayslipsLoading(true);
    setPayslips([]);
    try {
      // Fetch recent payslips — try to get last 3 months
      const now = new Date();
      const results: PayslipRow[] = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        const r = await fetch(`/api/webhook/payslip?workerId=self&periodMonth=${month}&periodYear=${year}`);
        if (r.ok) {
          const data = await r.json();
          if (data.payslip) results.push(data.payslip);
        }
      }
      setPayslips(results);
    } catch {
      // Silently fail — payslip cache may be empty
    } finally {
      setPayslipsLoading(false);
    }
  }

  function formatVnd(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
  }

  // ── Do check-in ──────────────────────────────────────────────────────────
  async function handleCheckIn() {
    setLoading(true);
    setMessage(null);

    const position = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    const payload = {
      workDate: new Date().toISOString().split('T')[0],
      checkInTime: new Date().toTimeString().slice(0, 5),
      gpsLatitude: position?.lat,
      gpsLongitude: position?.lng,
      capturedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/worker/checkins', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data: CheckinResult = await res.json();
        setMessage({ type: 'ok', text: data.message || 'Chấm công thành công!' });
        loadHistory();
      } else if (res.status === 503) {
        await queueOffline(payload);
        setMessage({ type: 'ok', text: 'Offline: đã lưu vào queue, sẽ đồng bộ khi online.' });
        updateQueueSize();
      } else {
        const err = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
        setMessage({ type: 'err', text: err.message || 'Lỗi chấm công' });
      }
    } catch {
      await queueOffline(payload);
      setMessage({ type: 'ok', text: 'Offline: đã lưu queue, sẽ đồng bộ khi online.' });
      updateQueueSize();
    } finally {
      setLoading(false);
    }
  }

  async function queueOffline(payload: object) {
    if (!('indexedDB' in window)) return;
    const dbReq = indexedDB.open('hrp_worker_db', 1);
    await new Promise<void>((resolve) => {
      dbReq.onsuccess = () => {
        const tx = dbReq.result.transaction('checkin_queue', 'readwrite');
        tx.objectStore('checkin_queue').add({ data: payload, queuedAt: new Date().toISOString() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      };
      dbReq.onerror = () => resolve();
    });
    if (swReg.current && 'sync' in swReg.current) {
      (swReg.current as unknown as { sync: { register: (tag: string) => Promise<void> } })
        .sync.register('sync-checkins')
        .catch(() => {});
    }
  }

  async function updateQueueSize() {
    if (!('indexedDB' in window)) return;
    const dbReq = indexedDB.open('hrp_worker_db', 1);
    dbReq.onsuccess = () => {
      const tx = dbReq.result.transaction('checkin_queue', 'readonly');
      tx.objectStore('checkin_queue').count().onsuccess = (e: any) => setQueueSize(e.target.result);
    };
  }

  async function syncQueue() {
    if (!swReg.current) return;
    swReg.current.active?.postMessage({ type: 'SYNC_CHECKINS' });
    setMessage({ type: 'ok', text: 'Đang đồng bộ queue...' });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--on-surface, #1e293b)' }}>HRPartner Worker</h1>
        <p className="text-sm" style={{ color: 'var(--on-surface-variant, #64748b)' }}>Chấm công &amp; theo dõi</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 mb-6 rounded-lg" style={{ background: 'var(--surface-container, #f1f5f9)' }}>
        {([
          ['checkin', 'Chấm công'],
          ['history', 'Lịch sử'],
          ['payslips', 'Phiếu lương'],
          ['tickets', 'Phiếu'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
            style={{
              background: tab === t ? 'white' : 'transparent',
              color: tab === t ? 'var(--primary, #2563eb)' : 'var(--on-surface-variant, #64748b)',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Queue banner */}
      {queueSize > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-center justify-between" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <span className="text-sm" style={{ color: '#92400e' }}>
            {queueSize} check-in đang chờ đồng bộ
          </span>
          <button
            onClick={syncQueue}
            className="text-xs px-3 py-1 rounded-full text-white"
            style={{ background: '#f59e0b' }}
          >
            Sync ngay
          </button>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'ok' ? 'text-green-700' : 'text-red-700'
        }`} style={{
          background: message.type === 'ok' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.type === 'ok' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {message.text}
        </div>
      )}

      {/* Tab content */}
      {tab === 'checkin' && (
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="relative w-48 h-48">
            <div className="absolute inset-0 rounded-full opacity-10" style={{ border: '8px solid var(--primary, #2563eb)' }} />
            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="absolute inset-4 rounded-full text-white font-bold text-lg shadow-lg transition-colors disabled:opacity-50"
              style={{ background: 'var(--primary, #2563eb)' }}
            >
              {loading ? '...' : 'CHẤM CÔNG'}
            </button>
          </div>
          <p className="text-center text-sm" style={{ color: 'var(--on-surface-variant, #64748b)' }}>
            Nhấn để chấm công{typeof navigator !== 'undefined' && 'geolocation' in navigator ? ' với GPS' : ''}
          </p>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 && (
            <p className="text-center py-8" style={{ color: 'var(--on-surface-variant, #94a3b8)' }}>Chưa có lịch sử chấm công</p>
          )}
          {history.map((h) => (
            <div key={h.id} className="rounded-lg p-4 shadow-sm" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium" style={{ color: '#1e293b' }}>{h.workDate}</p>
                  <p className="text-sm" style={{ color: '#64748b' }}>
                    Vào: {h.checkInTime} {h.checkOutTime ? `– ${h.checkOutTime}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#f1f5f9', color: '#475569' }}>{h.source}</span>
                  {h.geofenceResult && h.geofenceResult !== 'NONE' && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{
                      background: h.geofenceResult === 'INSIDE' ? '#dcfce7' : '#fee2e2',
                      color: h.geofenceResult === 'INSIDE' ? '#166534' : '#991b1b',
                    }}>
                      {h.geofenceResult === 'INSIDE' ? '✓ Trong khu vực' : '⚠ Ngoài khu vực'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'payslips' && (
        <div className="space-y-3">
          {payslipsLoading && (
            <p className="text-center py-8" style={{ color: 'var(--on-surface-variant, #64748b)' }}>Đang tải phiếu lương…</p>
          )}
          {!payslipsLoading && payslips.length === 0 && (
            <div className="text-center py-8">
              <p className="font-medium" style={{ color: '#1e293b' }}>Chưa có phiếu lương</p>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>Phiếu lương sẽ xuất hiện sau khi app Python tính lương và đẩy dữ liệu lên.</p>
            </div>
          )}
          {payslips.map((p, i) => (
            <div key={i} className="rounded-lg p-4 shadow-sm" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold" style={{ color: '#1e293b' }}>
                    Tháng {p.periodMonth}/{p.periodYear}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Tính lúc: {new Date(p.computedAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#dcfce7', color: '#166534' }}>Đã tính</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: '#64748b' }}>Lương gross</span>
                  <span className="font-medium" style={{ color: '#1e293b' }}>{formatVnd(p.grossSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#64748b' }}>Lương net</span>
                  <span className="font-semibold" style={{ color: '#166534' }}>{formatVnd(p.netSalary)}</span>
                </div>
                {Object.keys(p.deductions ?? {}).length > 0 && (
                  <div className="pt-1 mt-1" style={{ borderTop: '1px dashed #e2e8f0' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-on-surface-variant)' }}>Khấu trừ</p>
                    {Object.entries(p.deductions).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span style={{ color: '#64748b' }}>{k}</span>
                        <span style={{ color: '#dc2626' }}>-{formatVnd(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tickets' && (
        <div className="space-y-3">
          {tickets.length === 0 && (
            <p className="text-center py-8" style={{ color: 'var(--on-surface-variant, #94a3b8)' }}>Chưa có phiếu nào</p>
          )}
          {tickets.map((t) => (
            <div key={t.id} className="rounded-lg p-4 shadow-sm" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium" style={{ color: '#1e293b' }}>{t.title}</p>
                  <p className="text-sm" style={{ color: '#64748b' }}>{t.type} · {t.createdAt}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  t.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                  t.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
