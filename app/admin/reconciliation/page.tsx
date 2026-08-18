/**
 * /admin/reconciliation -- Reconciliation (S04 narrative F00A buoc 11-16, moment 09:30-13:00).
 *
 * Phase 5 UAT/Cutover STEP-01 (RQ-02): wire from API (no more MOCK_STATEMENTS).
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

import { useState, useEffect } from 'react';

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
  sentAt: string | null;
}

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

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        </td>
      ))}
    </tr>
  );
}

export default function ReconciliationPage() {
  const [tab, setTab] = useState<Tab>('list');
  const [statements, setStatements] = useState<Statement[]>([]);
  const [statementsLoading, setStatementsLoading] = useState(false);
  const [statementsError, setStatementsError] = useState('');
  const [month, setMonth] = useState(8);
  const [year, setYear] = useState(2026);
  const [margin, setMargin] = useState<{ margin: string; totalClient: string; totalVendor: string } | null>(null);
  const [marginLoading, setMarginLoading] = useState(false);
  const [showDispute, setShowDispute] = useState<Statement | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);

  // ── Fetch statements list ──────────────────────────────────────────────
  const loadStatements = () => {
    setStatementsLoading(true);
    fetch('/api/statements?take=50')
      .then((r) => r.json())
      .then((d) => {
        if (d.statements) setStatements(d.statements);
        else setStatementsError('Khong the tai danh sach');
      })
      .catch((e) => setStatementsError(String(e)))
      .finally(() => setStatementsLoading(false));
  };

  useEffect(() => {
    if (tab === 'list') loadStatements();
  }, [tab]);

  const loadMargin = () => {
    setMarginLoading(true);
    fetch(`/api/statements/margin?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((d) => { if (d.margin) setMargin(d.margin); })
      .catch(() => {})
      .finally(() => setMarginLoading(false));
  };

  const handleGenerate = async () => {
    // Prompt for period ID — simplified
    const periodId = window.prompt('Nhap TimesheetPeriod ID (tu tab Chấm công):');
    if (!periodId) return;
    setGenerateLoading(true);
    try {
      const res = await fetch('/api/statements/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ timesheetPeriodId: periodId }),
      });
      const d = await res.json();
      if (!res.ok) alert(`Loi: ${d.message ?? d.error}`);
      else {
        alert('Da tao statement thanh cong');
        loadStatements();
        setTab('list');
      }
    } catch {
      alert('Loi mang');
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <div className="px-6 py-8 lg:px-8" style={{ background: 'var(--surface)' }}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--on-surface)' }}>
          Doi soat (Reconciliation)
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Module M4 + M8 -- slice 4C · F00A moment 09:30-13:00 · Statement 2 luong + Margin + Dispute
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
            <button
              onClick={() => setTab('generate')}
              className="rounded px-4 py-2 text-sm font-medium text-white"
              style={{ background: 'var(--primary-dark)' }}
            >
              + Generate tu Timesheet
            </button>
          </div>
          {statementsLoading ? (
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
                <tbody><LoadingRow cols={8} /></tbody>
              </table>
            </div>
          ) : statementsError ? (
            <p className="text-sm text-red-500">{statementsError}</p>
          ) : statements.length === 0 ? (
            <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--outline-variant)' }}>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Chua co statement nao. Generate tu tab Generate.</p>
            </div>
          ) : (
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
                        {s.status === 'SENT' && (
                          <button
                            onClick={() => setShowDispute(s)}
                            className="text-xs underline"
                            style={{ color: 'var(--primary-dark)' }}
                          >
                            Dispute
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Generate Tab */}
      {tab === 'generate' && (
        <div>
          <h2 className="mb-4 text-lg font-medium">Generate tu Timesheet LOCKED</h2>
          <div className="rounded-lg border p-6" style={{ borderColor: 'var(--outline-variant)' }}>
            <p className="mb-4 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Tao VendorStatement + ClientStatement tu TimesheetPeriod da LOCKED.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generateLoading}
              className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--primary-dark)' }}
            >
              {generateLoading ? 'Dang generate...' : 'Generate Vendor + Client'}
            </button>
          </div>
        </div>
      )}

      {/* Margin Tab */}
      {tab === 'margin' && (
        <div>
          <h2 className="mb-4 text-lg font-medium">Margin Breakdown</h2>
          <div className="mb-4 flex gap-3">
            <input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="w-20 rounded border px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-24 rounded border px-3 py-2 text-sm"
            />
            <button
              onClick={loadMargin}
              disabled={marginLoading}
              className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--primary-dark)' }}
            >
              {marginLoading ? 'Dang tai...' : 'Xem margin'}
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
                  <p className="text-2xl font-semibold" style={{ color: 'var(--success)' }}>
                    {Number(margin.totalClient).toLocaleString('vi-VN')}
                  </p>
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
