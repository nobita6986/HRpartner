'use client';

/**
 * RoleGuardLayout — Role-based layout wrapper cho 3 cổng HRP.
 *
 * Cổng HRP (HRP v3.0 §4.2):
 *   1. Admin Portal (/) — Admin, HR, PM, Accountant
 *   2. Worker Portal (/m) — Worker (PWA/mobile-first)
 *   3. Vendor Portal (vendor.hrpartner.vn) — Vendor, CTV
 *
 * Layout khác nhau theo cổng:
 *   - Admin: sidebar desktop (left, 240px) + header + content
 *   - Worker: bottom tab bar (mobile-first, 56px) + content
 *   - Vendor: sidebar thu gọn + top nav (cho CTV xem nhanh dự án)
 *
 * RoleGuard bảo vệ route bằng cách:
 *   - Check session role (từ cookie/JWT — stub: query param)
 *   - Nếu role không đủ → redirect sang /forbidden
 *   - Sidebar items ẩn theo role
 */

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Briefcase,
  Building2,
  ChevronDown,
  ClipboardList,
  Construction,
  FileText,
  Image,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRoundCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/src/shared/utils/cn';
import { getMostSpecificActiveHref } from './active-nav-helper';
import { roleLabel } from '@/src/shared/i18n/role-labels';
import { formLabel } from '@/src/shared/i18n/form-dictionary';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type Role =
  | 'WORKER'
  | 'HR_STAFF'
  | 'HR_MANAGER'
  | 'ACCOUNTANT'
  | 'PM'
  | 'ADMIN'
  | 'DIRECTOR'
  | 'SALE'
  | 'VENDOR'
  | 'CTV';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Roles được phép thấy item này */
  roles: Role[];
  /** Nhóm điều hướng thứ cấp. Không khai báo = menu cấp 1. */
  section?: 'development' | 'recruitment' | 'people' | 'finance' | 'system' | 'partners';
  /**
   * Mục hiển thị trạng thái "Sắp ra mắt" — không render link điều hướng, không
   * thể click, không highlight active. Dùng cho tính năng đã đẩy khỏi giai
   * đoạn vận hành hiện tại (vd. Chính sách hoa hồng, Sổ cái hoa hồng).
   */
  disabled?: boolean;
}

export interface RoleGuardLayoutProps {
  children: React.ReactNode;
  role: Role;
  portal: 'admin' | 'worker' | 'vendor';
  navItems: NavItem[];
  user?: { name: string; avatarUrl?: string };
  brandTitle?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT NAV PER PORTAL
// ═══════════════════════════════════════════════════════════════════════════

export const WORKER_NAV: NavItem[] = [
  { href: '/m', label: 'Trang chủ', icon: LayoutDashboard, roles: ['WORKER'] },
  { href: '/m/tickets', label: 'Đơn của tôi', icon: ClipboardList, roles: ['WORKER'] },
  { href: '/m/payslips', label: 'Phiếu lương', icon: Wallet, roles: ['WORKER'] },
  { href: '/m/profile', label: 'Hồ sơ', icon: Users, roles: ['WORKER'] },
];

export const VENDOR_NAV: NavItem[] = [
  { href: '/vendor', label: 'Tổng quan', icon: LayoutDashboard, roles: ['VENDOR', 'CTV'] },
  { href: '/vendor/projects', label: 'Dự án có nhu cầu', icon: Briefcase, roles: ['VENDOR', 'CTV'] },
  { href: '/vendor/submissions', label: 'Đã nộp ứng viên', icon: Users, roles: ['VENDOR', 'CTV'] },
  { href: '/vendor/statements', label: 'Đối soát', icon: FileText, roles: ['VENDOR'] },
  { href: '/vendor/settings', label: 'Cài đặt', icon: Settings, roles: ['VENDOR', 'CTV'] },
];

/**
 * Nav của portal điều hành (/admin).
 *
 * IA (P1-NAV-01, realigned T1C):
 * - Tổng quan                 → /admin
 * - Nhu cầu & Tuyển           → projects / jobs / job-postings / applications / staffing
 * - Nhân sự                   → workers
 * - Đối tác                   → clients / vendors
 * - Hệ thống                  → settings / media / users
 * - Đang phát triển           → tickets / attendance / reconciliation / payroll / commission/*
 *
 * Ghi chú T1C: Nhóm "Con người" cũ gom lẫn workforce (workers), quản trị tài
 * khoản (users), và đối tác bên ngoài (clients / vendors). Đã tách thành 3
 * nhóm theo domain: "Nhân sự" (chỉ workers), "Đối tác" (clients / vendors)
 * và đẩy "Tài khoản" về "Hệ thống". Staffing cũng được chuyển về "Nhu cầu
 * & Tuyển" vì đây là đầu vào của quy trình tuyển dụng. Role matrix giữ
 * nguyên — chỉ di chuyển item giữa các nhóm hiển thị.
 */
export const ADMIN_NAV_PHASE4: NavItem[] = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER', 'PM', 'ACCOUNTANT', 'SALE', 'DIRECTOR'] },

