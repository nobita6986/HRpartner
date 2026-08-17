/**
 * /admin/attendance — Chấm công (S03 narrative F00A 06:20–08:30).
 *
 * Phase 4 slice 4B — chưa thi công trong round 2.
 * Skeleton khai báo route để nav không 404.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AttendancePage() {
  return (
    <div className="px-6 py-8 lg:px-8" style={{ background: 'var(--surface)' }}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--on-surface)' }}>
          Chấm công
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Module M7 — slice 4B (moment 06:20–08:30). Import → 6 lỗi taxonomy → Lock.
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
          UI skeleton. Slice 4B sẽ thi công trong round riêng (sau khi 4A ACCEPTED).
          STEP-08..12 cần: import.service, import-commit.service, timesheet.service, 2 routes + UI.
        </p>
      </div>
    </div>
  );
}
