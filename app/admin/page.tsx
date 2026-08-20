/**
 * /admin — Control Tower (S01 narrative F00A 00:00).
 *
 * Phase 4 slice 4A STEP-01: tổng quan 4 slice (Staffing / Chấm công / Đối soát / Job Board).
 * UI skeleton (DEC-17) — không poll số liệu, render placeholder + 4 nhóm card.
 *
 * Server Component: chỉ render shell, không cần DB query round 1.
 *
 * Round 2 sẽ thêm:
 * - Live counters (open orders, pending attendance batches, statements draft, ...)
 * - Quick-nav theo role (HR_STAFF thấy Staffing + Attendance; PM thấy Staffing + Reconciliation của project mình)
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SLICE_CARDS = [
  {
    id: 'staffing',
    label: 'Staffing',
    module: 'M3',
    narrative: 'S01 → S02 → S02A → S02B',
    moment: '02:10–03:10',
    href: '/admin/staffing',
    description: 'Tạo Staffing Order → Guided Transfer → Referral Guard. 1-ACTIVE bất biến, quota 2 project atomic.',
  },
  {
    id: 'attendance',
    label: 'Chấm công',
    module: 'M7',
    narrative: 'S03 → S03A → S03B',
    moment: '06:20–08:30',
    href: '/admin/attendance',
    description: 'Import chấm công → 6 lỗi taxonomy → maker-checker → Lock. 3 blockers chặn COMMIT.',
  },
  {
    id: 'reconciliation',
    label: 'Đối soát',
    module: 'M4',
    narrative: 'S04 → S04A → S04B',
    moment: '09:30–13:00',
    href: '/admin/reconciliation',
    description: 'Vendor payable + Client receivable + Margin. Dispute ≤ 2 vòng, SLA 3 ngày, FORCE LOCK.',
  },
  {
    id: 'jobs',
    label: 'Job Board',
    module: 'M2',
    narrative: 'S05',
    moment: 'Polish',
    href: '/admin/jobs',
    description: 'Worker nộp đơn từ link public. SourceClaim accepted duy nhất 1/worker.',
  },
  {
    id: 'projects',
    label: 'Dự án',
    module: 'M5',
    narrative: 'Master Data',
    moment: 'RQ-02',
    href: '/admin/projects',
    description: 'Quản lý danh sách dự án — xem, lọc theo trạng thái.',
  },
  {
    id: 'workers',
    label: 'Nhân viên',
    module: 'M5',
    narrative: 'Master Data',
    moment: 'RQ-02',
    href: '/admin/workers',
    description: 'Quản lý danh sách nhân viên — xem, lọc theo trạng thái.',
  },
  {
    id: 'clients',
    label: 'Khách hàng',
    module: 'M5',
    narrative: 'Master Data',
    moment: 'RQ-02',
    href: '/admin/clients',
    description: 'Quản lý danh sách khách hàng — xem, tìm kiếm.',
  },
] as const;

export default function AdminControlTowerPage() {
  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10" style={{ background: 'var(--surface)' }}>
      <header className="mb-8">
        <h1
          className="text-3xl font-semibold"
          style={{ color: 'var(--on-surface)' }}
        >
          Control Tower
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Phase 4 slice 4A–4D — 4 nhóm nghiệp vụ chính. UI skeleton (DEC-17),
          số liệu thật sẽ gắn ở sub-round tiếp.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SLICE_CARDS.map((card) => (
          <a
            key={card.id}
            href={card.href}
            className="block rounded-lg border p-5 transition-shadow hover:shadow-md"
            style={{
              background: 'var(--surface-container-lowest)',
              borderColor: 'var(--outline-variant)',
            }}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-base font-semibold" style={{ color: 'var(--on-surface)' }}>
                {card.label}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: 'var(--primary-container)',
                  color: 'var(--on-primary-container)',
                }}
              >
                {card.module}
              </span>
            </div>
            <div className="mt-2 text-xs font-mono" style={{ color: 'var(--on-surface-variant)' }}>
              {card.narrative}
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--outline)' }}>
              Moment {card.moment}
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
              {card.description}
            </p>
          </a>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>
          Tiến độ Round 2 / Phase 4
        </h2>
        <ul className="mt-3 space-y-2 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          <li>
            <span className="font-semibold" style={{ color: 'var(--primary)' }}>✓ STEP-21:</span>{' '}
            RLS staffing_order_slots — AC-17 7/7 PASS (round 1).
          </li>
          <li>
            <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>→ STEP-01:</span>{' '}
            Admin layout + nav + Control Tower (round 2 đang thi công).
          </li>
          <li>
            <span className="font-semibold" style={{ color: 'var(--outline)' }}>· STEP-02..07:</span>{' '}
            services + routes + UI + E2E (sub-round 2a, 2b, 2c — theo budget Tier 1).
          </li>
        </ul>
      </section>
    </div>
  );
}
