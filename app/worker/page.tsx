'use client';
/**
 * Worker PWA main page — P1 Portals STEP-04 (RQ-03, RQ-04).
 *
 * Mobile-first UI: 3 tabs — Chấm công, Lịch sử, Phiếu của tôi.
 * Uses service worker for offline queue (DEC-04).
 */
import { useState, useEffect, useRef } from 'react';

type Tab = 'checkin' | 'history' | 'tickets';

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

export default function WorkerPage() {
  const [tab, setTab] = useState<Tab>('checkin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [history, setHistory] = useState<AttendanceRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
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
      gpsAccuracyMeters: position ? undefined : undefined,
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
        // Offline — queue it
        await queueOffline(payload);
        setMessage({ type: 'ok', text: 'Offline: đã lưu vào queue, sẽ đồng bộ khi online.' });
        updateQueueSize();
      } else {
        const err = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
        setMessage({ type: 'err', text: err.message || 'Lỗi chấm công' });
      }
    } catch {
      // Network error — queue offline
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
    // Trigger background sync if available
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
        <h1 className="text-xl font-bold text-gray-900">HRPartner Worker</h1>
        <p className="text-sm text-gray-500">Chấm công &amp; theo dõi</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {([['checkin', 'Chấm công'], ['history', 'Lịch sử'], ['tickets', 'Phiếu']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Queue banner */}
      {queueSize > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-amber-700">
            {queueSize} check-in đang chờ đồng bộ
          </span>
          <button
            onClick={syncQueue}
            className="text-xs px-3 py-1 bg-amber-500 text-white rounded-full"
          >
            Sync ngay
          </button>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tab content */}
      {tab === 'checkin' && (
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="relative w-48 h-48">
            <div className="absolute inset-0 rounded-full border-8 border-blue-600 opacity-10" />
            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="absolute inset-4 rounded-full bg-blue-600 text-white font-bold text-lg shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'CHẤM CÔNG'}
            </button>
          </div>
          <p className="text-center text-gray-500 text-sm">
            Nhấn để chấm công{typeof navigator !== 'undefined' && 'geolocation' in navigator ? ' với GPS' : ''}
          </p>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 && (
            <p className="text-center text-gray-400 py-8">Chưa có lịch sử chấm công</p>
          )}
          {history.map((h) => (
            <div key={h.id} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{h.workDate}</p>
                  <p className="text-sm text-gray-500">
                    Vào: {h.checkInTime} {h.checkOutTime ? `– ${h.checkOutTime}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{h.source}</span>
                  {h.geofenceResult && h.geofenceResult !== 'NONE' && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      h.geofenceResult === 'INSIDE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {h.geofenceResult === 'INSIDE' ? '✓ Trong khu vực' : '⚠ Ngoài khu vực'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tickets' && (
        <div className="space-y-3">
          {tickets.length === 0 && (
            <p className="text-center text-gray-400 py-8">Chưa có phiếu nào</p>
          )}
          {tickets.map((t) => (
            <div key={t.id} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{t.title}</p>
                  <p className="text-sm text-gray-500">{t.type} · {t.createdAt}</p>
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
