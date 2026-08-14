'use client';

/**
 * TicketsPage — Demo showcase cho M7 (Phản ánh / Tạm ứng).
 *
 * Features:
 *   - ViewToggle: chuyển giữa Card view và Table view
 *   - EntityCard: hiển thị ticket (avatar, badges, meta, actions)
 *   - DataTable: hiển thị tabular (bulk select, filter, sort)
 *   - SlideOutDrawer: mở khi click row/card → xem chi tiết + history
 *   - RoleGuardLayout: sidebar admin, chỉ HR/Accountant/PM thấy
 *
 * Pattern học từ shadcn-admin:
 *   - DataTable tổng quát + columns đặc thù từng feature
 *   - Toolbar với faceted filters (status, type)
 *   - Bulk actions cho HR duyệt nhiều ticket cùng lúc
 */

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Eye, Check, X, Clock, AlertCircle } from 'lucide-react';

import {
  RoleGuardLayout,
  ADMIN_NAV,
} from '@/src/shared/ui/role-guard/role-guard-layout';
import {
  EntityCard,
  EntityCardGrid,
  type EntityCardBadge,
} from '@/src/shared/ui/entity-card/entity-card';
import { DataTable, type DataTableFilterDef } from '@/src/shared/ui/data-table/data-table';
import { ViewToggle, useViewModeFromUrl } from '@/src/shared/ui/view-toggle/view-toggle';
import { SlideOutDrawer } from '@/src/shared/ui/sheet/slide-out-drawer';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA — sẽ thay bằng API call trong production
// ═══════════════════════════════════════════════════════════════════════════

interface Ticket {
  id: string;
  type: 'TIMESHEET_DISPUTE' | 'ADVANCE_SALARY' | 'LEAVE_REQUEST';
  status: 'PENDING' | 'HR_APPROVED' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  workerName: string;
  workerCode: string;
  title: string;
  amountVnd?: number;  // CHỈ demo display — V4 F28: production là BigInt VND nguyên (ADR-010), API trả string
  createdAt: string;
  slaDueAt?: string;
}

