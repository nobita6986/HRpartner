/**
 * /admin/staffing — Staffing Order list (S02 narrative F00A 01:00–02:10).
 *
 * Phase 4 slice 4A STEP-01: UI skeleton (DEC-17). Round 2 sẽ thêm:
 * - List query qua staffing/order.service (STEP-02)
 * - "Tạo Order" button → form
 * - Filter theo status (OPEN / CLOSING_SOON / CLOSED / CANCELLED)
 * - Click vào order → /admin/staffing/[id] (S02A Guided Transfer)
 *
 * Slice 4A moment 02:10–03:10 (Guided Transfer + Referral Guard).
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function StaffingPage() {
  return (
    <div className="px-6 py-8 lg:px-8" style={{ background: 'var(--surface)' }}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--on-surface)' }}>
          Staffing Orders
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Module M3 — slice 4A (moment 02:10–03:10). Hiển thị các đơn tuyển theo dự án.
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
          UI skeleton round 1. Sub-round 2a sẽ thêm list query qua{' '}
          <code className="rounded px-1 py-0.5 font-mono text-xs" style={{ background: 'var(--surface-container)' }}>
            src/domains/staffing/order.service.ts
          </code>{' '}
          (STEP-02).
        </p>
      </div>
    </div>
  );
}
