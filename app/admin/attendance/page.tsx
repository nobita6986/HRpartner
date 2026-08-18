/**
 * /admin/attendance — Chấm công (S03 narrative F00A bước 6-10, moment 06:20–08:30).
 *
 * Phase 5 UAT/Cutover STEP-01 (RQ-03): wire from API (no more MOCK_*).
 *
 * F00A bước 6-10:
 *   6. (05:40) Click badge "7 ngoại lệ công" → Exception Workbench
 *   7. (06:20) Click exception → Resolve drawer
 *   8. (07:30) Duyệt kỳ → readiness bar "Sẵn sàng khóa"
 *   9. (08:30) Khóa kỳ → confirmation → tạo đối soát
 */

'use client';

import { useState, useEffect } from 'react';

type Tab = 'batches' | 'periods' | 'exceptions';
type BatchStatus = 'PENDING' | 'PREVIEWED' | 'COMMITTED' | 'FAILED';
type PeriodStatus = 'PENDING' | 'REVIEWED' | 'APPROVED' | 'LOCKED';

interface Batch {
  id: string;
  source: string;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  anomalyRows: number;
  status: BatchStatus;
  startedAt: string;
}

interface Period {
  id: string;
  month: number;
  year: number;
  status: PeriodStatus;
  version: number;
  lockedAt: string | null;
}

interface UnmatchedRow {
  id: string;
  batchId: string;
  rowNumber: number;
  rawEmployeeCode: string;
  rawDate: string;
  rawTime: string;
  rawType: string;
}

function StatusBadge({ status }: { status: BatchStatus | PeriodStatus }) {
  const colors: Record<string, string> = {
    PENDING: 'var(--warning)',
    PREVIEWED: 'var(--info)',
    COMMITTED: 'var(--success)',
    REVIEWED: 'var(--info)',
    APPROVED: 'var(--success)',
    FAILED: 'var(--error)',
    LOCKED: 'var(--primary-dark)',
  };
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
      style={{ background: colors[status] + '20', color: colors[status] ?? 'var(--on-surface-variant)' }}
    >
      {status}
    </span>
  );
}

function AnomalyBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: 'var(--warning)', color: '#fff' }}
    >
      {count} ngoại lệ
    </span>
  );
}

