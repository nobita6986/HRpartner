/**
 * /admin/reconciliation -- Reconciliation (S04 narrative F00A buoc 11-16, moment 09:30-13:00).
 *
 * Phase 4 slice 4C STEP-16.
 *
 * F00A buoc 11-16:
 *   11. (09:30) Tab Doi soat -> generate Vendor + Client statement
 *   12. (10:30) Margin breakdown (admin/accountant)
 *   13. (11:30) Vendor xem statement (preview, an margin)
 *   14. (12:30) Dispute form reason + attachment
 *   15. (12:50) Cron SLA 3 ngay -> AUTO-CONFIRMED (fake timer)
 *   16. (13:00) FORCE LOCK (admin only)
 */

'use client';

import { useState } from 'react';

type Tab = 'list' | 'generate' | 'margin';
type StatementStatus = 'DRAFT' | 'SENT' | 'DISPUTED' | 'CONFIRMED' | 'LOCKED' | 'PAID';
type StatementKind = 'VENDOR' | 'CLIENT';

interface Statement {
  id: string;
  kind: StatementKind;
  partyId: string;
  partyName: string;
  periodMonth: number;
  periodYear: number;
  totalAmount: string;
  status: StatementStatus;
  version: number;
  disputeCount: number;
  confirmDeadlineAt: string | null;
}

const MOCK_STATEMENTS: Statement[] = [
  { id: 'vs-001', kind: 'VENDOR', partyId: 'vendor-001', partyName: 'CTY TNHH ABC', periodMonth: 8, periodYear: 2026, totalAmount: '15000000', status: 'DRAFT', version: 1, disputeCount: 0, confirmDeadlineAt: null },
  { id: 'cs-001', kind: 'CLIENT', partyId: 'client-001', partyName: 'An Phat Group', periodMonth: 8, periodYear: 2026, totalAmount: '20000000', status: 'SENT', version: 1, disputeCount: 0, confirmDeadlineAt: '2026-08-21T08:00:00Z' },
];

function StatusBadge({ status }: { status: StatementStatus }) {
  const colors: Record<string, string> = {
    DRAFT: '#9e9e9e',
    SENT: '#2196f3',
    DISPUTED: '#ff9800',
    CONFIRMED: '#4caf50',
    LOCKED: '#1e88e5',
    PAID: '#000',
  };
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium" style={{ background: colors[status] + '20', color: colors[status] }}>
      {status}
    </span>
  );
}

export default function ReconciliationPage() {
  const [tab, setTab] = useState<Tab>('list');
  const [statements] = useState<Statement[]>(MOCK_STATEMENTS);
  const [month, setMonth] = useState(8);
  const [year, setYear] = useState(2026);
  const [margin, setMargin] = useState<{ margin: string; totalClient: string; totalVendor: string } | null>(null);
  const [showDispute, setShowDispute] = useState<Statement | null>(null);

  const loadMargin = async () => {
    const res = await fetch(`/api/statements/margin?month=${month}&year=${year}`);
    if (res.ok) {
      const j = await res.json();
      setMargin(j.margin);
    }
  };

  return (
    <div className="px-6 py-8 lg:px-8" style={{ background: 'var(--surface)' }}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--on-surface)' }}>
          Doi soat (Reconciliation)
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Module M4 + M8 -- slice 4C * F00A moment 09:30-13:00 * Statement 2 luong + Margin + Dispute
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
        {(['list', 'generate', 'margin'] as Tab[]).map(t => (
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
            {t === 'list' ? 'Statements' : t === 'generate' ? 'Generate' : 'Margin'}
          </button>
        ))}
      </div>

      {/* List Tab */}
      {tab === 'list' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium" style={{ color: 'var(--on-surface)' }}>Statements</h2>
            <button className="rounded px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--primary-dark)' }}>
              + Generate tu Timesheet
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-container)' }}>
                  <th className="px-4 py-3 text-left font-medium">Kind</th>
                  <th className="px-4 py-3 text-left font-medium">Party</th>
                  <th className="px-4 py-3 text-left font-medium">Period</th>
                  <th className="px-4 py-3 text-right font-medium">Amount (VND)</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Dispute</th>
                  <th className="px-4 py-3 text-left font-medium">SLA Deadline</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {statements.map(s => (
                  <tr key={s.id} className="border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                    <td className="px-4 py-3">{s.kind}</td>
                    <td className="px-4 py-3">{s.partyName}</td>
                    <td className="px-4 py-3">{String(s.periodMonth).padStart(2, '0')}/{s.periodYear}</td>
                    <td className="px-4 py-3 text-right">{Number(s.totalAmount).toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3">{s.disputeCount}</td>
                    <td className="px-4 py-3 text-xs">{s.confirmDeadlineAt ? new Date(s.confirmDeadlineAt).toLocaleDateString('vi-VN') : '-'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setShowDispute(s)} className="text-xs underline" style={{ color: 'var(--primary-dark)' }}>
                        Dispute
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Tab */}
      {tab === 'generate' && (
        <div>
          <h2 className="mb-4 text-lg font-medium">Generate tu Timesheet LOCKED</h2>
          <div className="rounded-lg border p-6" style={{ borderColor: 'var(--outline-variant)' }}>
            <p className="mb-4 text-sm">POST /api/statements/generate with body {`{ timesheetPeriodId }`}</p>
            <button className="rounded px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--primary-dark)' }}>
              Generate Vendor + Client
            </button>
          </div>
        </div>
      )}

      {/* Margin Tab */}
      {tab === 'margin' && (
        <div>
          <h2 className="mb-4 text-lg font-medium">Margin Breakdown</h2>
          <div className="mb-4 flex gap-3">
            <input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} className="w-20 rounded border px-3 py-2 text-sm" />
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-24 rounded border px-3 py-2 text-sm" />
            <button onClick={loadMargin} className="rounded px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--primary-dark)' }}>
              Xem margin
            </button>
          </div>
          {margin && (
            <div className="rounded-lg border p-6" style={{ borderColor: 'var(--outline-variant)' }}>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs">Vendor payable</p>
                  <p className="text-2xl font-semibold">{Number(margin.totalVendor).toLocaleString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-xs">Client receivable</p>
                  <p className="text-2xl font-semibold" style={{ color: 'var(--success)' }}>{Number(margin.totalClient).toLocaleString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-xs">Margin</p>
                  <p className="text-2xl font-semibold" style={{ color: Number(margin.margin) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                    {Number(margin.margin).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dispute Drawer */}
      {showDispute && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowDispute(null)}>
          <div className="h-full w-full max-w-md p-6 shadow-xl" style={{ background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold">Dispute Statement {showDispute.id}</h3>
            <p className="mb-2 text-sm">Party: {showDispute.partyName}</p>
            <p className="mb-4 text-xs">Dispute count hien tai: {showDispute.disputeCount}/2</p>
            <label className="mb-2 block text-sm font-medium">Ly do (required)</label>
            <textarea rows={3} className="mb-4 w-full rounded border px-3 py-2 text-sm" placeholder="Vi du: So gio khong khop voi check-in thuc te" />
            <label className="mb-2 block text-sm font-medium">Attachment URL (optional)</label>
            <input type="text" className="mb-4 w-full rounded border px-3 py-2 text-sm" placeholder="https://..." />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDispute(null)} className="rounded border px-4 py-2 text-sm">Huy</button>
              <button className="rounded px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--primary-dark)' }}>
                Submit dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}