const MOCK_TICKETS: Ticket[] = [
  {
    id: 'tk-001',
    type: 'ADVANCE_SALARY',
    status: 'PENDING',
    priority: 'NORMAL',
    workerName: 'Nguyễn Văn An',
    workerCode: 'EMP-001',
    title: 'Tạm ứng lương tháng 8',
    amountVnd: 2000000,
    createdAt: '2026-08-14T08:00:00Z',
    slaDueAt: '2026-08-16T08:00:00Z',
  },
  {
    id: 'tk-002',
    type: 'TIMESHEET_DISPUTE',
    status: 'HR_APPROVED',
    priority: 'HIGH',
    workerName: 'Trần Thị Bình',
    workerCode: 'EMP-002',
    title: 'Sai công ngày 10/8',
    createdAt: '2026-08-13T14:30:00Z',
    slaDueAt: '2026-08-14T14:30:00Z',
  },
  {
    id: 'tk-003',
    type: 'LEAVE_REQUEST',
    status: 'APPROVED',
    priority: 'NORMAL',
    workerName: 'Lê Hoàng Cường',
    workerCode: 'EMP-003',
    title: 'Nghỉ phép 2 ngày',
    createdAt: '2026-08-12T09:00:00Z',
  },
  {
    id: 'tk-004',
    type: 'ADVANCE_SALARY',
    status: 'PAID',
    priority: 'URGENT',
    workerName: 'Phạm Thị Dung',
    workerCode: 'EMP-004',
    title: 'Tạm ứng khẩn cấp',
    amountVnd: 5000000,
    createdAt: '2026-08-10T10:00:00Z',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const TYPE_LABEL: Record<Ticket['type'], string> = {
  TIMESHEET_DISPUTE: 'Phản ánh công',
  ADVANCE_SALARY: 'Tạm ứng',
  LEAVE_REQUEST: 'Nghỉ phép',
};

const STATUS_BADGE: Record<Ticket['status'], { label: string; variant: EntityCardBadge['variant'] }> = {
  PENDING: { label: 'Chờ HR', variant: 'warning' },
  HR_APPROVED: { label: 'Chờ chi', variant: 'info' },
  APPROVED: { label: 'Đã duyệt', variant: 'success' },
  PAID: { label: 'Đã chi', variant: 'success' },
  REJECTED: { label: 'T� chối', variant: 'danger' },
  CANCELLED: { label: '�ã hủy', variant: 'neutral' },
};

const formatVnd = (v?: number) =>
  v === undefined ? '' : new Intl.NumberFormat('vi-VN').format(v) + ' ₫';

// ═══════════════════════════════════════════════════════════════════════════
// TABLE COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

const columns: ColumnDef<Ticket, unknown>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        aria-label="Chọn tất cả"
        className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        aria-label={`Chọn ${row.original.workerName}`}
        className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
      />
    ),
    enableHiding: false,
  },
  {
    id: 'type',
    header: 'Loại',
    accessorFn: (row) => TYPE_LABEL[row.type],
    cell: ({ row }) => (
      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800">
        {TYPE_LABEL[row.original.type]}
      </span>
    ),
  },
  {
    id: 'worker',
    header: 'Nhân viên',
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-slate-900">{row.original.workerName}</div>
        <div className="text-xs text-slate-500">{row.original.workerCode}</div>
      </div>
    ),
  },
  {
    id: 'title',
    header: 'Tiêu đề',
    cell: ({ row }) => (
      <div className="max-w-[320px] truncate text-slate-700">{row.original.title}</div>
    ),
  },
  {
    id: 'amount',
    header: 'Số tiền',
    cell: ({ row }) =>
      row.original.amountVnd ? (
        <span className="font-medium text-slate-900">{formatVnd(row.original.amountVnd)}</span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    id: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const b = STATUS_BADGE[row.original.status];
      return (
        <span
          className={
            {
              warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
              info: 'bg-blue-50 text-blue-800 border-blue-200',
              success: 'bg-green-50 text-green-800 border-green-200',
              danger: 'bg-red-50 text-red-800 border-red-200',
              neutral: 'bg-slate-100 text-slate-700 border-slate-200',
            }[b.variant ?? 'neutral']
          }
        >
          {b.label}
        </span>
      );
    },
  },
  {
    id: 'priority',
    header: 'Ưu tiên',
    cell: ({ row }) => {
      const icon = {
        LOW: null,
        NORMAL: null,
        HIGH: <Clock className="h-3 w-3" />,
        URGENT: <AlertCircle className="h-3 w-3" />,
      }[row.original.priority];
      return (
        <span className="inline-flex items-center gap-1 text-xs text-slate-700">
          {icon}
          {row.original.priority}
        </span>
      );
    },
  },
  {
    id: 'createdAt',
    header: 'Ngày tạo',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString('vi-VN'),
  },
];