  // Nhu cầu & Tuyển (recruitment) — T1C: Staffing moved here from "Con người"
  // because StaffingOrder is the input of the recruitment flow, not workforce.
  //
  // hrp-t1a-introduce-hrp-and-menu-cleanup: recruitment section collapsed
  // from 4 items to 3 (Dự án → Nhu cầu tuyển dụng → Tin tuyển dụng).
  // The old "Danh sách nhu cầu" entry (`/admin/jobs`) was removed; the
  // slot-trống + publish + Công bố columns now live inside `/admin/projects`.
  // `/admin/jobs` is kept as a 307 redirect to `/admin/projects` (T0 directive §B.5).
  //
  // correction 1/1 (T0 PR #104): the user-facing recruitment flow is
  //   Dự án → Nhu cầu tuyển dụng → Tin tuyển dụng → Đơn ứng tuyển
  // so the recruitment sub-list is reordered accordingly. The role
  // matrix on each item is unchanged at the structural level — see
  // PRJ / PM / HR_STAFF role corrections in `app/admin/projects/page.tsx`.
  { href: '/admin/projects', label: 'Dự án', icon: Briefcase, roles: ['ADMIN', 'PM', 'HR_MANAGER', 'HR_STAFF'], section: 'recruitment' },
  { href: '/admin/staffing', label: 'Nhu cầu tuyển dụng', icon: ClipboardList, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER', 'PM'], section: 'recruitment' },
  { href: '/admin/jobs/job-postings', label: 'Tin tuyển dụng', icon: FileText, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER', 'SALE'], section: 'recruitment' },
  { href: '/admin/applications', label: 'Đơn ứng tuyển', icon: UserRoundCheck, roles: ['ADMIN', 'HR_MANAGER', 'SALE', 'DIRECTOR'], section: 'recruitment' },

  // Nhân sự (people) — T1C: chỉ còn Nhân sự (workers). Tài khoản đã chuyển
  // sang Hệ thống, Khách hàng / Nhà cung cấp sang nhóm Đối tác. Header đổi
  // từ "Con người" → "Nhân sự" để phản ánh đúng domain.
  //
  // hrp-m2a-operational-ux-debt / F2+F3 — LaborProfile navigation & intake
  // discoverability (audit §8.2 + §8.3, execution decision §D Priority 2):
  // add the two canonical pages that already exist at
  // `app/admin/labor-profiles/page.tsx` (ALLOWED_ROLES = ADMIN/HR_MANAGER/HR_STAFF)
  // and `app/admin/labor-profiles/new/page.tsx` to the people group so the
  // list and the `+ Tiếp nhận NLD` CTA are reachable in one click from the
  // sidebar instead of via the recruiter-workbench deep-link only. Roles
  // byte-mirror `app/admin/labor-profiles/page.tsx:16` — no widening.
  //
  // T0 T1B — HOTFIX UI NGƯỜI LAO ĐỘNG (F2+F3 follow-up):
  // - RENAME the workers entry label 'Nhân sự' → 'Người lao động' to align
  //   with the canonical operator-facing terminology; the workforce roster
  //   surface is "người lao động" (people being managed), not "nhân sự"
  //   (HR staff). Section stays 'people'.
  // - RENAME the LaborProfile list label 'Hồ sơ NLD' → 'Hồ sơ tiếp nhận'
  //   (the slot in the sidebar is a noun-phrase title; the full title
  //   "Hồ sơ tiếp nhận người lao động" remains on the page <h1>).
  // - REMOVE the dedicated /admin/labor-profiles/new sidebar entry
  //   ('Tiếp nhận NLD'). The intake flow is reachable from the LaborProfile
  //   list page's own "+ Tiếp nhận người lao động" CTA (T0 directive §1.4);
  //   keeping a separate sidebar slot duplicates the same destination and
  //   confuses operators. The route /admin/labor-profiles/new remains
  //   routable (no route change, no role-matrix change) — only the sidebar
  //   item is removed.
  // T0 T1C — PRE-P2 HOTFIX: HỒ SƠ ỨNG VIÊN → NGƯỜI LAO ĐỘNG
  // - REORDER: `Hồ sơ ứng viên` (intake) đặt TRƯỚC `Người lao động` (roster)
  //   để phản ánh đúng trình tự nghiệp vụ: ứng viên tiếp nhận trước, sau khi
  //   hoàn tất tuyển dụng (HRP_MANAGED outcome) thì mới liên kết / tạo Worker.
  // - RENAME: LaborProfile list label 'Hồ sơ tiếp nhận' → 'Hồ sơ ứng viên'
  //   (the full page title remains on the page <h1> and metadata).
  // - KHÔNG đổi route, role matrix, icon, hoặc active-nav contract (PR #112).
  // - Worker creation thuộc task nghiệp vụ P1-F completion/correction;
  //   KHÔNG triển khai trong vòng này.
  { href: '/admin/labor-profiles', label: 'Hồ sơ ứng viên', icon: UserRoundCheck, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER'], section: 'people' },
  { href: '/admin/workers', label: 'Người lao động', icon: Users, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER'], section: 'people' },

  // Đối tác (partners) — T1C: nhóm mới. Khách hàng / Nhà cung cấp là dữ
  // liệu đối tác bên ngoài, không thuộc workforce nội bộ.
  { href: '/admin/clients', label: 'Khách hàng', icon: Building2, roles: ['ADMIN', 'PM'], section: 'partners' },
  { href: '/admin/vendors', label: 'Nhà cung cấp', icon: Building2, roles: ['ADMIN', 'PM'], section: 'partners' },

  // Tài chính (finance) — currently empty after the Chợ việc làm operating
  // window deferred commission features. Header is hidden when this list is
  // empty (see `financeNav.length > 0` check below). Add new finance items
  // here if/when the operating scope re-introduces them.
  // (intentionally empty)

  // Đang phát triển (development) — items deferred from the current operating
  // window. The two commission items below are intentionally kept visible so
  // operators know the capability exists but is not yet routable. The
  // `disabled: true` flag prevents navigation and active-highlight; the
  // matching page renders an "Under Development" placeholder so direct URL
  // access never exposes the operational UI.
  { href: '/admin/tickets', label: 'Phản ánh / Tạm ứng', icon: ClipboardList, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER', 'ACCOUNTANT'], section: 'development' },
  { href: '/admin/attendance', label: 'Chấm công', icon: FileText, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER', 'PM', 'ACCOUNTANT'], section: 'development' },
  { href: '/admin/reconciliation', label: 'Đối soát', icon: Wallet, roles: ['ADMIN', 'HR_MANAGER', 'ACCOUNTANT'], section: 'development' },
  { href: '/admin/payroll', label: 'Tính lương', icon: Wallet, roles: ['ADMIN', 'HR_MANAGER', 'ACCOUNTANT'], section: 'development' },
  { href: '/admin/commission/policies', label: 'Chính sách hoa hồng', icon: FileText, roles: ['ADMIN', 'HR_MANAGER', 'ACCOUNTANT'], section: 'development', disabled: true },
  { href: '/admin/commission/ledger', label: 'Sổ cái hoa hồng', icon: Wallet, roles: ['ADMIN', 'HR_MANAGER', 'ACCOUNTANT'], section: 'development', disabled: true },

  // Hệ thống (system) — T1C: Tài khoản moved here from "Con người" because
  // user/role administration is a system-level concern, not a workforce one.
  { href: '/admin/users', label: 'Tài khoản', icon: Users, roles: ['ADMIN'], section: 'system' },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings, roles: ['ADMIN'], section: 'system' },
  { href: '/admin/media', label: 'Thư viện Media', icon: Image, roles: ['ADMIN', 'HR_MANAGER', 'HR_STAFF'], section: 'system' },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function RoleGuardLayout({
  children,
  role,
  portal,
  navItems,
  user,
  brandTitle = 'HRP',
}: RoleGuardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Filter nav theo role
  const visibleNav = React.useMemo(
    () => navItems.filter((item) => item.roles.includes(role)),
    [navItems, role],
  );

  const primaryNav = React.useMemo(
    () => visibleNav.filter((item) => !item.section),
    [visibleNav],
  );
  const recruitmentNav = React.useMemo(() => visibleNav.filter(item => item.section === 'recruitment'), [visibleNav]);
  const peopleNav = React.useMemo(() => visibleNav.filter(item => item.section === 'people'), [visibleNav]);
  const partnersNav = React.useMemo(() => visibleNav.filter(item => item.section === 'partners'), [visibleNav]);
  const financeNav = React.useMemo(() => visibleNav.filter(item => item.section === 'finance'), [visibleNav]);
  const systemNav = React.useMemo(() => visibleNav.filter(item => item.section === 'system'), [visibleNav]);

  const developmentNav = React.useMemo(
    () => visibleNav.filter((item) => item.section === 'development'),
    [visibleNav],
  );

  /**
   * P1-NAV-01 fix: compute the single active href for `pathname` among the
   * role-visible nav items, then mark `item.href === activeHref` as active.
   * The previous prefix-match logic double-activated `/admin/jobs` and
   * `/admin/jobs/job-postings` for `pathname='/admin/jobs/job-postings'`. The
   * `getMostSpecificActiveHref` helper picks the LONGEST matching href, so only
   * the most-specific entry highlights. The contract is enforced by
   * `active-nav-helper.test.ts` (RQ-08..RQ-14).
   */
  const activeHref = React.useMemo(
    () => getMostSpecificActiveHref(pathname, visibleNav),
    [pathname, visibleNav],
  );
  const developmentActiveHref = React.useMemo(
    () => getMostSpecificActiveHref(pathname, developmentNav),
    [pathname, developmentNav],
  );
  const isNavItemActive = React.useCallback(
    (href: string) => activeHref !== null && href === activeHref,
    [activeHref],
  );
  const developmentRouteActive = developmentActiveHref !== null;
  const [developmentOpen, setDevelopmentOpen] = React.useState(developmentRouteActive);

  React.useEffect(() => {
    if (developmentRouteActive) setDevelopmentOpen(true);
  }, [developmentRouteActive]);

  const renderNavItem = (item: NavItem, nested = false) => {
    if (item.disabled) {
      return renderDisabledNavItem(item, nested);
    }
    const active = isNavItemActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'nav-item-lift group flex min-h-10 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium',
          'transition-[background-color,color,box-shadow,transform] duration-150 ease-out',
          'hover:[transform:translateY(-1px)]',
          nested && 'pl-6 text-[13px]',
          active
            ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] shadow-[inset_3px_0_0_var(--color-primary)]'
            : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)]',
        )}
      >
        <item.icon
          className={cn(
            'h-4 w-4',
            active
              ? 'text-[var(--color-on-primary-container)]'
              : 'text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-on-surface)]',
          )}
        />
        <span className="flex-1 truncate">{item.label}</span>
      </Link>
    );
  };

