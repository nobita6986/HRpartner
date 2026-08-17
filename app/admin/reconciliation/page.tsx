/**
 * /admin/reconciliation — Đối soát (S04 narrative F00A 09:30–13:00).
 *
 * Phase 4 slice 4C — chưa thi công trong round 2.
 * Skeleton khai báo route để nav không 404.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function ReconciliationPage() {
  return (
    <div className="px-6 py-8 lg:px-8" style={{ background: 'var(--surface)' }}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--on-surface)' }}>
          Đối soát
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Module M4 — slice 4C (moment 09:30–13:00). Vendor payable + Client receivable + Margin.
        </p>
      </header>

      <div
        className="rounded-lg border p-8 text-center"
        style={{
          background: 'var(--surface-container-lowest)',
          borderColor: 'var(--outline-variant)',
          color: 'var(--on-surface-variant)',
        }}
      >
        <p className="text-sm">
          UI skeleton. Slice 4C sẽ thi công trong round riêng (sau 4A + 4B ACCEPTED).
          STEP-13..17 cần: statement.service, margin.service, dispute.service, 4 routes + UI.
        </p>
      </div>
    </div>
  );
}
