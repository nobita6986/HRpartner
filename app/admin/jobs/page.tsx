/**
 * /admin/jobs — Job Board admin (S05 narrative F00A — polish).
 *
 * Phase 4 slice 4D — chưa thi công trong round 2.
 * Skeleton khai báo route để nav không 404.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function JobsPage() {
  return (
    <div className="px-6 py-8 lg:px-8" style={{ background: 'var(--surface)' }}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--on-surface)' }}>
          Job Board
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Module M2 — slice 4D (polish Phase 0 → S05). Apply public + SourceClaim accepted unique.
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
          UI skeleton. Slice 4D sẽ thi công trong round riêng (cuối cùng — sau 4A + 4B + 4C ACCEPTED).
          STEP-18..19 cần: submission.service, public route + admin job board UI.
        </p>
      </div>
    </div>
  );
}
