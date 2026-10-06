'use client';

/**
 * project-detail-client.tsx — T1A PRE-P2 PROJECT MANAGEMENT HOTFIX.
 *
 * Client Component cho trang quản trị Dự án (`/admin/projects/[id]`).
 *
 * Tổng quan (RQ-01..RQ-08):
 *   - Hiển thị thông tin Dự án + chỉ tiêu (Đơn ứng tuyển, Phân công người
 *     lao động, Địa điểm).
 *   - Danh sách Nhu cầu tuyển dụng (mỗi item link tới /admin/staffing-orders/[id]).
 *   - Danh sách Vị trí cần tuyển (JobOpenings) — chỉ link khi route
 *     /admin/job-openings/[id] thực sự tồn tại (T0 §B.2; route đã tồn tại
 *     trong repo).
 *   - Capability do Server Component derive: ẩn nút / ẩn modal nếu role
 *     không thuộc capability set.
 *   - Thao tác:
 *       1. Sửa dự án     — `canEdit`.
 *       2. Kích hoạt/Tạm dừng — `canChangeStatus` + transition hợp lệ.
 *       3. Hoàn thành dự án — `canChangeStatus`.
 *       4. Huỷ dự án      — `canChangeStatus`.
 *       5. Xoá vĩnh viễn  — `canDelete` (ADMIN only).
 *   - COMPLETED / CANCELLED là terminal ⇒ toolbar chuyển trạng thái ẩN.
 *
 * Toàn bộ copy tiếng Việt; không dịch mã/ID do người dùng nhập.
 */

import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/src/shared/ui/status-badge';
import {
  PROJECT_MODULE,
  projectStatusLabel,
  projectStatusTone,
} from '@/src/domains/projects/project-ui';
import { roleLabel } from '@/src/shared/i18n/role-labels';
import { projectPublishColumnLabel, projectPublishColumnTone } from '@/src/domains/projects/project-ui';

// ─── Public DTOs (mirror server) ──────────────────────────────────────────

export interface ProjectDetailStaffingOrderDto {
  id: string;
  code: string;
  title: string;
  status: string;
  slots: { id: string; positionTitle: string; jobOpeningId: string | null }[];
}

export interface ProjectDetailJobOpeningDto {
  id: string;
  positionTitle: string;
  sourceOrderCode: string;
}

export interface ProjectManagementViewDto {
  id: string;
  code: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  siteAddress: string | null;
  quota: number;
  filled: number;
  version: number;
  isPublic: boolean;
  clientCompany: { id: string; name: string };
  staffingOrders: ProjectDetailStaffingOrderDto[];
  metrics: {
    assignmentsCount: number;
    submissionsCount: number;
    sitesCount: number;
  };
}

export interface ProjectCapability {
  /** Có quyền xem (mirror GET authority). */
  canView: boolean;
  /** Sửa dự án (mirror PUT ADMIN_ROLES). */
  canEdit: boolean;
  /** Chuyển trạng thái (mirror PATCH ADMIN_ROLES). */
  canChangeStatus: boolean;
  /** Xoá vĩnh viễn (ADMIN only). */
  canDelete: boolean;
}

