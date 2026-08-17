/**
 * /admin/attendance — Chấm công (S03 narrative F00A bước 6-10, moment 06:20–08:30).
 *
 * Phase 4 slice 4B STEP-11.
 *
 * F00A bước 6-10:
 *   6. (05:40) Click badge "7 ngoại lệ công" → Exception Workbench
 *   7. (06:20) Click exception → Resolve drawer (map AP-QM-1048 → Mai)
 *   8. (07:30) Duyệt kỳ → readiness bar "Sẵn sàng khóa"
 *   9. (08:30) Khóa kỳ → confirmation → tạo đối soát
 *
 * UI components:
 *   - Import batch list (upload CSV)
 *   - Exception table với filter
 *   - Resolve drawer (map unmatched → worker)
 *   - Timesheet period với status badge
 *   - Lock button (maker-checker)
 */

'use client';

import { useState } from 'react';

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

const MOCK_BATCHES: Batch[] = [
  {
    id: 'batch-001',
    source: 'CSV',
    totalRows: 1222,
    matchedRows: 1215,
    unmatchedRows: 3,
    anomalyRows: 4,
    status: 'PREVIEWED',
    startedAt: '2026-08-16T08:00:00Z',
  },
];

const MOCK_PERIODS: Period[] = [
  {
    id: 'period-001',
    month: 8,
    year: 2026,
    status: 'REVIEWED',
    version: 1,
    lockedAt: null,
  },
];

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

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>('batches');
  const [batches] = useState<Batch[]>(MOCK_BATCHES);
  const [periods] = useState<Period[]>(MOCK_PERIODS);
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <div className="px-6 py-8 lg:px-8" style={{ background: 'var(--surface)' }}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--on-surface)' }}>
          Chấm công
        </h1>
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
            <h2 className="text-lg font-medium" style={{ color: 'var(--on-surface)' }}>
              Import batch
            </h2>
            <button
              onClick={() => setShowUploadModal(true)}
              className="rounded px-4 py-2 text-sm font-medium transition-colors"
              style={{ background: 'var(--primary-dark)', color: '#fff' }}
            >
              + Upload CSV
            </button>
          </div>

          {batches.length === 0 ? (
            <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--outline-variant)' }}>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Chưa có batch nào. Upload file CSV/XLSX để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface-container)' }}>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--on-surface)' }}>Source</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--on-surface)' }}>Rows</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--on-surface)' }}>Matched</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--on-surface)' }}>Unmatched</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--on-surface)' }}>Anomaly</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--on-surface)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(b => (
                    <tr key={b.id} className="border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                      <td className="px-4 py-3">{b.source}</td>
                      <td className="px-4 py-3">{b.totalRows.toLocaleString()}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--success)' }}>{b.matchedRows.toLocaleString()}</td>
                      <td className="px-4 py-3" style={{ color: b.unmatchedRows > 0 ? 'var(--warning)' : 'var(--on-surface)' }}>
                        {b.unmatchedRows}
                        <AnomalyBadge count={b.unmatchedRows} />
                      </td>
                      <td className="px-4 py-3" style={{ color: b.anomalyRows > 0 ? 'var(--warning)' : 'var(--on-surface)' }}>
                        {b.anomalyRows}
                      </td>
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
            <h2 className="text-lg font-medium" style={{ color: 'var(--on-surface)' }}>
              Kỳ công
            </h2>
          </div>

          {periods.length === 0 ? (
            <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--outline-variant)' }}>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Chưa có kỳ công nào.
              </p>
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
                      <span className="ml-2 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                        v{p.version}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={p.status} />
                      {p.status !== 'LOCKED' && (
                        <div className="flex gap-2">
                          {p.status === 'PENDING' && (
                            <button
                              className="rounded border px-3 py-1 text-xs font-medium transition-colors"
                              style={{ borderColor: 'var(--primary-dark)', color: 'var(--primary-dark)' }}
                            >
                              Review
                            </button>
                          )}
                          {p.status === 'REVIEWED' && (
                            <button
                              className="rounded border px-3 py-1 text-xs font-medium transition-colors"
                              style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
                            >
                              Approve
                            </button>
                          )}
                          {p.status === 'APPROVED' && (
                            <button
                              className="rounded px-3 py-1 text-xs font-semibold text-white transition-colors"
                              style={{ background: 'var(--primary-dark)' }}
                            >
                              Khóa kỳ
                            </button>
                          )}
                        </div>
                      )}
                      {p.status === 'LOCKED' && (
                        <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                          Đã khóa {p.lockedAt ? new Date(p.lockedAt).toLocaleDateString('vi-VN') : ''}
                        </span>
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
            <h2 className="text-lg font-medium" style={{ color: 'var(--on-surface)' }}>
              Ngoại lệ công
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Taxonomy G29: 3 loại lỗi → 3 chủ xử lý (KT / HR / PM)
            </p>
          </div>

          <div className="mb-4 flex gap-3">
            {(['ALL', 'KT', 'HR', 'PM'] as const).map(owner => (
              <button
                key={owner}
                className="rounded border px-3 py-1 text-xs font-medium"
                style={{
                  borderColor: 'var(--outline)',
                  color: owner === 'ALL' ? 'var(--primary-dark)' : 'var(--on-surface-variant)',
                  background: 'transparent',
                }}
              >
                {owner === 'ALL' ? 'Tất cả' : owner}
              </button>
            ))}
          </div>

          <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--outline-variant)' }}>
            <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Exception Workbench — cần commit batch trước để hiển thị exception rows.
            </p>
          </div>
        </div>
      )}

      {/* Upload Modal Placeholder */}
      {showUploadModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl p-6 shadow-xl"
            style={{ background: 'var(--surface)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>
              Upload file chấm công
            </h3>
            <div
              className="mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer"
              style={{ borderColor: 'var(--outline-variant)' }}
            >
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Kéo thả file CSV/XLSX vào đây hoặc click để chọn
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                Tối đa 4.5MB
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded border px-4 py-2 text-sm"
                style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
              >
                Hủy
              </button>
              <button
                className="rounded px-4 py-2 text-sm font-medium text-white"
                style={{ background: 'var(--primary-dark)' }}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
