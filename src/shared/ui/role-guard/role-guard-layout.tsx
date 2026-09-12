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
  section?: 'development';
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
 * - /admin — Tổng quan
 * - /admin/staffing — Đơn tuyển dụng & điều phối nhân sự
 * - /admin/attendance — Chấm công
 * - /admin/reconciliation — Đối soát
 * - /admin/jobs — Tin tuyển dụng công khai
 * - /admin/applications — Hàng chờ đơn ứng tuyển
 * - /admin/workers, /admin/projects, /admin/clients — Dữ liệu nền
 * - /admin/tickets — Phản ánh / Tạm ứng
 * - /admin/payroll — Tính lương
 * - /admin/settings — Cài đặt
 */
export const ADMIN_NAV_PHASE4: NavItem[] = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER', 'PM', 'ACCOUNTANT', 'SALE', 'DIRECTOR'] },
  { href: '/admin/staffing', label: 'Staffing', icon: ClipboardList, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER', 'PM'] },
  { href: '/admin/attendance', label: 'Chấm công', icon: FileText, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER', 'PM', 'ACCOUNTANT'], section: 'development' },
  { href: '/admin/reconciliation', label: 'Đối soát', icon: Wallet, roles: ['ADMIN', 'HR_MANAGER', 'ACCOUNTANT'], section: 'development' },
  { href: '/admin/jobs', label: 'Job Board', icon: Briefcase, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER', 'SALE'] },
  { href: '/admin/applications', label: 'Đơn ứng tuyển', icon: UserRoundCheck, roles: ['ADMIN', 'HR_MANAGER', 'SALE', 'DIRECTOR'] },
  { href: '/admin/workers', label: 'Nhân sự', icon: Users, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER'] },
  { href: '/admin/projects', label: 'Dự án', icon: Briefcase, roles: ['ADMIN', 'PM', 'HR_MANAGER'] },
  { href: '/admin/clients', label: 'Khách hàng', icon: Building2, roles: ['ADMIN', 'PM'] },
  { href: '/admin/tickets', label: 'Phản ánh / Tạm ứng', icon: ClipboardList, roles: ['ADMIN', 'HR_STAFF', 'HR_MANAGER', 'ACCOUNTANT'], section: 'development' },
  { href: '/admin/payroll', label: 'Tính lương', icon: Wallet, roles: ['ADMIN', 'HR_MANAGER', 'ACCOUNTANT'], section: 'development' },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings, roles: ['ADMIN'] },
  // AV4 — Media Library foundation
  { href: '/admin/media', label: 'Thư viện Media', icon: Image, roles: ['ADMIN', 'HR_MANAGER', 'HR_STAFF'] },
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
    () => visibleNav.filter((item) => item.section !== 'development'),
    [visibleNav],
  );
  const developmentNav = React.useMemo(
    () => visibleNav.filter((item) => item.section === 'development'),
    [visibleNav],
  );

  const isNavItemActive = React.useCallback(
    (href: string) => pathname === href || (href !== '/' && pathname?.startsWith(href + '/')),
    [pathname],
  );
  const developmentRouteActive = developmentNav.some((item) => isNavItemActive(item.href));
  const [developmentOpen, setDevelopmentOpen] = React.useState(developmentRouteActive);

  React.useEffect(() => {
    if (developmentRouteActive) setDevelopmentOpen(true);
  }, [developmentRouteActive]);

  const renderNavItem = (item: NavItem, nested = false) => {
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
          <nav className="flex flex-col gap-0.5 p-3" aria-label="Menu chính">
            {primaryNav.map((item) => renderNavItem(item))}

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
  logoSrc = '/logo.png',
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
            {user?.name ?? 'User'}
          </div>
          <div className="truncate text-xs text-slate-500">{role}</div>
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
