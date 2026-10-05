'use client';

/**
 * OrderManagementClient — t1a-staffing-order-management.
 *
 * Trang quản lý Nhu cầu tuyển dụng (`/admin/staffing-orders/[id]`). Hiển thị:
 *
 *   1. Header: code, title, project, description, deadline, status.
 *   2. Bảng vị trí: mã, tên, số lượng, đã tuyển, còn thiếu, ca, lương/giờ,
 *      địa điểm, thời hạn (validFrom/validTo).
 *   3. Bảng JobOpenings + JobPostings liên kết.
 *   4. Toolbar thao tác: Sửa, Đánh dấu sắp đóng, Mở lại, Đóng, Hủy, Xóa.
 *      Mỗi nút gated bằng capability + state machine.
 *   5. Section chuyên viên (existing `RecruiterAssignmentManager`) chỉ thao tác
 *      bởi ADMIN/HR_MANAGER (canAssign); role khác vẫn thấy read-only.
 *   6. Modals: sửa order (EditOrderModal), confirm đóng/hủy (ConfirmDialog).
 *
 * Capability dẫn xuất từ role trên server (`page.tsx`); client chỉ toggle UI
 * theo cờ và kiểm tra lại trước khi gửi request. Backend tự enforce quyền.
 */

import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { StatusBadge } from '@/src/shared/ui/status-badge';
import {
  STAFFING_ORDER_MODULE,
  staffingOrderStatusLabel,
  staffingOrderStatusTone,
} from '@/src/domains/staffing/staffing-order-ui';

import { RecruiterAssignmentManager } from './recruiter-assignment-manager';
import { EditOrderModal } from './edit-order-modal';

// ─── Public DTOs (mirrors server) ──────────────────────────────────────────

export interface StaffingOrderSlotDto {
  id: string;
  positionCode: string;
  positionTitle: string;
  slotsNeeded: number;
  slotsFilled: number;
  hourlyRateVnd: number | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  validFrom: string;
  validTo: string | null;
  workLocation: string | null;
  jobOpening?: { id: string; status: string } | null;
  neoJobOpenings?: Array<{ id: string; status: string }>;
  _count?: { submissions: number; assignments: number };
}

export interface StaffingOrderOpeningDto {
  id: string;
  status: string;
  openedAt: string | null;
  closedAt: string | null;
  posting?: {
    id: string;
    status: string;
    slug: string;
  } | null;
}

export interface StaffingOrderAssignmentDto {
  id: string;
  recruiterUserId: string;
  status: string;
  reason: string | null;
  assignedAt: string;
  revokedAt: string | null;
}

export interface StaffingOrderDetailDto {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: 'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'CANCELLED';
  deadlineDate: string | null;
  project: { id: string; name: string; code: string };
  slots: StaffingOrderSlotDto[];
  jobOpenings: StaffingOrderOpeningDto[];
  recruiterAssignments: StaffingOrderAssignmentDto[];
  createdAt: string;
}

export interface StaffingOrderCapability {
  /** Có thể mở trang không (LIST_ROLES). */
  canView: boolean;
  /** Có thể Sửa / Đổi trạng thái. ADMIN/HR_MANAGER/SALE. */
  canEdit: boolean;
  /** Có thể đổi status (status machine transition). Đồng bộ với canEdit. */
  canChangeStatus: boolean;
  /** Có thể phân công chuyên viên (RecruiterAssignmentManager). ADMIN/HR_MANAGER. */
  canAssign: boolean;
  /** Có thể xoá vĩnh viễn. Chỉ ADMIN. */
  canDelete: boolean;
}