function ResolveDrawer({
  row,
  onClose,
  onResolved,
}: {
  row: UnmatchedRow | null;
  onClose: () => void;
  onResolved: (rowId: string, workerId: string) => void;
}) {
  const [workerCode, setWorkerCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!row) return null;

  const submit = async () => {
    if (!workerCode.trim()) { setError('Nhap ma nhan vien'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/attendance/import/${row.batchId}/resolve`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resolves: [{ rowId: row.id, matchedWorkerId: workerCode.trim(), note: 'Resolved via UI' }] }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.message ?? 'Resolve that bai');
        return;
      }
      onResolved(row.id, workerCode.trim());
      onClose();
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="h-full w-full max-w-md p-6 shadow-xl" style={{ background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>Resolve unmatched row</h3>
        <p className="mb-2 text-sm" style={{ color: 'var(--on-surface-variant)' }}>Ma nhan vien (raw): <strong>{row.rawEmployeeCode}</strong></p>
        <p className="mb-4 text-xs" style={{ color: 'var(--on-surface-variant)' }}>Row #{row.rowNumber} -- {row.rawDate} {row.rawTime} {row.rawType}</p>
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Worker ID (matched)</label>
        <input
          type="text"
          value={workerCode}
          onChange={e => setWorkerCode(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--outline)' }}
          placeholder="worker-001"
        />
        {error && <p className="mb-4 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2 text-sm" style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}>Huy</button>
          <button onClick={submit} disabled={submitting} className="rounded px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--primary-dark)' }}>
            {submitting ? 'Dang luu...' : 'Resolve'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdjustmentDrawer({
  period,
  onClose,
  onCreated,
}: {
  period: Period | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [workerId, setWorkerId] = useState('');
  const [deltaHours, setDeltaHours] = useState('0');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!period) return null;

  const submit = async () => {
    if (!workerId.trim()) { setError('Nhap worker ID'); return; }
    if (!reason.trim()) { setError('Nhap ly do (required)'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/attendance/adjustments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ periodId: period.id, workerId: workerId.trim(), deltaHours: Number(deltaHours), reason: reason.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.message ?? 'Tao adjustment that bai');
        return;
      }
      onCreated();
      onClose();
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="h-full w-full max-w-md p-6 shadow-xl" style={{ background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>
          Tao adjustment -- Thang {period.month}/{period.year} v{period.version}
        </h3>
        <p className="mb-4 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
          Status: {period.status}. ADR-013: LOCKED bat bien -- can REOPEN truoc.
        </p>
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Worker ID</label>
        <input type="text" value={workerId} onChange={e => setWorkerId(e.target.value)} className="mb-3 w-full rounded border px-3 py-2 text-sm" style={{ borderColor: 'var(--outline)' }} />
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Delta hours (positive = +, negative = -)</label>
        <input type="number" step="0.5" value={deltaHours} onChange={e => setDeltaHours(e.target.value)} className="mb-3 w-full rounded border px-3 py-2 text-sm" style={{ borderColor: 'var(--outline)' }} />
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Reason (required)</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="mb-4 w-full rounded border px-3 py-2 text-sm" style={{ borderColor: 'var(--outline)' }} placeholder="Vi du: di muon 30 phut do tac duong" />
        {error && <p className="mb-4 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2 text-sm" style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}>Huy</button>
          <button onClick={submit} disabled={submitting} className="rounded px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--primary-dark)' }}>
            {submitting ? 'Dang luu...' : 'Tao adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 rounded animate-pulse bg-gray-200" /></td>
      ))}
    </tr>
  );
}

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>('batches');

  // Batches
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesError, setBatchesError] = useState('');

  // Periods
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [periodsError, setPeriodsError] = useState('');

  // Exceptions (unmatched rows from batch preview)
  const [exceptions, setExceptions] = useState<UnmatchedRow[]>([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [exceptionsError, setExceptionsError] = useState('');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showResolveDrawer, setShowResolveDrawer] = useState<UnmatchedRow | null>(null);
  const [showAdjustmentDrawer, setShowAdjustmentDrawer] = useState<Period | null>(null);

  // ── Fetch batches ──────────────────────────────────────────────────────
  const loadBatches = () => {
    setBatchesLoading(true);
    fetch('/api/attendance/import?take=20')
      .then(r => r.json())
      .then(d => {
        if (d.batches) {
          setBatches(d.batches.map((b: any) => ({
            id: b.id,
            source: b.source,
            totalRows: b.totalRows,
            matchedRows: b.matchedRows,
            unmatchedRows: b.unmatchedRows,
            anomalyRows: b.anomalyRows,
            status: b.status,
            startedAt: b.startedAt,
          })));
        }
      })
      .catch(e => setBatchesError(String(e)))
      .finally(() => setBatchesLoading(false));
  };

  // ── Fetch periods ──────────────────────────────────────────────────────
  const loadPeriods = () => {
    setPeriodsLoading(true);
    fetch('/api/attendance/timesheets?take=20')
      .then(r => r.json())
      .then(d => {
        if (d.periods) {
          setPeriods(d.periods.map((p: any) => ({
            id: p.id,
            month: p.month,
            year: p.year,
            status: p.status,
            version: p.version,
            lockedAt: p.lockedAt,
          })));
        }
      })
      .catch(e => setPeriodsError(String(e)))
      .finally(() => setPeriodsLoading(false));
  };

  // ── Fetch exceptions (from pending batches) ────────────────────────────
  const loadExceptions = () => {
    setExceptionsLoading(true);
    fetch('/api/attendance/import?take=5&status=PENDING')
      .then(r => r.json())
      .then(async d => {
        if (d.batches && d.batches.length > 0) {
          // Get preview for first pending batch to show unmatched rows
          const batchId = d.batches[0].id;
          const previewRes = await fetch(`/api/attendance/import?batchId=${batchId}`);
          const preview = await previewRes.json();
          if (preview.batch?.unmatchedRows) {
            setExceptions(preview.batch.unmatchedRows.map((u: any) => ({
              id: u.id,
              batchId,
              rowNumber: u.rowNumber,
              rawEmployeeCode: u.rawEmployeeCode,
              rawDate: u.rawDate,
              rawTime: u.rawTime,
              rawType: u.rawType,
            })));
          }
        }
      })
      .catch(e => setExceptionsError(String(e)))
      .finally(() => setExceptionsLoading(false));
  };

  useEffect(() => {
    if (tab === 'batches') loadBatches();
    else if (tab === 'periods') loadPeriods();
    else if (tab === 'exceptions') loadExceptions();
  }, [tab]);

  const handleResolved = (rowId: string) => {
    setExceptions(prev => prev.filter(r => r.id !== rowId));
  };

  return (
    <div className="px-6 py-8 lg:px-8" style={{ background: 'var(--surface)' }}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--on-surface)' }}>Chấm công</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Module M7 — slice 4B · F00A moment 06:20–08:30 · Import → taxonomy → Lock
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
        {(['batches', 'periods', 'exceptions'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="pb-3 text-sm font-medium transition-colors"
            style={{
              color: tab === t ? 'var(--primary-dark)' : 'var(--on-surface-variant)',
              borderBottom: tab === t ? '2px solid var(--primary-dark)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {t === 'batches' ? 'Import batch' : t === 'periods' ? 'Kỳ công' : 'Ngoại lệ'}
          </button>
        ))}
      </div>

      {/* Batches Tab */}
      {tab === 'batches' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium" style={{ color: 'var(--on-surface)' }}>Import batch</h2>
            <button onClick={() => setShowUploadModal(true)} className="rounded px-4 py-2 text-sm font-medium transition-colors" style={{ background: 'var(--primary-dark)', color: '#fff' }}>
              + Upload CSV
            </button>
          </div>
          {batchesLoading ? (
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
              <table className="w-full text-sm">
                <thead><tr style={{ background: 'var(--surface-container)' }}>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3 text-left font-medium">Rows</th>
                  <th className="px-4 py-3 text-left font-medium">Matched</th>
                  <th className="px-4 py-3 text-left font-medium">Unmatched</th>
                  <th className="px-4 py-3 text-left font-medium">Anomaly</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr></thead>
                <tbody><LoadingRow cols={6} /></tbody>
              </table>
            </div>
          ) : batchesError ? (
            <p className="text-sm text-red-500">{batchesError}</p>
          ) : batches.length === 0 ? (
            <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--outline-variant)' }}>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Chưa có batch nào. Upload file CSV/XLSX để bắt đầu.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
              <table className="w-full text-sm">
                <thead><tr style={{ background: 'var(--surface-container)' }}>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3 text-left font-medium">Rows</th>
                  <th className="px-4 py-3 text-left font-medium">Matched</th>
                  <th className="px-4 py-3 text-left font-medium">Unmatched</th>
                  <th className="px-4 py-3 text-left font-medium">Anomaly</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {batches.map(b => (
                    <tr key={b.id} className="border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                      <td className="px-4 py-3">{b.source}</td>
                      <td className="px-4 py-3">{b.totalRows.toLocaleString()}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--success)' }}>{b.matchedRows.toLocaleString()}</td>
                      <td className="px-4 py-3" style={{ color: b.unmatchedRows > 0 ? 'var(--warning)' : 'var(--on-surface)' }}>
                        {b.unmatchedRows}<AnomalyBadge count={b.unmatchedRows} />
                      </td>
                      <td className="px-4 py-3" style={{ color: b.anomalyRows > 0 ? 'var(--warning)' : 'var(--on-surface)' }}>{b.anomalyRows}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Periods Tab */}
      {tab === 'periods' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium" style={{ color: 'var(--on-surface)' }}>Kỳ công</h2>
          </div>
          {periodsLoading ? (
            <div className="space-y-3">{[1, 2].map(i => <LoadingRow key={i} cols={4} />)}</div>
          ) : periodsError ? (
            <p className="text-sm text-red-500">{periodsError}</p>
          ) : periods.length === 0 ? (
            <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--outline-variant)' }}>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Chưa có kỳ công nào.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {periods.map(p => (
                <div key={p.id} className="rounded-lg border p-4" style={{ borderColor: 'var(--outline-variant)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-base font-medium" style={{ color: 'var(--on-surface)' }}>
                        Tháng {p.month.toString().padStart(2, '0')} / {p.year}
                      </span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--on-surface-variant)' }}>v{p.version}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={p.status} />
                      {p.status !== 'LOCKED' && (
                        <button onClick={() => setShowAdjustmentDrawer(p)} className="rounded border px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--primary-dark)', color: 'var(--primary-dark)' }}>+ Adjustment</button>
                      )}
                      {p.status === 'REVIEWED' && (
                        <button className="rounded border px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>Approve</button>
                      )}
                      {p.status === 'APPROVED' && (
                        <button className="rounded px-3 py-1 text-xs font-semibold text-white" style={{ background: 'var(--primary-dark)' }}>Khóa kỳ</button>
                      )}
                      {p.status === 'LOCKED' && (
                        <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Đã khóa {p.lockedAt ? new Date(p.lockedAt).toLocaleDateString('vi-VN') : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exceptions Tab */}
      {tab === 'exceptions' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-medium" style={{ color: 'var(--on-surface)' }}>Ngoại lệ công</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>Taxonomy G29: 3 loại lỗi → 3 chủ xử lý (KT / HR / PM)</p>
          </div>
          <div className="mb-4 flex gap-3">
            {(['ALL', 'KT', 'HR', 'PM'] as const).map(owner => (
              <button key={owner} className="rounded border px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--outline)', color: owner === 'ALL' ? 'var(--primary-dark)' : 'var(--on-surface-variant)', background: 'transparent' }}>
                {owner === 'ALL' ? 'Tất cả' : owner}
              </button>
            ))}
          </div>
          {exceptionsLoading ? (
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
              <table className="w-full text-sm"><tbody><LoadingRow cols={5} /></tbody></table>
            </div>
          ) : exceptionsError ? (
            <p className="text-sm text-red-500">{exceptionsError}</p>
          ) : exceptions.length === 0 ? (
            <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--outline-variant)' }}>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Khong co ngoai le nao.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
              <table className="w-full text-sm">
                <thead><tr style={{ background: 'var(--surface-container)' }}>
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">Employee code</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                </tr></thead>
                <tbody>
                  {exceptions.map(row => (
                    <tr key={row.id} className="border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                      <td className="px-4 py-3">{row.id}</td>
                      <td className="px-4 py-3">{row.rawEmployeeCode}</td>
                      <td className="px-4 py-3">{row.rawDate}</td>
                      <td className="px-4 py-3">{row.rawTime}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setShowResolveDrawer(row)} className="rounded border px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--primary-dark)', color: 'var(--primary-dark)' }}>Resolve</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowUploadModal(false)}>
          <div className="w-full max-w-md rounded-xl p-6 shadow-xl" style={{ background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>Upload file chấm công</h3>
            <p className="text-sm text-gray-500 mb-4">Chuc nang upload CSV/XLSX — xem lai API route /api/attendance/import POST</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowUploadModal(false)} className="rounded border px-4 py-2 text-sm" style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      <ResolveDrawer row={showResolveDrawer} onClose={() => setShowResolveDrawer(null)} onResolved={handleResolved} />
      <AdjustmentDrawer period={showAdjustmentDrawer} onClose={() => setShowAdjustmentDrawer(null)} onCreated={() => {}} />
    </div>
  );
}
