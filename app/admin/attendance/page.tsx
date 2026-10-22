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
import {
  ATTENDANCE_LABELS,
  attendanceBatchStatusLabel,
  attendanceOwnerLabel,
  attendancePeriodStatusLabel,
  attendanceSourceLabel,
} from '@/src/shared/i18n/attendance-labels';

type Tab = 'workers' | 'batches' | 'periods' | 'exceptions';
type BatchStatus = 'PENDING' | 'PREVIEWED' | 'COMMITTED' | 'FAILED';
type PeriodStatus = 'PENDING' | 'REVIEWED' | 'APPROVED' | 'LOCKED';

interface WorkerAttendanceSummaryItem {
  stt: number;
  workerId: string;
  workerUserId: string;
  employeeCode: string;
  workerName: string;
  workerPhone: string;
  workerCccd: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  shiftCode: string;
  shiftName: string;
  standardHours: number;
  totalDays: number;
  completedDays: number;
  totalWorkdays: number;
  totalRegularHours: number;
  totalOtHours: number;
  totalHours: number;
}

interface WorkerAttendanceDetailItem {
  stt: number;
  workDate: string;
  workerId: string;
  workerUserId: string;
  employeeCode: string;
  workerName: string;
  workerPhone: string;
  projectCode: string;
  projectName: string;
  siteName: string;
  shiftCode: string;
  shiftName: string;
  checkInTime: string;
  checkOutTime: string;
  workdays: number;
  regularHours: number;
  otHours: number;
  totalHours: number;
  source: string;
  statusNote: string;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

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

function StatusBadge({ status, label }: { status: BatchStatus | PeriodStatus; label: string }) {
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
      {label}
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
    if (!workerCode.trim()) { setError(ATTENDANCE_LABELS.missingEmployeeCode); return; }
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
        setError(j.message ?? ATTENDANCE_LABELS.resolveFailed);
        return;
      }
      onResolved(row.id, workerCode.trim());
      onClose();
    } catch { setError(ATTENDANCE_LABELS.networkError); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="h-full w-full max-w-md p-6 shadow-xl" style={{ background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>{ATTENDANCE_LABELS.unmatchedRow}</h3>
        <p className="mb-2 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{ATTENDANCE_LABELS.rawEmployeeCode}: <strong>{row.rawEmployeeCode}</strong></p>
        <p className="mb-4 text-xs" style={{ color: 'var(--on-surface-variant)' }}>{ATTENDANCE_LABELS.lineNumber} #{row.rowNumber} — {row.rawDate} {row.rawTime} {row.rawType}</p>
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>{ATTENDANCE_LABELS.matchedWorkerId}</label>
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
          <button onClick={onClose} className="rounded border px-4 py-2 text-sm" style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}>{ATTENDANCE_LABELS.cancel}</button>
          <button onClick={submit} disabled={submitting} className="rounded px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--primary-dark)' }}>
            {submitting ? 'Đang lưu…' : ATTENDANCE_LABELS.resolve}
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
    if (!workerId.trim()) { setError(ATTENDANCE_LABELS.missingEmployeeCode); return; }
    if (!reason.trim()) { setError(ATTENDANCE_LABELS.missingReason); return; }
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
        setError(j.message ?? ATTENDANCE_LABELS.adjustmentFailed);
        return;
      }
      onCreated();
      onClose();
    } catch { setError(ATTENDANCE_LABELS.networkError); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="h-full w-full max-w-md p-6 shadow-xl" style={{ background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>
          {ATTENDANCE_LABELS.createAdjustment} — {ATTENDANCE_LABELS.month.toLowerCase()} {period.month}/{period.year} v{period.version}
        </h3>
        <p className="mb-4 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
          {ATTENDANCE_LABELS.statusPrefix}: {attendancePeriodStatusLabel(period.status)}. ADR-013: {ATTENDANCE_LABELS.lockedPeriodNote}
        </p>
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>{ATTENDANCE_LABELS.workerId}</label>
        <input type="text" value={workerId} onChange={e => setWorkerId(e.target.value)} className="mb-3 w-full rounded border px-3 py-2 text-sm" style={{ borderColor: 'var(--outline)' }} />
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>{ATTENDANCE_LABELS.deltaHours}</label>
        <input type="number" step="0.5" value={deltaHours} onChange={e => setDeltaHours(e.target.value)} className="mb-3 w-full rounded border px-3 py-2 text-sm" style={{ borderColor: 'var(--outline)' }} />
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>{ATTENDANCE_LABELS.reasonRequired}</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="mb-4 w-full rounded border px-3 py-2 text-sm" style={{ borderColor: 'var(--outline)' }} placeholder={ATTENDANCE_LABELS.adjustmentExample} />
        {error && <p className="mb-4 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2 text-sm" style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}>{ATTENDANCE_LABELS.cancel}</button>
          <button onClick={submit} disabled={submitting} className="rounded px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--primary-dark)' }}>
            {submitting ? 'Đang lưu…' : ATTENDANCE_LABELS.createAdjustment}
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
  const [tab, setTab] = useState<Tab>('workers');

  // Filter & Export state
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Worker Attendance Summary & Detail
  const [summaryRows, setSummaryRows] = useState<WorkerAttendanceSummaryItem[]>([]);
  const [detailRows, setDetailRows] = useState<WorkerAttendanceDetailItem[]>([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [workersError, setWorkersError] = useState('');

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

  const buildExportQuery = (format: 'xlsx' | 'json') => {
    const params = new URLSearchParams();
    if (filterProjectId) params.set('projectId', filterProjectId);
    if (filterMonth && filterYear) {
      params.set('month', filterMonth);
      params.set('year', filterYear);
    }
    if (format === 'json') params.set('format', 'json');
    const qs = params.toString();
    return `/api/attendance/export${qs ? `?${qs}` : ''}`;
  };

  // ── Fetch projects for filter ──────────────────────────────────────────
  useEffect(() => {
    fetch('/api/projects?take=100')
      .then(r => r.json())
      .then(d => {
        const list = d.projects ?? d.rows ?? [];
        if (Array.isArray(list)) {
          setProjects(list.map((p: ProjectOption) => ({ id: p.id, code: p.code, name: p.name })));
        }
      })
      .catch(() => {});
  }, []);

  // ── Fetch worker attendance summary & detail ───────────────────────────
  const loadWorkerAttendance = () => {
    setWorkersLoading(true);
    setWorkersError('');
    fetch(buildExportQuery('json'))
      .then(r => r.json())
      .then(d => {
        setSummaryRows(Array.isArray(d.summaryRows) ? d.summaryRows : []);
        setDetailRows(Array.isArray(d.detailRows) ? d.detailRows : []);
      })
      .catch(() => setWorkersError('Không tải được dữ liệu bảng công NLĐ.'))
      .finally(() => setWorkersLoading(false));
  };

  // ── Fetch batches ──────────────────────────────────────────────────────
  const loadBatches = () => {
    setBatchesLoading(true);
    fetch('/api/attendance/import?take=20')
      .then(r => r.json())
      .then(d => {
        if (d.batches) {
          setBatches(d.batches.map((b: Batch) => ({
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
      .catch(() => setBatchesError(ATTENDANCE_LABELS.loadBatchesFailed))
      .finally(() => setBatchesLoading(false));
  };

  // ── Fetch periods ──────────────────────────────────────────────────────
  const loadPeriods = () => {
    setPeriodsLoading(true);
    fetch('/api/attendance/timesheets?take=20')
      .then(r => r.json())
      .then(d => {
        if (d.periods) {
          setPeriods(d.periods.map((p: Period) => ({
            id: p.id,
            month: p.month,
            year: p.year,
            status: p.status,
            version: p.version,
            lockedAt: p.lockedAt,
          })));
        }
      })
      .catch(() => setPeriodsError(ATTENDANCE_LABELS.loadPeriodsFailed))
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
            setExceptions(preview.batch.unmatchedRows.map((u: UnmatchedRow) => ({
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
      .catch(() => setExceptionsError(ATTENDANCE_LABELS.loadExceptionsFailed))
      .finally(() => setExceptionsLoading(false));
  };

  useEffect(() => {
    if (tab === 'workers') loadWorkerAttendance();
    else if (tab === 'batches') loadBatches();
    else if (tab === 'periods') loadPeriods();
    else if (tab === 'exceptions') loadExceptions();
  }, [tab, filterMonth, filterYear, filterProjectId]);

  const handleResolved = (rowId: string) => {
    setExceptions(prev => prev.filter(r => r.id !== rowId));
  };

  return (
    <div className="px-6 py-8 lg:px-8" style={{ background: 'var(--surface)' }}>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--on-surface)' }}>{ATTENDANCE_LABELS.heading}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            {ATTENDANCE_LABELS.summary}
          </p>
        </div>

        {/* Bộ lọc & Nút Xuất Excel chấm công */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterProjectId}
            onChange={e => setFilterProjectId(e.target.value)}
            aria-label="Lọc theo dự án"
            className="rounded border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--outline)', background: 'var(--surface)', color: 'var(--on-surface)' }}
          >
            <option value="">Tất cả dự án</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>

          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            aria-label="Lọc theo tháng"
            className="rounded border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--outline)', background: 'var(--surface)', color: 'var(--on-surface)' }}
          >
            <option value="">Tất cả các tháng</option>
            {Array.from({ length: 12 }, (_, idx) => idx + 1).map(m => (
              <option key={m} value={String(m)}>Tháng {String(m).padStart(2, '0')}</option>
            ))}
          </select>

          {filterMonth && (
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              aria-label="Lọc theo năm"
              className="rounded border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface)', color: 'var(--on-surface)' }}
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={String(y)}>Năm {y}</option>
              ))}
            </select>
          )}

          <a
            href={buildExportQuery('xlsx')}
            data-testid="attendance-export-excel-btn"
            className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white transition-colors"
            style={{ background: '#197a56' }}
          >
            Xuất Excel chấm công (.xlsx)
          </a>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
        {(['workers', 'batches', 'periods', 'exceptions'] as Tab[]).map(t => (
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
            {t === 'workers'
              ? 'Bảng công NLĐ'
              : t === 'batches'
                ? ATTENDANCE_LABELS.importBatch
                : t === 'periods'
                  ? ATTENDANCE_LABELS.periods
                  : ATTENDANCE_LABELS.exceptions}
          </button>
        ))}
      </div>

      {/* Workers Attendance Summary & Detail Tab */}
      {tab === 'workers' && (
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-medium" style={{ color: 'var(--on-surface)' }}>
                  Tổng hợp công NLĐ theo Dự án & Ca làm việc ({summaryRows.length})
                </h2>
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                  Danh sách toàn bộ NLĐ có phát sinh chấm công (GPS / Máy chấm công / Bảng công), tự động khớp ca làm việc của dự án và quy đổi số công chuẩn.
                </p>
              </div>
              <button
                type="button"
                onClick={loadWorkerAttendance}
                className="rounded border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
              >
                Làm mới dữ liệu
              </button>
            </div>

            {workersLoading ? (
              <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
                <table className="w-full text-sm"><tbody><LoadingRow cols={8} /></tbody></table>
              </div>
            ) : workersError ? (
              <p className="text-sm text-red-500">{workersError}</p>
            ) : summaryRows.length === 0 ? (
              <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--outline-variant)' }}>
                <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                  Chưa có dữ liệu chấm công của NLĐ trong bộ lọc hiện tại.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--surface-container)' }}>
                      <th className="px-3 py-3 text-left font-medium">Mã NLĐ</th>
                      <th className="px-3 py-3 text-left font-medium">Mã NV Dự án</th>
                      <th className="px-3 py-3 text-left font-medium">Họ và tên NLĐ</th>
                      <th className="px-3 py-3 text-left font-medium">SĐT</th>
                      <th className="px-3 py-3 text-left font-medium">Dự án</th>
                      <th className="px-3 py-3 text-left font-medium">Ca làm việc</th>
                      <th className="px-3 py-3 text-right font-medium">Số ngày chấm</th>
                      <th className="px-3 py-3 text-right font-medium">Tổng số công</th>
                      <th className="px-3 py-3 text-right font-medium">Giờ chuẩn</th>
                      <th className="px-3 py-3 text-right font-medium">Giờ OT</th>
                      <th className="px-3 py-3 text-right font-medium">Tổng giờ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map(row => (
                      <tr key={`${row.workerId}-${row.projectId}-${row.shiftCode}`} className="border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                        <td className="px-3 py-2.5 font-mono text-xs font-semibold" style={{ color: 'var(--primary-dark)' }}>{row.workerUserId || '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{row.employeeCode || '—'}</td>
                        <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--on-surface)' }}>{row.workerName}</td>
                        <td className="px-3 py-2.5 text-xs">{row.workerPhone || '—'}</td>
                        <td className="px-3 py-2.5 text-xs">
                          <span className="font-semibold">{row.projectCode}</span>
                          {row.projectName ? ` — ${row.projectName}` : ''}
                        </td>
                        <td className="px-3 py-2.5 text-xs">{row.shiftName}</td>
                        <td className="px-3 py-2.5 text-right">{row.totalDays}</td>
                        <td className="px-3 py-2.5 text-right font-semibold" style={{ color: 'var(--success)' }}>{row.totalWorkdays} công</td>
                        <td className="px-3 py-2.5 text-right">{row.totalRegularHours}h</td>
                        <td className="px-3 py-2.5 text-right">{row.totalOtHours}h</td>
                        <td className="px-3 py-2.5 text-right font-medium">{row.totalHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {detailRows.length > 0 && (
            <div>
              <h3 className="mb-3 text-base font-medium" style={{ color: 'var(--on-surface)' }}>
                Chi tiết chấm công từng ngày ({detailRows.length} bản ghi)
              </h3>
              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--surface-container)' }}>
                      <th className="px-3 py-2.5 text-left font-medium">Ngày</th>
                      <th className="px-3 py-2.5 text-left font-medium">Mã NLĐ</th>
                      <th className="px-3 py-2.5 text-left font-medium">Họ và tên NLĐ</th>
                      <th className="px-3 py-2.5 text-left font-medium">Dự án</th>
                      <th className="px-3 py-2.5 text-left font-medium">Ca làm việc</th>
                      <th className="px-3 py-2.5 text-left font-medium">Giờ vào</th>
                      <th className="px-3 py-2.5 text-left font-medium">Giờ ra</th>
                      <th className="px-3 py-2.5 text-right font-medium">Số công</th>
                      <th className="px-3 py-2.5 text-right font-medium">Giờ chuẩn</th>
                      <th className="px-3 py-2.5 text-right font-medium">Giờ OT</th>
                      <th className="px-3 py-2.5 text-left font-medium">Nguồn</th>
                      <th className="px-3 py-2.5 text-left font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.slice(0, 100).map(d => (
                      <tr key={`${d.workerId}-${d.workDate}-${d.stt}`} className="border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                        <td className="px-3 py-2 font-mono text-xs">{d.workDate}</td>
                        <td className="px-3 py-2 font-mono text-xs">{d.workerUserId || d.employeeCode || '—'}</td>
                        <td className="px-3 py-2 font-medium">{d.workerName}</td>
                        <td className="px-3 py-2 text-xs">{d.projectCode ? `${d.projectCode} — ${d.projectName}` : d.projectName}</td>
                        <td className="px-3 py-2 text-xs">{d.shiftName}</td>
                        <td className="px-3 py-2 font-mono text-xs">{d.checkInTime || '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{d.checkOutTime || '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--success)' }}>{d.workdays}</td>
                        <td className="px-3 py-2 text-right">{d.regularHours}h</td>
                        <td className="px-3 py-2 text-right">{d.otHours}h</td>
                        <td className="px-3 py-2 text-xs">{d.source}</td>
                        <td className="px-3 py-2 text-xs">{d.statusNote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batches Tab */}
      {tab === 'batches' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium" style={{ color: 'var(--on-surface)' }}>{ATTENDANCE_LABELS.importBatch}</h2>
            <button onClick={() => setShowUploadModal(true)} className="rounded px-4 py-2 text-sm font-medium transition-colors" style={{ background: 'var(--primary-dark)', color: '#fff' }}>
              {ATTENDANCE_LABELS.uploadCsv}
            </button>
          </div>
          {batchesLoading ? (
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
              <table className="w-full text-sm">
                <thead><tr style={{ background: 'var(--surface-container)' }}>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.source}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.rows}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.matched}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.unmatched}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.anomaly}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.status}</th>
                </tr></thead>
                <tbody><LoadingRow cols={6} /></tbody>
              </table>
            </div>
          ) : batchesError ? (
            <p className="text-sm text-red-500">{batchesError}</p>
          ) : batches.length === 0 ? (
            <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--outline-variant)' }}>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>{ATTENDANCE_LABELS.batchEmpty}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
              <table className="w-full text-sm">
                <thead><tr style={{ background: 'var(--surface-container)' }}>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.source}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.rows}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.matched}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.unmatched}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.anomaly}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.status}</th>
                </tr></thead>
                <tbody>
                  {batches.map(b => (
                    <tr key={b.id} className="border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                      <td className="px-4 py-3">{attendanceSourceLabel(b.source)}</td>
                      <td className="px-4 py-3">{b.totalRows.toLocaleString()}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--success)' }}>{b.matchedRows.toLocaleString()}</td>
                      <td className="px-4 py-3" style={{ color: b.unmatchedRows > 0 ? 'var(--warning)' : 'var(--on-surface)' }}>
                        {b.unmatchedRows}<AnomalyBadge count={b.unmatchedRows} />
                      </td>
                      <td className="px-4 py-3" style={{ color: b.anomalyRows > 0 ? 'var(--warning)' : 'var(--on-surface)' }}>{b.anomalyRows}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} label={attendanceBatchStatusLabel(b.status)} /></td>
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
            <h2 className="text-lg font-medium" style={{ color: 'var(--on-surface)' }}>{ATTENDANCE_LABELS.periods}</h2>
          </div>
          {periodsLoading ? (
            <div className="space-y-3">{[1, 2].map(i => <LoadingRow key={i} cols={4} />)}</div>
          ) : periodsError ? (
            <p className="text-sm text-red-500">{periodsError}</p>
          ) : periods.length === 0 ? (
            <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--outline-variant)' }}>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>{ATTENDANCE_LABELS.periodEmpty}</p>
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
                      <StatusBadge status={p.status} label={attendancePeriodStatusLabel(p.status)} />
                      <a
                        href={`/api/attendance/export?periodId=${encodeURIComponent(p.id)}`}
                        className="rounded border px-3 py-1 text-xs font-medium"
                        style={{ borderColor: '#197a56', color: '#197a56' }}
                      >
                        Xuất Excel
                      </a>
                      {p.status !== 'LOCKED' && (
                        <button onClick={() => setShowAdjustmentDrawer(p)} className="rounded border px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--primary-dark)', color: 'var(--primary-dark)' }}>{ATTENDANCE_LABELS.addAdjustment}</button>
                      )}
                      {p.status === 'REVIEWED' && (
                        <button className="rounded border px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>{ATTENDANCE_LABELS.approve}</button>
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
            <h2 className="text-lg font-medium" style={{ color: 'var(--on-surface)' }}>{ATTENDANCE_LABELS.exceptions}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{ATTENDANCE_LABELS.exceptionSummary}</p>
          </div>
          <div className="mb-4 flex gap-3">
            {(['ALL', 'KT', 'HR', 'PM'] as const).map(owner => (
              <button key={owner} className="rounded border px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--outline)', color: owner === 'ALL' ? 'var(--primary-dark)' : 'var(--on-surface-variant)', background: 'transparent' }}>
                {attendanceOwnerLabel(owner)}
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
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>{ATTENDANCE_LABELS.exceptionEmpty}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
              <table className="w-full text-sm">
                <thead><tr style={{ background: 'var(--surface-container)' }}>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.id}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.employeeCode}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.date}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.time}</th>
                  <th className="px-4 py-3 text-left font-medium">{ATTENDANCE_LABELS.action}</th>
                </tr></thead>
                <tbody>
                  {exceptions.map(row => (
                    <tr key={row.id} className="border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                      <td className="px-4 py-3">{row.id}</td>
                      <td className="px-4 py-3">{row.rawEmployeeCode}</td>
                      <td className="px-4 py-3">{row.rawDate}</td>
                      <td className="px-4 py-3">{row.rawTime}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setShowResolveDrawer(row)} className="rounded border px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--primary-dark)', color: 'var(--primary-dark)' }}>{ATTENDANCE_LABELS.resolve}</button>
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
            <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>{ATTENDANCE_LABELS.uploadTitle}</h3>
            <p className="text-sm text-gray-500 mb-4">{ATTENDANCE_LABELS.uploadDescription}</p>
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