export interface ProjectDetailClientProps {
  project: ProjectManagementViewDto;
  capability: ProjectCapability;
  role: string;
  /** Từ server: role hiện tại có quyền truy cập tới /admin/job-openings/[id]
   * hay không (T0 §B.2 — không tạo link chết). */
  jobOpeningDetailRouteExists: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────

/** State machine — mirror service `project-management.service.ts`. */
const VALID_TRANSITIONS: Readonly<
  Record<string, ReadonlyArray<'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'>>
> = {
  DRAFT: ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
  ACTIVE: ['DRAFT', 'PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

type StatusAction = 'ACTIVATE' | 'SUSPEND' | 'COMPLETE' | 'CANCEL';

const ACTION_META: Readonly<
  Record<
    StatusAction,
    { label: string; target: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'; tone: 'primary' | 'danger'; confirmTitle: string; confirmBody: string; confirmLabel: string }
  >
> = {
  ACTIVATE: {
    label: 'Kích hoạt dự án',
    target: 'ACTIVE',
    tone: 'primary',
    confirmTitle: 'Kích hoạt dự án?',
    confirmBody: 'Dự án sẽ chuyển sang trạng thái "Hoạt động" và tiếp tục nhận đơn ứng tuyển.',
    confirmLabel: 'Kích hoạt',
  },
  SUSPEND: {
    label: 'Tạm dừng dự án',
    target: 'PAUSED',
    tone: 'primary',
    confirmTitle: 'Tạm dừng dự án?',
    confirmBody: 'Dự án sẽ chuyển sang trạng thái "Tạm dừng". Có thể kích hoạt lại sau.',
    confirmLabel: 'Tạm dừng',
  },
  COMPLETE: {
    label: 'Hoàn thành dự án',
    target: 'COMPLETED',
    tone: 'danger',
    confirmTitle: 'Hoàn thành dự án?',
    confirmBody: 'Dự án sẽ chuyển sang trạng thái kết thúc "Hoàn thành". Không thể chuyển ngược trạng thái sau khi xác nhận.',
    confirmLabel: 'Hoàn thành',
  },
  CANCEL: {
    label: 'Huỷ dự án',
    target: 'CANCELLED',
    tone: 'danger',
    confirmTitle: 'Huỷ dự án?',
    confirmBody: 'Dự án sẽ chuyển sang trạng thái kết thúc "Đã huỷ". Không thể chuyển ngược trạng thái sau khi xác nhận. Dự án có dữ liệu nghiệp vụ phát sinh sẽ không thể xoá vĩnh viễn — hãy dùng "Huỷ dự án" để giữ lại lịch sử.',
    confirmLabel: 'Huỷ dự án',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

function cryptoRandomUuid(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function describeErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === 'object') {
    const j = json as { message?: unknown; error?: unknown };
    if (typeof j.message === 'string' && j.message.trim()) return j.message;
    if (typeof j.error === 'string' && j.error.trim()) return j.error;
  }
  return fallback;
}

// ─── Edit modal (project + status) ────────────────────────────────────────

interface EditProjectModalProps {
  project: ProjectManagementViewDto;
  clientCompanies: Array<{ id: string; name: string; code: string }>;
  onClose: () => void;
  onSaved: () => void;
}

function EditProjectModal({ project, clientCompanies, onClose, onSaved }: EditProjectModalProps) {
  const [name, setName] = useState(project.name);
  const [clientCompanyId, setClientCompanyId] = useState(project.clientCompany.id);
  const [startDate, setStartDate] = useState(project.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState(
    project.endDate ? project.endDate.slice(0, 10) : '',
  );
  const [status, setStatus] = useState<string>(project.status);
  const [quota, setQuota] = useState<string>(
    project.quota === 0 ? '' : String(project.quota),
  );
  const [siteAddress, setSiteAddress] = useState(project.siteAddress ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientCompanyId || !startDate) {
      setErr('Điền đầy đủ các trường bắt buộc.');
      return;
    }
    const quotaText = quota.trim();
    const quotaNumber = quotaText === '' ? 0 : Number(quotaText);
    if (!Number.isInteger(quotaNumber) || quotaNumber < 0) {
      setErr('Chỉ tiêu nhân sự phải là số nguyên không âm.');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        clientCompanyId,
        startDate,
        status,
        quota: quotaNumber,
        siteAddress: siteAddress.trim() || null,
      };
      if (endDate) {
        body.endDate = endDate;
      } else {
        body.endDate = null;
      }
      const r = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(describeErrorMessage(d, `Lỗi ${r.status}`));
        return;
      }
      onSaved();
      onClose();
    } catch {
      setErr('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-project-title"
      data-testid="edit-project-modal"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface-container-lowest)' }}
        className="w-full max-w-lg rounded-lg border p-6 shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2
          id="edit-project-title"
          style={{ color: 'var(--on-surface)' }}
          className="mb-4 text-lg font-semibold"
        >
          Sửa dự án
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
              Tên dự án *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm"
              required
              data-testid="edit-name-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
              Khách hàng *
            </label>
            <select
              value={clientCompanyId}
              onChange={(e) => setClientCompanyId(e.target.value)}
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm"
              required
            >
              {clientCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                Ngày bắt đầu *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                Ngày kết thúc
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                className="w-full rounded border px-3 py-2 text-sm"
                data-testid="edit-end-date-input"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
              Trạng thái
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm"
            >
              {['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>
                  {projectStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
              Chỉ tiêu nhân sự (quota)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              placeholder="VD: 20"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
              Địa chỉ công trường
            </label>
            <input
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="VD: KCN Yên Phong, Bắc Ninh"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          {err && (
            <p role="alert" style={{ color: 'var(--error)' }} className="text-sm" data-testid="edit-error">
              {err}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
              className="rounded px-4 py-2 text-sm"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-testid="edit-submit"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
              className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm dialog cho state transitions ─────────────────────────────────

function StatusConfirmDialog({
  meta,
  projectCode,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  meta: (typeof ACTION_META)[StatusAction];
  projectCode: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-status-confirm-title"
      data-testid="project-status-confirm"
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
          id="project-status-confirm-title"
          style={{ color: 'var(--on-surface)' }}
          className="text-lg font-semibold"
        >
          {meta.confirmTitle}
        </h2>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-2 text-sm">
          {meta.confirmBody}
        </p>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs font-mono">
          {projectCode}
        </p>
        {error && (
          <p
            role="alert"
            data-testid="project-status-confirm-error"
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
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
            className="rounded px-4 py-2 text-sm disabled:opacity-50"
            data-testid="project-status-cancel"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            data-testid="project-status-submit"
            style={{
              background: meta.tone === 'danger' ? '#c62828' : 'var(--primary)',
              color: '#fff',
            }}
            className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {pending ? 'Đang xử lý…' : meta.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────────

function DeleteConfirmDialog({
  projectCode,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  projectCode: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-delete-title"
      data-testid="project-delete-confirm"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        style={{ background: 'var(--surface-container-lowest)' }}
        className="w-full max-w-md rounded-lg border p-6 shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id="project-delete-title" style={{ color: '#c62828' }} className="text-lg font-semibold">
          Xoá vĩnh viễn dự án?
        </h2>
        <p style={{ color: 'var(--on-surface)' }} className="mt-2 text-sm">
          Hành động này <strong>không thể hoàn tác</strong>. Dự án sẽ bị xoá
          vĩnh viễn khỏi hệ thống. Nếu dự án đã có nhu cầu tuyển dụng, đơn
          ứng tuyển, phân công người lao động hoặc địa điểm công trường, hệ
          thống sẽ từ chối. Khi đó hãy dùng &quot;Hoàn thành dự án&quot; hoặc
          &quot;Huỷ dự án&quot; thay thế để giữ lại lịch sử.
        </p>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs font-mono">
          {projectCode}
        </p>
        {error && (
          <p
            role="alert"
            data-testid="project-delete-error"
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
            data-testid="project-delete-cancel"
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
            className="rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            data-testid="project-delete-submit"
            style={{ background: '#c62828', color: '#fff' }}
            className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {pending ? 'Đang xoá…' : 'Xoá vĩnh viễn'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

type Flash = { kind: 'success' | 'error'; text: string } | null;
type DialogState = { kind: 'edit' } | { kind: 'status'; action: StatusAction } | { kind: 'delete' } | null;

export function ProjectDetailClient({
  project,
  capability,
  role,
  jobOpeningDetailRouteExists,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [statusPending, setStatusPending] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusIdemKey, setStatusIdemKey] = useState<string | null>(null);
  const [deleteIdemKey, setDeleteIdemKey] = useState<string | null>(null);
  const [clientCompanies, setClientCompanies] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [flash, setFlash] = useState<Flash>(null);

  // Load client companies for edit modal.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/clients?take=100');
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) {
          setClientCompanies(d.clients ?? []);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset flash when navigating between project ids.
  useEffect(() => {
    setFlash(null);
    setDialog(null);
    setStatusError(null);
    setDeleteError(null);
  }, [project.id]);

  // Aggregate job openings from staffingOrders (deduplicated by jobOpeningId).
  const jobOpenings = useMemo<ProjectDetailJobOpeningDto[]>(() => {
    const map = new Map<string, ProjectDetailJobOpeningDto>();
    for (const so of project.staffingOrders) {
      for (const slot of so.slots) {
        if (slot.jobOpeningId) {
          if (!map.has(slot.jobOpeningId)) {
            map.set(slot.jobOpeningId, {
              id: slot.jobOpeningId,
              positionTitle: slot.positionTitle,
              sourceOrderCode: so.code,
            });
          }
        }
      }
    }
    return Array.from(map.values());
  }, [project.staffingOrders]);

  // Available status transition actions.
  const transitionActions = useMemo<StatusAction[]>(() => {
    const allowed = VALID_TRANSITIONS[project.status] ?? [];
    const out: StatusAction[] = [];
    for (const target of allowed) {
      if (target === 'ACTIVE') out.push('ACTIVATE');
      else if (target === 'PAUSED') out.push('SUSPEND');
      else if (target === 'COMPLETED') out.push('COMPLETE');
      else if (target === 'CANCELLED') out.push('CANCEL');
    }
    return out;
  }, [project.status]);

  // ── Status transition handler ──────────────────────────────────────────
  const openStatusDialog = useCallback(
    (action: StatusAction) => {
      setDialog({ kind: 'status', action });
      setStatusError(null);
      setStatusIdemKey(cryptoRandomUuid());
    },
    [],
  );

  const handleStatusConfirm = useCallback(async () => {
    if (!dialog || dialog.kind !== 'status') return;
    const target = ACTION_META[dialog.action].target;
    const key = statusIdemKey ?? cryptoRandomUuid();
    if (!statusIdemKey) setStatusIdemKey(key);
    setStatusPending(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-idempotency-key': key,
        },
        body: JSON.stringify({ status: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusError(describeErrorMessage(data, `HTTP ${res.status}`));
        return;
      }
      setDialog(null);
      setStatusIdemKey(null);
      setFlash({
        kind: 'success',
        text: `Đã chuyển dự án sang trạng thái "${projectStatusLabel(target)}".`,
      });
      router.refresh();
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Lỗi kết nối máy chủ.');
    } finally {
      setStatusPending(false);
    }
  }, [dialog, project.id, statusIdemKey, router]);

  // ── Delete handler ────────────────────────────────────────────────────
  const openDeleteDialog = useCallback(() => {
    setDialog({ kind: 'delete' });
    setDeleteError(null);
    setDeleteIdemKey(cryptoRandomUuid());
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDialog(null);
    setDeleteError(null);
    setDeleteIdemKey(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteIdemKey) {
      setDeleteError('Thiếu khoá định danh yêu cầu. Hãy mở lại hộp thoại xác nhận.');
      return;
    }
    setDeletePending(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-idempotency-key': deleteIdemKey },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(describeErrorMessage(data, `HTTP ${res.status}`));
        return;
      }
      window.location.href = '/admin/projects';
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Lỗi kết nối máy chủ.');
    } finally {
      setDeletePending(false);
    }
  }, [project.id, deleteIdemKey]);

  const showReadonlyBanner = capability.canView && !capability.canEdit;

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10" style={{ background: 'var(--surface)' }}>
      <div className="mb-4">
        <Link
          href="/admin/projects"
          style={{ color: 'var(--on-surface-variant)' }}
          className="text-xs hover:underline"
        >
          ← Danh sách dự án
        </Link>
      </div>

      <header className="mb-6" data-testid="project-header">
        <div className="flex flex-wrap items-baseline gap-3">
          <span
            data-testid="project-code"
            style={{ color: 'var(--primary)' }}
            className="font-mono text-sm"
          >
            {project.code}
          </span>
          <h1
            data-testid="project-name"
            style={{ color: 'var(--on-surface)' }}
            className="text-3xl font-semibold"
          >
            {project.name}
          </h1>
          <StatusBadge
            module={PROJECT_MODULE}
            status={project.status}
            tone={projectStatusTone(project.status)}
            testId={`project-status-badge-${project.id}`}
          >
            {projectStatusLabel(project.status)}
          </StatusBadge>
          <StatusBadge
            module={PROJECT_MODULE}
            status={projectPublishColumnLabel(project.isPublic, project.status)}
            tone={projectPublishColumnTone(project.isPublic, project.status)}
            testId={`project-publish-badge-${project.id}`}
          >
            {projectPublishColumnLabel(project.isPublic, project.status)}
          </StatusBadge>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt style={{ color: 'var(--on-surface-variant)' }} className="text-xs">Khách hàng</dt>
            <dd style={{ color: 'var(--on-surface)' }} data-testid="project-client">
              <Link href={`/admin/clients/${project.clientCompany.id}`} className="hover:underline">
                {project.clientCompany.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt style={{ color: 'var(--on-surface-variant)' }} className="text-xs">Ngày bắt đầu</dt>
            <dd style={{ color: 'var(--on-surface)' }} data-testid="project-start-date">
              {formatDate(project.startDate)}
            </dd>
          </div>
          <div>
            <dt style={{ color: 'var(--on-surface-variant)' }} className="text-xs">Ngày kết thúc</dt>
            <dd style={{ color: 'var(--on-surface)' }} data-testid="project-end-date">
              {formatDate(project.endDate)}
            </dd>
          </div>
          <div>
            <dt style={{ color: 'var(--on-surface-variant)' }} className="text-xs">Địa chỉ công trường</dt>
            <dd style={{ color: 'var(--on-surface)' }} data-testid="project-site-address">
              {project.siteAddress ?? '—'}
            </dd>
          </div>
        </dl>
        {showReadonlyBanner && (
          <div
            data-testid="project-readonly-banner"
            className="mt-4 rounded border px-3 py-2 text-xs"
            style={{
              background: 'var(--surface-container)',
              color: 'var(--on-surface-variant)',
              borderColor: 'var(--outline-variant)',
            }}
          >
            Chế độ chỉ đọc — vai trò <span>{roleLabel(role)}</span> có quyền xem
            nhưng không thể thao tác trên dự án.
          </div>
        )}
      </header>

      {flash && (
        <div
          role="status"
          data-testid={`project-flash-${flash.kind}`}
          className="mb-4 rounded border p-3 text-sm"
          style={{
            background: flash.kind === 'success' ? '#e8f5e9' : '#ffebee',
            color: flash.kind === 'success' ? '#197a56' : '#c62828',
            borderColor: flash.kind === 'success' ? '#197a56' : '#c62828',
          }}
        >
          {flash.text}
        </div>
      )}

      {/* Toolbar */}
      {(capability.canEdit || capability.canChangeStatus || capability.canDelete) && (
        <section
          data-testid="project-toolbar"
          aria-label="Thao tác quản lý dự án"
          className="mb-6 flex flex-wrap items-center gap-2"
        >
          {capability.canEdit && (
            <button
              type="button"
              data-testid="project-toolbar-edit"
              onClick={() => setDialog({ kind: 'edit' })}
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
              className="rounded px-4 py-2 text-sm font-semibold"
            >
              Sửa dự án
            </button>
          )}

          {capability.canChangeStatus &&
            transitionActions.map((action) => {
              const meta = ACTION_META[action];
              return (
                <button
                  key={action}
                  type="button"
                  data-testid={`project-toolbar-${action.toLowerCase()}`}
                  onClick={() => openStatusDialog(action)}
                  style={
                    meta.tone === 'danger'
                      ? { borderColor: '#c62828', color: '#c62828', background: 'transparent' }
                      : { background: 'var(--surface-container)', color: 'var(--on-surface)' }
                  }
                  className="rounded border px-4 py-2 text-sm"
                >
                  {meta.label}
                </button>
              );
            })}

          {capability.canDelete && (
            <button
              type="button"
              data-testid="project-toolbar-delete"
              onClick={openDeleteDialog}
              style={{ borderColor: '#c62828', color: '#c62828', background: 'transparent' }}
              className="ml-auto rounded border px-4 py-2 text-sm"
            >
              Xoá vĩnh viễn
            </button>
          )}
        </section>
      )}

      {/* Metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3" data-testid="project-metrics">
        <MetricCard label="Đơn ứng tuyển" value={project.metrics.submissionsCount} testId="metric-submissions" />
        <MetricCard label="Phân công người lao động" value={project.metrics.assignmentsCount} testId="metric-assignments" />
        <MetricCard label="Địa điểm công trường" value={project.metrics.sitesCount} testId="metric-sites" />
      </div>

      {/* Staffing Orders (Nhu cầu tuyển dụng) */}
      <section aria-labelledby="project-orders-heading" className="mb-8" data-testid="project-orders-section">
        <h2
          id="project-orders-heading"
          style={{ color: 'var(--on-surface)' }}
          className="mb-3 text-lg font-semibold"
        >
          Nhu cầu tuyển dụng ({project.staffingOrders.length})
        </h2>
        {project.staffingOrders.length === 0 ? (
          <div
            style={{
              background: 'var(--surface-container-lowest)',
              color: 'var(--on-surface-variant)',
              borderColor: 'var(--outline-variant)',
            }}
            className="rounded-lg border p-6 text-center text-sm"
          >
            Dự án này chưa có nhu cầu tuyển dụng nào.
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
                  {['Mã', 'Tiêu đề', 'Trạng thái', 'Vị trí cần tuyển', 'Hành động'].map((h) => (
                    <th
                      key={h}
                      style={{ color: 'var(--on-surface-variant)' }}
                      className="px-3 py-2 text-left font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {project.staffingOrders.map((so) => (
                  <tr
                    key={so.id}
                    data-testid={`project-order-row-${so.id}`}
                    style={{ borderTop: '1px solid var(--outline-variant)' }}
                  >
                    <td style={{ color: 'var(--on-surface-variant)' }} className="px-3 py-2 font-mono text-xs">
                      {so.code}
                    </td>
                    <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2">
                      {so.title}
                    </td>
                    <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2 text-xs">
                      {so.status}
                    </td>
                    <td style={{ color: 'var(--on-surface-variant)' }} className="px-3 py-2 text-xs">
                      {so.slots.length}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <Link
                        href={`/admin/staffing-orders/${so.id}`}
                        data-testid={`project-order-link-${so.id}`}
                        style={{ color: 'var(--primary)' }}
                        className="hover:underline"
                      >
                        Mở chi tiết →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Job Openings (Vị trí cần tuyển) — chỉ link nếu route thực sự tồn tại */}
      <section aria-labelledby="project-openings-heading" className="mb-8" data-testid="project-openings-section">
        <h2
          id="project-openings-heading"
          style={{ color: 'var(--on-surface)' }}
          className="mb-3 text-lg font-semibold"
        >
          Vị trí cần tuyển ({jobOpenings.length})
        </h2>
        {jobOpenings.length === 0 ? (
          <div
            style={{
              background: 'var(--surface-container-lowest)',
              color: 'var(--on-surface-variant)',
              borderColor: 'var(--outline-variant)',
            }}
            className="rounded-lg border p-6 text-center text-sm"
          >
            Dự án này chưa có vị trí cần tuyển nào liên kết.
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
                    Mã vị trí
                  </th>
                  <th
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="px-3 py-2 text-left font-semibold"
                  >
                    Tên vị trí
                  </th>
                  <th
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="px-3 py-2 text-left font-semibold"
                  >
                    Nhu cầu tuyển dụng
                  </th>
                  <th
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="px-3 py-2 text-left font-semibold"
                  >
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobOpenings.map((op) => (
                  <tr
                    key={op.id}
                    data-testid={`project-opening-row-${op.id}`}
                    style={{ borderTop: '1px solid var(--outline-variant)' }}
                  >
                    <td style={{ color: 'var(--on-surface-variant)' }} className="px-3 py-2 font-mono text-xs">
                      {op.id}
                    </td>
                    <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2">
                      {op.positionTitle}
                    </td>
                    <td style={{ color: 'var(--on-surface-variant)' }} className="px-3 py-2 font-mono text-xs">
                      {op.sourceOrderCode}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {jobOpeningDetailRouteExists ? (
                        <Link
                          href={`/admin/job-openings/${op.id}`}
                          data-testid={`project-opening-link-${op.id}`}
                          style={{ color: 'var(--primary)' }}
                          className="hover:underline"
                        >
                          Mở chi tiết →
                        </Link>
                      ) : (
                        <span
                          data-testid={`project-opening-no-link-${op.id}`}
                          style={{ color: 'var(--on-surface-variant)' }}
                        >
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialog?.kind === 'edit' && (
        <EditProjectModal
          project={project}
          clientCompanies={clientCompanies}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setFlash({ kind: 'success', text: 'Đã lưu thay đổi. Đang tải lại…' });
            router.refresh();
          }}
        />
      )}

      {dialog?.kind === 'status' && (
        <StatusConfirmDialog
          meta={ACTION_META[dialog.action]}
          projectCode={project.code}
          pending={statusPending}
          error={statusError}
          onConfirm={() => void handleStatusConfirm()}
          onCancel={() => {
            setDialog(null);
            setStatusError(null);
            setStatusIdemKey(null);
          }}
        />
      )}

      {dialog?.kind === 'delete' && (
        <DeleteConfirmDialog
          projectCode={project.code}
          pending={deletePending}
          error={deleteError}
          onConfirm={() => void handleDelete()}
          onCancel={closeDeleteDialog}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value, testId }: { label: string; value: number; testId?: string }) {
  return (
    <div
      data-testid={testId}
      className="rounded-lg border p-4"
      style={{
        borderColor: 'var(--outline-variant)',
        backgroundColor: 'var(--surface-container-lowest)',
      }}
    >
      <div className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold" style={{ color: 'var(--on-surface)' }}>
        {value.toLocaleString('vi-VN')}
      </div>
    </div>
  );
}