export interface OrderManagementClientProps {
  order: StaffingOrderDetailDto | null;
  loadError: string | null;
  capability: StaffingOrderCapability;
  role: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** State machine — mirror src/domains/staffing/order.service.ts VALID_TRANSITIONS. */
const VALID_TRANSITIONS: Record<string, Array<'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'CANCELLED'>> = {
  OPEN: ['CLOSING_SOON', 'CLOSED', 'CANCELLED'],
  CLOSING_SOON: ['OPEN', 'CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

/** Pure helper exported for unit-test reach. */
export function allowedTransitions(
  status: string,
): Array<'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'CANCELLED'> {
  return VALID_TRANSITIONS[status] ?? [];
}

// ─── Local StatusBadge wrapper ──────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: string }) {
  const label = staffingOrderStatusLabel(status);
  const tone = staffingOrderStatusTone(status);
  return (
    <StatusBadge
      module={STAFFING_ORDER_MODULE}
      status={status}
      tone={tone}
      testId={`order-status-${status}`}
    >
      {label}
    </StatusBadge>
  );
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

function formatCurrencyVnd(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('vi-VN')} ₫`;
}

function formatShift(start: string | null, end: string | null): string {
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return `đến ${end}`;
  return '—';
}

// ─── ConfirmDialog (close / cancel) ─────────────────────────────────────────

type ConfirmKind = 'CLOSING_SOON' | 'CLOSED' | 'CANCELLED' | 'REOPEN';

function describeKind(kind: ConfirmKind): { title: string; body: string; confirmLabel: string; tone: 'primary' | 'danger' } {
  switch (kind) {
    case 'CLOSING_SOON':
      return {
        title: 'Đánh dấu sắp đóng?',
        body: 'Order sẽ chuyển sang trạng thái "Sắp đóng". Vẫn nhận hồ sơ nhưng đánh dấu ưu tiên thấp. Có thể mở lại sau.',
        confirmLabel: 'Đánh dấu sắp đóng',
        tone: 'primary',
      };
    case 'CLOSED':
      return {
        title: 'Đóng nhu cầu này?',
        body: 'Order sẽ chuyển sang trạng thái "Đã đóng". Không nhận thêm hồ sơ mới. KHÔNG thể mở lại — chỉ tạo nhu cầu mới.',
        confirmLabel: 'Đóng nhu cầu',
        tone: 'danger',
      };
    case 'CANCELLED':
      return {
        title: 'Hủy nhu cầu này?',
        body: 'Order sẽ chuyển sang trạng thái "Đã hủy". Đây là trạng thái terminal — KHÔNG thể mở lại. JobPosting liên kết sẽ bị ẩn khỏi job board công khai.',
        confirmLabel: 'Hủy nhu cầu',
        tone: 'danger',
      };
    case 'REOPEN':
      return {
        title: 'Mở lại nhu cầu này?',
        body: 'Order sẽ chuyển về trạng thái "Đang mở" và tiếp tục nhận hồ sơ. JobPosting liên kết (nếu có) sẽ hiện lại trên job board.',
        confirmLabel: 'Mở lại',
        tone: 'primary',
      };
  }
}

function ConfirmDialog({
  kind,
  orderCode,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  kind: ConfirmKind;
  orderCode: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const desc = describeKind(kind);
  return (
    <div
      data-testid="confirm-dialog"
      role="dialog"
      aria-labelledby="confirm-title"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        style={{ background: 'var(--surface-container-lowest)' }}
        className="w-full max-w-md rounded-lg border p-6 shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2
          id="confirm-title"
          style={{ color: 'var(--on-surface)' }}
          className="text-lg font-semibold"
        >
          {desc.title}
        </h2>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-2 text-sm">
          {desc.body}
        </p>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs font-mono">
          {orderCode}
        </p>
        {error && (
          <p
            role="alert"
            data-testid="confirm-error"
            style={{ color: '#c62828' }}
            className="mt-3 text-sm"
          >
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            data-testid="confirm-cancel"
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
            className="rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            data-testid="confirm-submit"
            style={{
              background: desc.tone === 'danger' ? '#c62828' : 'var(--primary)',
              color: '#fff',
            }}
            className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {pending ? 'Đang xử lý…' : desc.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteConfirmDialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  orderCode,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  orderCode: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      data-testid="delete-confirm-dialog"
      role="dialog"
      aria-labelledby="delete-confirm-title"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        style={{ background: 'var(--surface-container-lowest)' }}
        className="w-full max-w-md rounded-lg border p-6 shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2
          id="delete-confirm-title"
          style={{ color: '#c62828' }}
          className="text-lg font-semibold"
        >
          Xóa vĩnh viễn nhu cầu này?
        </h2>
        <p style={{ color: 'var(--on-surface)' }} className="mt-2 text-sm">
          Hành động này <strong>không thể hoàn tác</strong>. Order sẽ bị xóa
          vĩnh viễn khỏi hệ thống cùng với các vị trí chưa phát sinh nghiệp vụ.
        </p>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs font-mono">
          {orderCode}
        </p>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-2 text-xs">
          Nếu order đã có JobOpening, JobPosting, đơn ứng tuyển, placement hoặc lịch
          sử phân công, hệ thống sẽ từ chối. Khi đó hãy dùng &quot;Hủy nhu cầu&quot;
          (CANCELLED) thay thế để giữ lại lịch sử.
        </p>
        {error && (
          <p
            role="alert"
            data-testid="delete-confirm-error"
            style={{ color: '#c62828' }}
            className="mt-3 text-sm"
          >
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            data-testid="delete-confirm-cancel"
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
            className="rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            data-testid="delete-confirm-submit"
            style={{ background: '#c62828', color: '#fff' }}
            className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {pending ? 'Đang xóa…' : 'Xóa vĩnh viễn'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

type StatusDialog = null | ConfirmKind;
type Flash = { kind: 'success' | 'error'; text: string } | null;

export function OrderManagementClient({
  order,
  loadError,
  capability,
  role,
}: OrderManagementClientProps) {
  const [statusDialog, setStatusDialog] = useState<StatusDialog>(null);
  const [statusPending, setStatusPending] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);

  /** Idempotency key cho mỗi lần PATCH status — mỗi click tạo key mới. */
  const [statusIdemKey, setStatusIdemKey] = useState<string | null>(null);
  /** Idempotency key cho DELETE. */
  const [deleteIdemKey] = useState<string | null>(null);

  // Reset flash khi đổi order (navigate giữa các id).
  useEffect(() => {
    setFlash(null);
    setStatusDialog(null);
    setStatusError(null);
    setShowEdit(false);
    setShowDelete(false);
    setDeleteError(null);
  }, [order?.id]);

  const handleConfirmStatus = useCallback(async () => {
    if (!order || !statusDialog) return;
    setStatusPending(true);
    setStatusError(null);
    // ConfirmKind 'REOPEN' maps to status 'OPEN' when sending to API.
    const targetStatus = statusDialog === 'REOPEN' ? 'OPEN' : statusDialog;
    const key = statusIdemKey ?? cryptoRandomUuid();
    if (!statusIdemKey) setStatusIdemKey(key);
    try {
      const res = await fetch(`/api/staffing/orders/${order.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-idempotency-key': key,
        },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusError(data.message ?? `HTTP ${res.status}`);
        return;
      }
      setStatusDialog(null);
      setStatusIdemKey(null);
      setFlash({ kind: 'success', text: `Đã chuyển trạng thái sang ${staffingOrderStatusLabel(targetStatus)}.` });
      // Reload trang để lấy lại detail mới — đơn giản và không drift so với cache.
      window.location.reload();
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Lỗi kết nối');
    } finally {
      setStatusPending(false);
    }
  }, [order, statusDialog, statusIdemKey]);

  const handleDelete = useCallback(async () => {
    if (!order) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/staffing/orders/${order.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-idempotency-key': deleteIdemKey ?? cryptoRandomUuid() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.message ?? `HTTP ${res.status}`);
        return;
      }
      // Sau khi xóa, điều hướng về list.
      window.location.href = '/admin/staffing';
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Lỗi kết nối');
    } finally {
      setDeletePending(false);
    }
  }, [order, deleteIdemKey]);

  const transitionTargets = useMemo<ConfirmKind[]>(() => {
    if (!order) return [];
    // Map raw target status (e.g. "OPEN") to dialog kind. The button "Mở lại"
    // appears when current status can transition to OPEN; we render that as
    // a REOPEN dialog (different copy) instead of a generic status confirm.
    const out: ConfirmKind[] = [];
    for (const t of allowedTransitions(order.status)) {
      if (t === 'OPEN') out.push('REOPEN');
      else out.push(t);
    }
    return out;
  }, [order]);

  if (loadError) {
    return (
      <div className="px-6 py-8 lg:px-8" style={{ background: 'var(--surface)' }}>
        <div
          role="alert"
          data-testid="order-load-error"
          style={{
            background: 'var(--error-container)',
            color: 'var(--on-error-container)',
            borderColor: 'var(--error)',
          }}
          className="rounded-lg border p-4 text-sm"
        >
          {loadError}
        </div>
        <div className="mt-4">
          <Link
            href="/admin/staffing"
            style={{ color: 'var(--primary)' }}
            className="text-sm font-medium hover:underline"
          >
            ← Quay lại danh sách nhu cầu
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-6 py-8 lg:px-8" style={{ background: 'var(--surface)' }}>
        <p style={{ color: 'var(--on-surface-variant)' }}>Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 lg:px-8" style={{ background: 'var(--surface)' }}>
      <div className="mb-4">
        <Link
          href="/admin/staffing"
          style={{ color: 'var(--on-surface-variant)' }}
          className="text-xs hover:underline"
        >
          ← Danh sách nhu cầu tuyển dụng
        </Link>
      </div>

      <header
        data-testid="order-header"
        className="mb-6 rounded-lg border p-5"
        style={{ borderColor: 'var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-3">
              <span
                style={{ color: 'var(--primary)' }}
                className="font-mono text-sm"
                data-testid="order-code"
              >
                {order.code}
              </span>
              <h1
                style={{ color: 'var(--on-surface)' }}
                className="text-2xl font-semibold"
                data-testid="order-title"
              >
                {order.title}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt style={{ color: 'var(--on-surface-variant)' }} className="text-xs">
                  Dự án
                </dt>
                <dd style={{ color: 'var(--on-surface)' }} data-testid="order-project">
                  <Link
                    href={`/admin/projects/${order.project.id}`}
                    className="hover:underline"
                  >
                    {order.project.name} <span className="font-mono text-xs">({order.project.code})</span>
                  </Link>
                </dd>
              </div>
              <div>
                <dt style={{ color: 'var(--on-surface-variant)' }} className="text-xs">
                  Hạn tuyển
                </dt>
                <dd style={{ color: 'var(--on-surface)' }} data-testid="order-deadline">
                  {formatDate(order.deadlineDate)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt style={{ color: 'var(--on-surface-variant)' }} className="text-xs">
                  Mô tả
                </dt>
                <dd
                  style={{ color: 'var(--on-surface)' }}
                  className="whitespace-pre-line"
                  data-testid="order-description"
                >
                  {order.description?.trim() ? order.description : '—'}
                </dd>
              </div>
            </dl>
          </div>
          {capability.canView && !capability.canEdit && (
            <div
              data-testid="readonly-banner"
              style={{
                background: 'var(--surface-container)',
                color: 'var(--on-surface-variant)',
                borderColor: 'var(--outline-variant)',
              }}
              className="rounded border px-3 py-2 text-xs"
            >
              Chế độ chỉ đọc — role {role} có quyền xem nhưng không thể thao tác.
            </div>
          )}
        </div>
      </header>

      {flash && (
        <div
          role="status"
          data-testid={`order-flash-${flash.kind}`}
          style={{
            background: flash.kind === 'success' ? '#e8f5e9' : '#ffebee',
            color: flash.kind === 'success' ? '#197a56' : '#c62828',
            borderColor: flash.kind === 'success' ? '#197a56' : '#c62828',
          }}
          className="mb-4 rounded border p-3 text-sm"
        >
          {flash.text}
        </div>
      )}

      {/* Toolbar */}
      {capability.canEdit && (
        <section
          data-testid="order-toolbar"
          aria-label="Thao tác quản lý"
          className="mb-6 flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            data-testid="toolbar-edit"
            onClick={() => setShowEdit(true)}
            style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            className="rounded px-4 py-2 text-sm font-semibold"
          >
            Sửa nhu cầu
          </button>
          {transitionTargets.includes('CLOSING_SOON') && (
            <button
              type="button"
              data-testid="toolbar-closing-soon"
              onClick={() => { setStatusDialog('CLOSING_SOON'); setStatusError(null); setStatusIdemKey(null); }}
              style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
              className="rounded border px-4 py-2 text-sm"
            >
              Đánh dấu sắp đóng
            </button>
          )}
          {transitionTargets.includes('REOPEN') && (
            <button
              type="button"
              data-testid="toolbar-reopen"
              onClick={() => { setStatusDialog('REOPEN'); setStatusError(null); setStatusIdemKey(null); }}
              style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
              className="rounded border px-4 py-2 text-sm"
            >
              Mở lại
            </button>
          )}
          {transitionTargets.includes('CLOSED') && (
            <button
              type="button"
              data-testid="toolbar-close"
              onClick={() => { setStatusDialog('CLOSED'); setStatusError(null); setStatusIdemKey(null); }}
              style={{ borderColor: '#c62828', color: '#c62828', background: 'transparent' }}
              className="rounded border px-4 py-2 text-sm"
            >
              Đóng nhu cầu
            </button>
          )}
          {transitionTargets.includes('CANCELLED') && (
            <button
              type="button"
              data-testid="toolbar-cancel"
              onClick={() => { setStatusDialog('CANCELLED'); setStatusError(null); setStatusIdemKey(null); }}
              style={{ borderColor: '#c62828', color: '#c62828', background: 'transparent' }}
              className="rounded border px-4 py-2 text-sm"
            >
              Hủy nhu cầu
            </button>
          )}
          {capability.canDelete && order.status !== 'CLOSED' && order.status !== 'CANCELLED' && (
            <button
              type="button"
              data-testid="toolbar-delete"
              onClick={() => { setShowDelete(true); setDeleteError(null); }}
              style={{ borderColor: '#c62828', color: '#c62828', background: 'transparent' }}
              className="ml-auto rounded border px-4 py-2 text-sm"
            >
              Xóa vĩnh viễn
            </button>
          )}
        </section>
      )}

      {/* Bảng vị trí */}
      <section
        aria-labelledby="order-slots-heading"
        className="mb-8"
        data-testid="order-slots-section"
      >
        <h2
          id="order-slots-heading"
          style={{ color: 'var(--on-surface)' }}
          className="mb-3 text-lg font-semibold"
        >
          Vị trí cần tuyển ({order.slots.length})
        </h2>
        {order.slots.length === 0 ? (
          <div
            style={{
              background: 'var(--surface-container-lowest)',
              color: 'var(--on-surface-variant)',
              borderColor: 'var(--outline-variant)',
            }}
            className="rounded-lg border p-6 text-center text-sm"
          >
            Nhu cầu này chưa có vị trí nào.
          </div>
        ) : (
          <div
            className="overflow-x-auto rounded-lg border"
            style={{ borderColor: 'var(--outline-variant)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    background: 'var(--surface-container)',
                    borderBottom: '1px solid var(--outline-variant)',
                  }}
                >
                  {['Mã', 'Tên vị trí', 'Cần', 'Đã tuyển', 'Còn thiếu', 'Ca làm', 'Lương/giờ', 'Địa điểm', 'Hiệu lực'].map(
                    (h) => (
                      <th
                        key={h}
                        style={{ color: 'var(--on-surface-variant)' }}
                        className="px-3 py-2 text-left font-semibold"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {order.slots.map((s) => {
                  const remaining = Math.max(0, s.slotsNeeded - s.slotsFilled);
                  const hasDeps =
                    (s._count?.submissions ?? 0) > 0 ||
                    (s._count?.assignments ?? 0) > 0 ||
                    s.jobOpening != null ||
                    (s.neoJobOpenings?.length ?? 0) > 0;
                  return (
                    <tr
                      key={s.id}
                      data-testid={`order-slot-row-${s.id}`}
                      style={{ borderTop: '1px solid var(--outline-variant)' }}
                    >
                      <td
                        style={{ color: 'var(--on-surface-variant)' }}
                        className="px-3 py-2 font-mono text-xs"
                      >
                        {s.positionCode}
                      </td>
                      <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2">
                        {s.positionTitle}
                      </td>
                      <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2 text-center">
                        {s.slotsNeeded}
                      </td>
                      <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2 text-center">
                        {s.slotsFilled}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          data-testid={`order-slot-remaining-${s.id}`}
                          style={{
                            color: remaining === 0 ? '#197a56' : remaining >= s.slotsNeeded / 2 ? '#e65100' : '#c62828',
                          }}
                          className="font-mono text-xs"
                        >
                          {remaining === 0 ? 'đã đủ' : remaining}
                        </span>
                      </td>
                      <td style={{ color: 'var(--on-surface-variant)' }} className="px-3 py-2 text-xs">
                        {formatShift(s.shiftStart, s.shiftEnd)}
                      </td>
                      <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2 text-xs">
                        {formatCurrencyVnd(s.hourlyRateVnd)}
                      </td>
                      <td style={{ color: 'var(--on-surface-variant)' }} className="px-3 py-2 text-xs">
                        {s.workLocation ?? '—'}
                      </td>
                      <td style={{ color: 'var(--on-surface-variant)' }} className="px-3 py-2 text-xs">
                        {formatDate(s.validFrom)} → {formatDate(s.validTo)}
                        {hasDeps && (
                          <span
                            title="Slot đã phát sinh JobOpening/Submission/Assignment — không thể xoá"
                            data-testid={`order-slot-locked-${s.id}`}
                            style={{ color: '#c62828' }}
                            className="ml-1"
                          >
                            🔒
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bảng JobOpenings + JobPostings */}
      <section
        aria-labelledby="order-openings-heading"
        className="mb-8"
        data-testid="order-openings-section"
      >
        <h2
          id="order-openings-heading"
          style={{ color: 'var(--on-surface)' }}
          className="mb-3 text-lg font-semibold"
        >
          JobOpenings &amp; JobPostings ({order.jobOpenings.length})
        </h2>
        {order.jobOpenings.length === 0 ? (
          <div
            style={{
              background: 'var(--surface-container-lowest)',
              color: 'var(--on-surface-variant)',
              borderColor: 'var(--outline-variant)',
            }}
            className="rounded-lg border p-6 text-center text-sm"
          >
            Nhu cầu này chưa có JobOpening nào.
          </div>
        ) : (
          <div
            className="overflow-x-auto rounded-lg border"
            style={{ borderColor: 'var(--outline-variant)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    background: 'var(--surface-container)',
                    borderBottom: '1px solid var(--outline-variant)',
                  }}
                >
                  <th
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="px-3 py-2 text-left font-semibold"
                  >
                    JobOpening
                  </th>
                  <th
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="px-3 py-2 text-left font-semibold"
                  >
                    Trạng thái Opening
                  </th>
                  <th
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="px-3 py-2 text-left font-semibold"
                  >
                    JobPosting
                  </th>
                  <th
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="px-3 py-2 text-left font-semibold"
                  >
                    Trạng thái Posting
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.jobOpenings.map((o) => (
                  <tr
                    key={o.id}
                    data-testid={`order-opening-row-${o.id}`}
                    style={{ borderTop: '1px solid var(--outline-variant)' }}
                  >
                    <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2 font-mono text-xs">
                      <Link
                        href={`/admin/job-openings/${o.id}`}
                        className="hover:underline"
                        style={{ color: 'var(--primary)' }}
                      >
                        {o.id}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2 text-xs">
                      {o.status}
                    </td>
                    <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2 text-xs">
                      {o.posting ? (
                        <Link
                          href={`/admin/jobs/job-postings/${o.posting.id}`}
                          className="hover:underline"
                          style={{ color: 'var(--primary)' }}
                        >
                          {o.posting.slug}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--on-surface-variant)' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--on-surface-variant)' }} className="px-3 py-2 text-xs">
                      {o.posting?.status ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section chuyên viên — gate theo canAssign nhưng vẫn render cho read-only */}
      <section
        aria-labelledby="order-recruiters-heading"
        className="mb-8"
        data-testid="order-recruiters-section"
      >
        <h2
          id="order-recruiters-heading"
          style={{ color: 'var(--on-surface)' }}
          className="mb-3 text-lg font-semibold"
        >
          Chuyên viên tuyển dụng ({order.recruiterAssignments.length})
        </h2>
        {order.recruiterAssignments.length === 0 ? (
          <div
            style={{
              background: 'var(--surface-container-lowest)',
              color: 'var(--on-surface-variant)',
              borderColor: 'var(--outline-variant)',
            }}
            className="mb-4 rounded-lg border p-6 text-center text-sm"
          >
            Nhu cầu này chưa có chuyên viên tuyển dụng nào được phân công.
          </div>
        ) : (
          <ul
            data-testid="order-recruiter-list"
            className="mb-4 divide-y rounded-lg border"
            style={{ borderColor: 'var(--outline-variant)' }}
          >
            {order.recruiterAssignments.map((a) => (
              <li
                key={a.id}
                data-testid={`order-recruiter-row-${a.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                style={{ borderColor: 'var(--outline-variant)' }}
              >
                <div>
                  <span style={{ color: 'var(--on-surface)' }} className="font-mono text-xs">
                    {a.recruiterUserId}
                  </span>
                  <span style={{ color: 'var(--on-surface-variant)' }} className="ml-2 text-xs">
                    ({a.status})
                  </span>
                  {a.reason && (
                    <span style={{ color: 'var(--on-surface-variant)' }} className="ml-2 text-xs">
                      — {a.reason}
                    </span>
                  )}
                </div>
                <span style={{ color: 'var(--on-surface-variant)' }} className="text-xs">
                  Phân công: {formatDateTime(a.assignedAt)}
                  {a.revokedAt ? ` · Thu hồi: ${formatDateTime(a.revokedAt)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
        <RecruiterAssignmentManager
          staffingOrderId={order.id}
          canManage={capability.canAssign}
        />
      </section>

      {statusDialog && (
        <ConfirmDialog
          kind={statusDialog}
          orderCode={order.code}
          pending={statusPending}
          error={statusError}
          onConfirm={() => void handleConfirmStatus()}
          onCancel={() => { setStatusDialog(null); setStatusError(null); setStatusIdemKey(null); }}
        />
      )}

      {showEdit && (
        <EditOrderModal
          order={order}
          canEdit={capability.canEdit}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            setFlash({ kind: 'success', text: 'Đã lưu thay đổi. Đang tải lại…' });
            window.location.reload();
          }}
        />
      )}

      {showDelete && (
        <DeleteConfirmDialog
          orderCode={order.code}
          pending={deletePending}
          error={deleteError}
          onConfirm={() => void handleDelete()}
          onCancel={() => { setShowDelete(false); setDeleteError(null); }}
        />
      )}
    </div>
  );
}

/** Pure helper for `crypto.randomUUID()` — wrap with fallback for SSR/test env. */
function cryptoRandomUuid(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback: time + random — chỉ dùng cho client-side idempotency key, không
  // phải crypto-grade. v4-shape.
  const b = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
