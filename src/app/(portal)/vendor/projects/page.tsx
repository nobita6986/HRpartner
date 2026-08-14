'use client';

/**
 * Vendor Projects Page — Vendor Portal landing.
 *
 * Showcase: Card grid với EntityCard (vendor xem nhanh các dự án đang tuyển).
 * Mỗi card có:
 *   - Avatar (logo client)
 *   - Title (tên dự án)
 *   - Badges (trạng thái, ưu tiên, số lượng cần tuyển)
 *   - Meta grid (địa điểm, ca làm, hạn nộp)
 *   - Actions: "Nộp ứng viên" (CTA chính — màu cam HRP)
 *
 * Vendor Portal không có DataTable (theo founder: vendor chỉ cần scan,
 * không cần bulk operations). Table dùng cho admin reconciliation.
 */

import * as React from 'react';
import Link from 'next/link';
import { MapPin, Calendar, Users, ArrowRight, Briefcase } from 'lucide-react';

import {
  RoleGuardLayout,
  VENDOR_NAV,
} from '@/src/shared/ui/role-guard/role-guard-layout';
import {
  EntityCard,
  EntityCardGrid,
} from '@/src/shared/ui/entity-card/entity-card';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA — staffing orders cho vendor thấy
// ═══════════════════════════════════════════════════════════════════════════

interface StaffingOrder {
  id: string;
  projectName: string;
  clientName: string;
  clientLogo?: string;
  position: string;
  slotsNeeded: number;
  slotsFilled: number;
  location: string;
  shift: string;
  startDate: string;
  deadline: string;
  hourlyRateVnd: number;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'CLOSING_SOON' | 'CLOSED';
}

const MOCK_ORDERS: StaffingOrder[] = [
  {
    id: 'so-001',
    projectName: 'Lắp đặt điện nhà máy Bình Dương',
    clientName: 'Cty TNHH ABC',
    position: 'Thợ điện công nghiệp',
    slotsNeeded: 8,
    slotsFilled: 3,
    location: 'Bình Dương',
    shift: 'Ca sáng (7h-16h)',
    startDate: '2026-08-20',
    deadline: '2026-08-18',
    hourlyRateVnd: 35000,
    priority: 'HIGH',
    status: 'CLOSING_SOON',
  },
  {
    id: 'so-002',
    projectName: 'Đóng gói hàng hóa KCN Tân Bình',
    clientName: 'Cty Logistics XYZ',
    position: 'Công nhân đóng gói',
    slotsNeeded: 15,
    slotsFilled: 7,
    location: 'TP.HCM',
    shift: 'Ca hành chính',
    startDate: '2026-08-22',
    deadline: '2026-08-19',
    hourlyRateVnd: 28000,
    priority: 'NORMAL',
    status: 'OPEN',
  },
  {
    id: 'so-003',
    projectName: 'Phục vụ sự kiện tiệc cưới Q.7',
    clientName: 'Nhà hàng Riverside',
    position: 'Phục vụ bàn',
    slotsNeeded: 12,
    slotsFilled: 0,
    location: 'TP.HCM',
    shift: 'Ca tối (17h-23h)',
    startDate: '2026-08-25',
    deadline: '2026-08-21',
    hourlyRateVnd: 32000,
    priority: 'URGENT',
    status: 'CLOSING_SOON',
  },
  {
    id: 'so-004',
    projectName: 'Vận chuyển kho bãi Long An',
    clientName: 'Cty Vận tải Miền Tây',
    position: 'Lái xe nâng',
    slotsNeeded: 4,
    slotsFilled: 2,
    location: 'Long An',
    shift: 'Xoay ca',
    startDate: '2026-09-01',
    deadline: '2026-08-28',
    hourlyRateVnd: 45000,
    priority: 'NORMAL',
    status: 'OPEN',
  },
];

const formatVnd = (v: number) =>
  new Intl.NumberFormat('vi-VN').format(v) + ' ₫/giờ';

const priorityBadge = {
  NORMAL: { label: 'Bình thường', variant: 'neutral' as const },
  HIGH: { label: 'Cần gấp', variant: 'warning' as const },
  URGENT: { label: 'Rất gấp', variant: 'danger' as const },
};

const statusBadge = {
  OPEN: { label: 'Đang tuyển', variant: 'success' as const },
  CLOSING_SOON: { label: 'Sắp hết hạn', variant: 'warning' as const },
  CLOSED: { label: 'Đã đóng', variant: 'neutral' as const },
};

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function VendorProjectsPage() {
  const orders = MOCK_ORDERS;

  return (
    <RoleGuardLayout
      role="VENDOR"
      portal="vendor"
      navItems={VENDOR_NAV}
      user={{ name: 'Vendor ABC' }}
      brandTitle="Vendor Portal"
      brandSubtitle="hrpartner.vn"
    >
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dự án đang tuyển</h1>
          <p className="text-sm text-slate-700">
            {orders.length} dự án đang mở. Nộp ứng viên để HR xét duyệt.
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile label="Dự án đang mở" value={orders.filter((o) => o.status !== 'CLOSED').length.toString()} />
          <KpiTile label="Tổng slot cần" value={orders.reduce((s, o) => s + o.slotsNeeded, 0).toString()} />
          <KpiTile label="Đã tuyển" value={orders.reduce((s, o) => s + o.slotsFilled, 0).toString()} />
          <KpiTile label="Đã nộp tháng này" value="—" />
        </div>

        {/* Grid */}
        <EntityCardGrid cols={{ default: 1, sm: 2, lg: 3, xl: 3 }}>
          {orders.map((o) => {
            const pb = priorityBadge[o.priority];
            const sb = statusBadge[o.status];
            return (
              <EntityCard
                key={o.id}
                id={o.id}
                href={`/vendor/projects/${o.id}`}
                title={o.projectName}
                subtitle={o.clientName}
                icon={<Briefcase className="h-5 w-5" />}
                badges={[
                  { label: pb.label, variant: pb.variant },
                  { label: sb.label, variant: sb.variant },
                ]}
                meta={[
                  { label: 'Vị trí', value: o.position },
                  { label: 'Địa điểm', value: o.location, inline: true },
                  {
                    label: 'Cần / đã tuyển',
                    value: (
                      <span className="font-mono">
                        <span className="text-orange-800">{o.slotsFilled}</span>
                        <span className="text-slate-400"> / {o.slotsNeeded}</span>
                      </span>
                    ),
                  },
                  {
                    label: 'Hạn nộp',
                    value: new Date(o.deadline).toLocaleDateString('vi-VN'),
                  },
                  {
                    label: 'Đơn giá',
                    value: formatVnd(o.hourlyRateVnd),
                  },
                  {
                    label: 'Ca',
                    value: o.shift,
                  },
                ]}
                actions={
                  <>
                    <Link
                      href={`/vendor/projects/${o.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Chi tiết
                    </Link>
                    <Link
                      href={`/vendor/projects/${o.id}/submit`}
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-orange-600 px-2.5 text-xs font-medium text-white hover:bg-orange-700"
                    >
                      Nộp ứng viên
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </>
                }
                footer={
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Bắt đầu {new Date(o.startDate).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {o.slotsNeeded} slot
                    </span>
                  </div>
                }
              />
            );
          })}
        </EntityCardGrid>
      </div>
    </RoleGuardLayout>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