const filters: DataTableFilterDef[] = [
  {
    columnId: 'type',
    title: 'Loại',
    options: [
      { label: 'Tạm ứng', value: 'ADVANCE_SALARY' },
      { label: 'Phản ánh công', value: 'TIMESHEET_DISPUTE' },
      { label: 'Nghỉ phép', value: 'LEAVE_REQUEST' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function TicketsPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>(MOCK_TICKETS);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const view = useViewModeFromUrl('card');

  const selected = selectedId ? tickets.find((t) => t.id === selectedId) : null;

  return (
    <RoleGuardLayout
      role="HR_MANAGER"
      portal="admin"
      navItems={ADMIN_NAV}
      user={{ name: 'HR Manager' }}
      brandTitle="HRP"
      brandSubtitle="Quản trị nhân sự"
    >
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Phản ánh & Tạm ứng</h1>
            <p className="text-sm text-slate-700">
              Quản lý yêu cầu từ worker: phản ánh công, tạm ứng lương, nghỉ phép
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle storageKey="hrp:view:tickets" defaultMode="card" />
          </div>
        </div>

        {/* View: Card */}
        {view === 'card' && (
          <EntityCardGrid cols={{ default: 1, sm: 2, lg: 3 }}>
            {tickets.map((t) => {
              const sb = STATUS_BADGE[t.status];
              const badges: EntityCardBadge[] = [
                { label: TYPE_LABEL[t.type], variant: 'brand' },
                { label: sb.label, variant: sb.variant },
                ...(t.priority === 'URGENT' ? [{ label: 'Khẩn', variant: 'danger' as const }] : []),
              ];
              return (
                <EntityCard
                  key={t.id}
                  id={t.id}
                  href={`/admin/tickets/${t.id}`}
                  title={t.title}
                  subtitle={`${t.workerName} • ${t.workerCode}`}
                  icon={<ClipboardList className="h-5 w-5" />}
                  badges={badges}
                  meta={[
                    { label: 'Số tiền', value: formatVnd(t.amountVnd) || '—' },
                    { label: 'Ngày tạo', value: new Date(t.createdAt).toLocaleDateString('vi-VN') },
                    ...(t.slaDueAt
                      ? [
                          {
                            label: 'SLA',
                            value: new Date(t.slaDueAt).toLocaleString('vi-VN'),
                          },
                        ]
                      : []),
                  ]}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Xem
                      </button>
                      {t.status === 'PENDING' && (
                        <button
                          type="button"
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-orange-600 px-2.5 text-xs font-medium text-white hover:bg-orange-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Duyệt
                        </button>
                      )}
                    </>
                  }
                  footer={
                    <div className="flex items-center justify-between text-[11px]">
                      <span>#{t.id}</span>
                      <span>v{t.version ?? 1}</span>
                    </div>
                  }
                />
              );
            })}
          </EntityCardGrid>
        )}

        {/* View: Table */}
        {view === 'table' && (
          <DataTable
            data={tickets}
            columns={columns}
            searchKey="title"
            searchPlaceholder="Tìm theo tiêu đề..."
            filters={filters}
            onRowClick={(row) => setSelectedId(row.id)}
            toolbar={
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700"
              >
                <Check className="h-4 w-4" />
                Bulk duyệt
              </button>
            }
            bulkActions={(rows) => (
              <>
                <button className="inline-flex h-8 items-center gap-1 rounded-md bg-orange-600 px-2.5 text-xs font-medium text-white hover:bg-orange-700">
                  <Check className="h-3.5 w-3.5" />
                  Duyệt ({rows.length})
                </button>
                <button className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <X className="h-3.5 w-3.5" />
                  Từ chối
                </button>
              </>
            )}
            emptyState={
              <div className="flex flex-col items-center gap-2 py-8">
                <ClipboardList className="h-10 w-10 text-slate-300" />
                <p className="text-slate-700">Chưa có ticket nào trong queue</p>
              </div>
            }
          />
        )}

        {/* Drawer detail */}
        <SlideOutDrawer
          open={!!selected}
          onClose={() => setSelectedId(null)}
          title={selected?.title ?? ''}
          description={selected ? `${selected.workerName} • #${selected.id}` : ''}
          width="lg"
          footer={
            selected && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </button>
                {selected.status === 'PENDING' && (
                  <>
                    <button className="inline-flex h-9 items-center gap-1 rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50">
                      <X className="h-4 w-4" />
                      Từ chối
                    </button>
                    <button className="inline-flex h-9 items-center gap-1 rounded-md bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700">
                      <Check className="h-4 w-4" />
                      Duyệt
                    </button>
                  </>
                )}
              </>
            )
          }
        >
          {selected && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <DetailRow label="Loại" value={TYPE_LABEL[selected.type]} />
              <DetailRow label="Trạng thái" value={STATUS_BADGE[selected.status].label} />
              <DetailRow label="Ưu tiên" value={selected.priority} />
              <DetailRow label="Số tiền" value={formatVnd(selected.amountVnd) || '—'} />
              <DetailRow label="Worker" value={`${selected.workerName} (${selected.workerCode})`} />
              <DetailRow label="Ngày tạo" value={new Date(selected.createdAt).toLocaleString('vi-VN')} />
              {selected.slaDueAt && (
                <DetailRow
                  label="SLA đến"
                  value={new Date(selected.slaDueAt).toLocaleString('vi-VN')}
                />
              )}
            </dl>
          )}

          {selected && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Lịch sử</h3>
              <ul className="space-y-2">
                <HistoryRow
                  who="Nguyễn Văn An"
                  role="Worker"
                  action="Tạo ticket"
                  at={selected.createdAt}
                />
                <HistoryRow who="—" role="—" action="Chờ HR review" at={selected.createdAt} />
              </ul>
            </div>
          )}
        </SlideOutDrawer>
      </div>
    </RoleGuardLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function HistoryRow({
  who,
  role,
  action,
  at,
}: {
  who: string;
  role: string;
  action: string;
  at: string;
}) {
  return (
    <li className="flex gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex-1">
        <div className="text-sm text-slate-900">{action}</div>
        <div className="text-xs text-slate-500">
          {who} • {role} • {new Date(at).toLocaleString('vi-VN')}
        </div>
      </div>
    </li>
  );
}