  /**
   * Render a non-navigable nav row for items that are visible but not yet
   * available in the current operating window. Per directive the row is a
   * `<div>` (no `Link` → no href, no `next/link` prefetch, no routing), it
   * carries `aria-disabled="true"` so assistive tech flags it as inactive,
   * and it is never given the active-highlight treatment — even when its
   * href matches the current pathname (the matching page renders a
   * placeholder, not the operational UI).
   */
  const renderDisabledNavItem = (item: NavItem, nested: boolean) => {
    return (
      <div
        key={item.href}
        role="link"
        aria-disabled="true"
        aria-label={`${item.label} — Sắp ra mắt`}
        data-disabled-nav="true"
        className={cn(
          'flex min-h-10 cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium',
          'text-slate-400 select-none',
          nested && 'pl-6 text-[13px]',
        )}
      >
        <item.icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <span className="flex-1 truncate">{item.label}</span>
        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          Sắp ra mắt
        </span>
      </div>
    );
  };

  const portalClass = {
    admin: 'md:grid-cols-[240px_1fr]',
    worker: 'block',  // mobile-first
    vendor: 'md:grid-cols-[200px_1fr]',
  }[portal];

  return (
    <div className={cn('min-h-screen bg-slate-50', 'grid', portalClass)}>
      {/* Sidebar (admin + vendor) */}
      {portal !== 'worker' && (
        <aside
          className={cn(
            'relative hidden border-r border-slate-200 bg-white md:block',
            portal === 'admin' ? 'md:col-span-1' : 'md:col-span-1',
          )}
        >
          <SidebarHeader title={brandTitle} portal={portal} />
          <nav className="flex flex-col gap-0.5 p-3 overflow-y-auto max-h-[calc(100vh-140px)]" aria-label="Menu chính">
            {primaryNav.map((item) => renderNavItem(item))}

            {portal === 'admin' && recruitmentNav.length > 0 && (
              <>
                <div className="mt-4 mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nhu cầu & Tuyển</div>
                {recruitmentNav.map(item => renderNavItem(item))}
              </>
            )}
            
            {portal === 'admin' && peopleNav.length > 0 && (
              <>
                {/* T0 T1C — PRE-P2 HOTFIX: section header đổi từ
                    "NGƯỜI LAO ĐỘNG" → "QUẢN LÝ LAO ĐỘNG" để phản ánh đúng
                    phạm vi nhóm (cả intake lẫn roster), đồng thời khớp với
                    ngữ nghĩa "quản trị lao động" thay vì "lao động đang
                    quản lý". Visual style (UPPERCASE tracking) giữ nguyên. */}
                <div className="mt-4 mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">QUẢN LÝ LAO ĐỘNG</div>
                {peopleNav.map(item => renderNavItem(item))}
              </>
            )}

            {portal === 'admin' && partnersNav.length > 0 && (
              <>
                <div className="mt-4 mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Đối tác</div>
                {partnersNav.map(item => renderNavItem(item))}
              </>
            )}

            {portal === 'admin' && financeNav.length > 0 && (
              <>
                <div className="mt-4 mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tài chính</div>
                {financeNav.map(item => renderNavItem(item))}
              </>
            )}
            
            {portal === 'admin' && systemNav.length > 0 && (
              <>
                <div className="mt-4 mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Hệ thống</div>
                {systemNav.map(item => renderNavItem(item))}
              </>
            )}

            {portal === 'admin' && developmentNav.length > 0 && (
              <details
                className="group/development mt-2 rounded-md border border-dashed border-slate-200 bg-slate-50/70"
                open={developmentOpen}
                onToggle={(event) => setDevelopmentOpen(event.currentTarget.open)}
              >
                <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
                  <Construction className="h-4 w-4 text-slate-500" />
                  <span className="flex-1">Đang phát triển</span>
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    {developmentNav.length}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 group-open/development:rotate-180" />
                </summary>
                <div className="flex flex-col gap-0.5 border-t border-dashed border-slate-200 p-1.5">
                  {developmentNav.map((item) => renderNavItem(item, true))}
                </div>
              </details>
            )}
          </nav>
          <UserFooter user={user} role={role} onLogout={() => router.push('/login')} />
        </aside>
      )}

      {/* Main content */}
      <main className={cn(portal === 'worker' ? 'pb-16' : 'min-h-screen')}>
        {children}
      </main>

      {/* Bottom tab bar (worker) */}
      {portal === 'worker' && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200 bg-white"
          style={{ gridTemplateColumns: `repeat(${visibleNav.length}, 1fr)` }}
          aria-label="Menu chính"
        >
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2 text-[10px]',
                  active ? 'text-orange-700' : 'text-slate-600',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function SidebarHeader({
  title,
  portal,
  logoSrc = '/hrp-logo.webp',
}: {
  title: string;
  portal: 'admin' | 'worker' | 'vendor';
  logoSrc?: string;
}) {
  return (
    <div className="border-b border-slate-200 px-4 py-4">
      <div className="flex items-center gap-2">
        <img
          src={logoSrc}
          alt={title}
          style={{ height: '36px', width: 'auto' }}
        />
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-slate-900">{title}</div>
        </div>
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">
        {portal === 'admin' && 'Admin Portal'}
        {portal === 'vendor' && 'Vendor Portal'}
        {portal === 'worker' && 'Worker App'}
      </div>
    </div>
  );
}

function UserFooter({
  user,
  role,
  onLogout,
}: {
  user?: { name: string; avatarUrl?: string };
  role: Role;
  onLogout: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-800">
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-slate-900">
            {user?.name ?? formLabel('default_user')}
          </div>
          <div className="truncate text-xs text-slate-500">{roleLabel(role)}</div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Đăng xuất"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--color-on-surface-variant)] transition-colors duration-150 ease-out hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
