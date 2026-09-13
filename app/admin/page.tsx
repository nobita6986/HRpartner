/**
 * /admin — trang tổng quan của portal điều hành.
 *
 * Server Component (force-dynamic) — đọc 3 KPI cards số liệu thật + giữ
 * nguyên section cards điều hướng các nghiệp vụ. KPI cards được render
 * phía trên SECTION_CARDS để Admin/Sale mở portal thấy ngay tình hình.
 *
 * RLS Phase 2 (DEC-02 + data-scope-security §6.2):
 *  - 3 bảng JobOpening/CandidateSubmission/Ticket đều có FORCE ROW LEVEL
 *    SECURITY. Mỗi query đã được wrap trong `withDbContext(prisma, ctx, ...)`
 *    để `applyRlsContext` set GUC transaction-local — RLS policy tự filter
 *    theo role + ownership.
 *
 * Vòng đầu (v1.0) chỉ 3 KPI:
 *  - KPI-1: JobOpening.status = OPEN
 *  - KPI-2: CandidateSubmission.status = NEW
 *  - KPI-3: Ticket.status = PENDING
 * Mỗi KPI có ma trận quyền riêng (xem service `overview-metrics.service.ts`).
 * KPI không có quyền → ẩn href + hiển thị "Không có quyền xem".
 * Số liệu bị RLS giới hạn (PM) ghi "trong phạm vi của bạn", không gọi là tổng.
 *
 * Vòng đầu KHÔNG có cache chung giữa user/role (force-dynamic).
 *
 * Auth: chỉ role thuộc ADMIN_PORTAL_ROLES (xem `server-session.ts`) được vào.
 * Role ngoài (WORKER, VENDOR, CTV) redirect về portal tương ứng.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { loadOverviewMetrics, type KpiEntry } from '@/src/domains/admin/overview-metrics.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SECTION_CARDS = [
  {
    id: 'staffing',
    label: 'Đơn tuyển dụng',
    group: 'Điều hành',
    href: '/admin/staffing',
    description:
      'Tạo đơn tuyển dụng cho dự án, khai vị trí cần người và điều phối nhân sự giữa các dự án.',
  },
  {
    id: 'attendance',
    label: 'Chấm công',
    group: 'Điều hành',
    href: '/admin/attendance',
    description: 'Nhập bảng chấm công, soát lỗi giờ công và chốt kỳ công theo dự án.',
  },
  {
    id: 'reconciliation',
    label: 'Đối soát',
    group: 'Tài chính',
    href: '/admin/reconciliation',
    description:
      'Đối soát công nợ với nhà cung ứng và khách hàng, theo dõi chênh lệch của từng dự án.',
  },
  {
    id: 'jobs',
    label: 'Tin tuyển dụng',
    group: 'Điều hành',
    href: '/admin/jobs',
    description:
      'Đăng tin tuyển dụng lên trang công khai, tắt tin khi tuyển đủ và xem hồ sơ ứng viên gửi về.',
  },
  {
    id: 'projects',
    label: 'Dự án',
    group: 'Dữ liệu nền',
    href: '/admin/projects',
    description: 'Danh sách dự án: mã, khách hàng, địa điểm làm việc và chỉ tiêu nhân sự.',
  },
  {
    id: 'workers',
    label: 'Nhân viên',
    group: 'Dữ liệu nền',
    href: '/admin/workers',
    description: 'Danh sách nhân viên đang làm việc, lọc theo trạng thái hồ sơ.',
  },
  {
    id: 'clients',
    label: 'Khách hàng',
    group: 'Dữ liệu nền',
    href: '/admin/clients',
    description: 'Danh sách công ty khách hàng và thông tin liên hệ.',
  },
  {
    id: 'payroll',
    label: 'Cấu hình lương',
    group: 'Tài chính',
    href: '/admin/payroll',
    description: 'Tham khảo tham số tính lương: bảo hiểm xã hội, thuế thu nhập cá nhân, lương tối thiểu.',
  },
  {
    id: 'tickets',
    label: 'Phản ánh',
    group: 'Điều hành',
    href: '/admin/tickets',
    description: 'Xử lý đề nghị của người lao động: khiếu nại giờ công, nghỉ phép, tạm ứng lương.',
  },
] as const;

export default async function AdminOverviewPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login?callback=/admin');
  }
  // Page `/admin` chỉ dành cho ADMIN_PORTAL_ROLES (xem server-session.ts).
  // Role ngoài (WORKER/VENDOR/CTV) không vào — guard ở admin layout, đây là fallback.
  if (session.role === 'WORKER' || session.role === 'VENDOR_ADMIN' || session.role === 'VENDOR_STAFF' || session.role === 'CTV') {
    redirect('/forbidden');
  }

  // RLS Phase 2 — mở transaction đã set GUC theo session trước khi đọc 3 KPI.
  // AuthContext tối thiểu chỉ cần userId+role cho RLS của 3 bảng này.
  const ctx = { userId: session.userId, role: session.role };
  const prisma = getPrisma();
  let kpis: KpiEntry[] = [];
  let loadError: string | null = null;
  try {
    const result = await withDbContext(prisma, ctx, async (tx) => {
      return loadOverviewMetrics({ role: session.role }, tx);
    });
    kpis = result.kpis;
  } catch (err) {
    // Prisma throw bubble-up từ service — KHÔNG trả 0 giả. Lưu message để UI hiển thị.
    loadError = err instanceof Error ? err.message : 'Chưa tải được số liệu';
  }

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10" style={{ background: 'var(--surface)' }}>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--on-surface)' }}>
          Tổng quan
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Chọn một nghiệp vụ để bắt đầu. Mỗi thẻ dưới đây là một khu vực làm việc riêng.
        </p>
      </header>

      {/* KPI cards */}
      <section className="mb-8" aria-label="Số liệu tổng quan">
        <h2 className="mb-3 text-base font-semibold" style={{ color: 'var(--on-surface)' }}>
          Số liệu tổng quan
        </h2>
        {loadError ? (
          <div
            className="rounded-lg border p-4 text-sm"
            style={{
              borderColor: 'var(--outline)',
              backgroundColor: 'var(--surface-container-lowest)',
              color: 'var(--on-surface-variant)',
            }}
          >
            <span className="font-medium">Chưa tải được số liệu.</span>{' '}
            <span className="text-xs">{loadError}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.key} kpi={kpi} />
            ))}
          </div>
        )}
        <p
          className="mt-2 text-xs"
          style={{ color: 'var(--on-surface-variant)' }}
          aria-live="polite"
        >
          Số liệu phản ánh đúng phạm vi quyền đọc của tài khoản hiện tại — nếu ghi
          &ldquo;trong phạm vi của bạn&rdquo;, con số bị RLS giới hạn theo dự án/vai trò,
          không phải tổng toàn hệ thống.
        </p>
      </section>

      {/* Section cards điều hướng — giữ nguyên như cũ */}
      <h2 className="mb-3 text-base font-semibold" style={{ color: 'var(--on-surface)' }}>
        Nghiệp vụ
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECTION_CARDS.map((card) => (
          <a
            key={card.id}
            href={card.href}
            className="block rounded-lg border p-5 transition-shadow hover:shadow-md"
            style={{
              background: 'var(--surface-container-lowest)',
              borderColor: 'var(--outline-variant)',
            }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-semibold" style={{ color: 'var(--on-surface)' }}>
                {card.label}
              </span>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  background: 'var(--primary-container)',
                  color: 'var(--on-primary-container)',
                }}
              >
                {card.group}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
              {card.description}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: KpiEntry }) {
  const cardStyle: React.CSSProperties = {
    background: 'var(--surface-container-lowest)',
    borderColor: 'var(--outline-variant)',
  };
  const inner = (
    <div
      className="block rounded-lg border p-5 transition-shadow"
      style={cardStyle}
    >
      <div className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>
        {kpi.label}
      </div>
      {kpi.hasPermission ? (
        <>
          <div
            className="mt-2 text-3xl font-semibold tabular-nums"
            style={{ color: 'var(--on-surface)' }}
          >
            {kpi.value.toLocaleString('vi-VN')}
          </div>
          <div
            className="mt-1 text-xs"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            {kpi.scopeLabel}
          </div>
        </>
      ) : (
        <>
          <div
            className="mt-2 text-base font-medium italic"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            {kpi.fallback}
          </div>
        </>
      )}
    </div>
  );
  // Chỉ đặt link tới route đang tồn tại (href khác null). KPI không có quyền → không link.
  if (kpi.hasPermission && kpi.href) {
    return (
      <Link href={kpi.href} className="hover:shadow-md" aria-label={`${kpi.label} — mở module`}>
        {inner}
      </Link>
    );
  }
  return inner;
}
