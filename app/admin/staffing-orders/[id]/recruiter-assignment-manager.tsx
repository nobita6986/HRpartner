'use client';

/**
 * RecruiterAssignmentManager — Real interactive admin component (R3-F07/B-04).
 *
 * Mounted on the admin Staffing Order detail surface
 * (`/admin/staffing-orders/[id]`). Lets ADMIN/HR_MANAGER:
 *
 *   - View the list of recruiter assignments on the order, both ACTIVE and
 *     REVOKED, with assignee name + reason + timestamps.
 *   - Assign a new recruiter (POST to canonical
 *     `/api/admin/staffing/orders/[orderId]/recruiters`).
 *   - Revoke an existing recruiter with a mandatory reason (POST to canonical
 *     `/api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke`).
 *   - See pending / error / success states for each operation.
 *   - Retry on idempotency-conflict by re-issuing the same key.
 *
 * Role gate (server-side check happens in the page wrapper; client-side this
 * component hides the controls when the actor lacks the `canManage` role).
 *
 * Terminology: `Chuyên viên tuyển dụng` — canonical recruiter label used
 * across the admin surface.
 *
 * The fetch helpers below (`listRecruiterAssignmentsApi`,
 * `assignRecruiterApi`, `revokeRecruiterApi`) are pure, side-effect-free
 * wrappers around `fetch`. They are exported so the canonical API contract
 * can be exercised in unit tests without spinning up a real DOM.
 */

import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type AssignmentStatus = 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';

export interface AssignmentRow {
  id: string;
  staffingOrderId: string;
  recruiterUserId: string;
  recruiterName: string | null;
  status: AssignmentStatus;
  reason: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface RecruiterAssignmentManagerProps {
  staffingOrderId: string;
  /** Server-derived: ADMIN/HR_MANAGER get write controls; HR_STAFF gets read-only. */
  canManage: boolean;
  /** Optional current-user context (for retry key scoping on the client). */
  actorId?: string;
}

interface FetchState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface OperationState {
  pending: boolean;
  error: string | null;
  success: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Pure fetch helpers — exported so they can be unit-tested without a DOM.
// ═══════════════════════════════════════════════════════════════════════════

/** Pure UUID v4 generator. */
export function uuidV4(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(b);
  } else {
    for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  }
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface AssignRecruiterApiInput {
  staffingOrderId: string;
  recruiterUserId: string;
  reason?: string;
  /** Inject for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Inject for tests; defaults to uuidV4. */
  idempotencyKey?: string;
}

export interface AssignRecruiterApiResult {
  status: number;
  body: unknown;
}

/** Build the canonical POST contract for assigning a recruiter to a staffing order. */
export async function assignRecruiterApi(
  input: AssignRecruiterApiInput,
): Promise<AssignRecruiterApiResult> {
  const url = `/api/admin/staffing/orders/${input.staffingOrderId}/recruiters`;
  const f = input.fetchImpl ?? globalThis.fetch;
  const key = input.idempotencyKey ?? uuidV4();
  const res = await f(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': key,
    },
    body: JSON.stringify({
      recruiterUserId: input.recruiterUserId,
      reason: input.reason ?? 'Phân công qua admin UI',
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export interface RevokeRecruiterApiInput {
  staffingOrderId: string;
  assignmentId: string;
  reason: string;
  fetchImpl?: typeof fetch;
  idempotencyKey?: string;
}

/** Build the canonical POST contract for revoking a recruiter assignment. */
export async function revokeRecruiterApi(
  input: RevokeRecruiterApiInput,
): Promise<{ status: number; body: unknown }> {
  const url = `/api/admin/staffing/orders/${input.staffingOrderId}/recruiters/${input.assignmentId}/revoke`;
  const f = input.fetchImpl ?? globalThis.fetch;
  const key = input.idempotencyKey ?? uuidV4();
  const res = await f(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': key,
    },
    body: JSON.stringify({ reason: input.reason }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export interface ListRecruiterAssignmentsApiInput {
  staffingOrderId: string;
  fetchImpl?: typeof fetch;
}

export async function listRecruiterAssignmentsApi(
  input: ListRecruiterAssignmentsApiInput,
): Promise<{ status: number; items: AssignmentRow[]; error?: unknown }> {
  const url = `/api/admin/staffing/orders/${input.staffingOrderId}/recruiters`;
  const f = input.fetchImpl ?? globalThis.fetch;
  const res = await f(url, { method: 'GET', credentials: 'include' });
  if (!res.ok) {
    return { status: res.status, items: [], error: await res.json().catch(() => ({})) };
  }
  const body = (await res.json()) as { items: AssignmentRow[] };
  return { status: res.status, items: body.items };
}

const STATUS_CONFIG: Record<AssignmentStatus, { label: string; bg: string; color: string }> = {
  ACTIVE: { label: 'Đang phụ trách', bg: '#e8f5e9', color: '#197a56' },
  REVOKED: { label: 'Đã thu hồi', bg: '#ffebee', color: '#c62828' },
  SUPERSEDED: { label: 'Đã thay thế', bg: '#fff3e0', color: '#e65100' },
};

function StatusBadge({ status }: { status: AssignmentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#eceff1', color: '#37474f' };
  return (
    <span
      data-testid={`assignment-status-${status.toLowerCase()}`}
      style={{ background: cfg.bg, color: cfg.color }}
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
    >
      {cfg.label}
    </span>
  );
}

export function RecruiterAssignmentManager({
  staffingOrderId,
  canManage,
  actorId,
}: RecruiterAssignmentManagerProps) {
  const [assignments, setAssignments] = useState<FetchState<AssignmentRow[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [assignOp, setAssignOp] = useState<OperationState>({ pending: false, error: null, success: null });
  const [revokeOp, setRevokeOp] = useState<OperationState & { targetAssignmentId: string | null }>({
    pending: false,
    error: null,
    success: null,
    targetAssignmentId: null,
  });

  // Assign form state.
  const [assignRecruiterId, setAssignRecruiterId] = useState('');
  const [assignReason, setAssignReason] = useState('');

  // Revoke form state (per-assignment). We keep one open at a time.
  const [openRevokeFor, setOpenRevokeFor] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const reload = useCallback(async () => {
    setAssignments((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await listRecruiterAssignmentsApi({ staffingOrderId });
      if (result.status < 200 || result.status >= 300) {
        const errBody = (result.error ?? {}) as { message?: string };
        setAssignments({
          data: null,
          error: errBody.message ?? `Lỗi ${result.status}`,
          loading: false,
        });
        return;
      }
      setAssignments({ data: result.items, error: null, loading: false });
    } catch (e) {
      setAssignments({
        data: null,
        error: e instanceof Error ? e.message : 'Lỗi kết nối',
        loading: false,
      });
    }
  }, [staffingOrderId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleAssign = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canManage) return;
      const recruiterUserId = assignRecruiterId.trim();
      if (!recruiterUserId) {
        setAssignOp({ pending: false, error: 'Vui lòng nhập User ID của chuyên viên tuyển dụng.', success: null });
        return;
      }
      setAssignOp({ pending: true, error: null, success: null });
      try {
        const result = await assignRecruiterApi({
          staffingOrderId,
          recruiterUserId,
          reason: assignReason.trim() || 'Phân công qua admin UI',
        });
        if (result.status < 200 || result.status >= 300) {
          const errBody = result.body as { error?: string; message?: string };
          setAssignOp({
            pending: false,
            error: `${errBody.error ?? 'ERROR'}: ${errBody.message ?? `HTTP ${result.status}`}`,
            success: null,
          });
          return;
        }
        setAssignOp({
          pending: false,
          error: null,
          success: `Đã phân công chuyên viên tuyển dụng ${recruiterUserId}.`,
        });
        setAssignRecruiterId('');
        setAssignReason('');
        await reload();
      } catch (err) {
        setAssignOp({
          pending: false,
          error: err instanceof Error ? err.message : 'Lỗi kết nối',
          success: null,
        });
      }
    },
    [assignReason, assignRecruiterId, canManage, reload, staffingOrderId],
  );

  const handleRevoke = useCallback(
    async (assignmentId: string) => {
      if (!canManage) return;
      const reason = revokeReason.trim();
      if (!reason) {
        setRevokeOp({
          pending: false,
          error: 'Vui lòng nhập lý do thu hồi (bắt buộc).',
          success: null,
          targetAssignmentId: assignmentId,
        });
        return;
      }
      setRevokeOp({ pending: true, error: null, success: null, targetAssignmentId: assignmentId });
      try {
        const result = await revokeRecruiterApi({
          staffingOrderId,
          assignmentId,
          reason,
        });
        if (result.status < 200 || result.status >= 300) {
          const errBody = result.body as { error?: string; message?: string };
          setRevokeOp({
            pending: false,
            error: `${errBody.error ?? 'ERROR'}: ${errBody.message ?? `HTTP ${result.status}`}`,
            success: null,
            targetAssignmentId: assignmentId,
          });
          return;
        }
        setRevokeOp({
          pending: false,
          error: null,
          success: `Đã thu hồi phân công ${assignmentId.slice(0, 8)}.`,
          targetAssignmentId: assignmentId,
        });
        setOpenRevokeFor(null);
        setRevokeReason('');
        await reload();
      } catch (err) {
        setRevokeOp({
          pending: false,
          error: err instanceof Error ? err.message : 'Lỗi kết nối',
          success: null,
          targetAssignmentId: assignmentId,
        });
      }
    },
    [canManage, reload, revokeReason, staffingOrderId],
  );

  const activeCount = useMemo(
    () => (assignments.data ?? []).filter((a) => a.status === 'ACTIVE').length,
    [assignments.data],
  );

  return (
    <section
      data-testid="recruiter-assignment-manager"
      className="rounded-lg border p-6"
      style={{ borderColor: 'var(--outline)', background: 'var(--surface-container-lowest)' }}
    >
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>
            Chuyên viên tuyển dụng
          </h2>
          <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Quản lý phân công chuyên viên tuyển dụng cho order này. Đang phụ trách:{' '}
            <span data-testid="active-count" className="font-semibold">
              {activeCount}
            </span>
            .
          </p>
        </div>
        {assignments.loading && (
          <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            Đang tải…
          </span>
        )}
      </header>

      {assignments.error && (
        <div
          data-testid="assignments-error"
          role="alert"
          className="mb-4 rounded border p-3 text-sm"
          style={{ borderColor: '#c62828', background: '#ffebee', color: '#c62828' }}
        >
          {assignments.error}
        </div>
      )}

      {/* List */}
      {assignments.data && assignments.data.length === 0 && (
        <div
          data-testid="assignments-empty"
          className="mb-4 rounded border border-dashed p-4 text-sm"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          Chưa có chuyên viên tuyển dụng nào được phân công cho order này.
        </div>
      )}

      {assignments.data && assignments.data.length > 0 && (
        <ul data-testid="assignments-list" className="mb-6 divide-y">
          {assignments.data.map((a) => (
            <li
              key={a.id}
              data-testid={`assignment-row-${a.id}`}
              className="py-3 flex items-start justify-between gap-4"
              style={{ borderColor: 'var(--outline)' }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: 'var(--on-surface)' }}>
                    {a.recruiterName ?? a.recruiterUserId}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-1 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                  ID: <code className="font-mono">{a.id}</code>
                </div>
                {a.reason && (
                  <div className="mt-1 text-sm" style={{ color: 'var(--on-surface)' }}>
                    Lý do: {a.reason}
                  </div>
                )}
                {a.revokedAt && (
                  <div className="mt-1 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                    Thu hồi lúc: {new Date(a.revokedAt).toLocaleString('vi-VN')}
                  </div>
                )}
              </div>

              {canManage && a.status === 'ACTIVE' && openRevokeFor !== a.id && (
                <button
                  type="button"
                  data-testid={`revoke-open-${a.id}`}
                  onClick={() => {
                    setOpenRevokeFor(a.id);
                    setRevokeReason('');
                    setRevokeOp({ pending: false, error: null, success: null, targetAssignmentId: null });
                  }}
                  className="rounded border px-3 py-1.5 text-sm font-medium"
                  style={{ borderColor: '#c62828', color: '#c62828', background: 'transparent' }}
                >
                  Thu hồi
                </button>
              )}

              {canManage && a.status === 'ACTIVE' && openRevokeFor === a.id && (
                <form
                  data-testid={`revoke-form-${a.id}`}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleRevoke(a.id);
                  }}
                  className="flex flex-col items-end gap-2"
                >
                  <input
                    type="text"
                    data-testid={`revoke-reason-${a.id}`}
                    placeholder="Lý do thu hồi (bắt buộc)"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    required
                    className="rounded border px-3 py-1.5 text-sm"
                    style={{
                      borderColor: 'var(--outline)',
                      background: 'var(--surface-container)',
                      color: 'var(--on-surface)',
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-testid={`revoke-cancel-${a.id}`}
                      onClick={() => {
                        setOpenRevokeFor(null);
                        setRevokeReason('');
                        setRevokeOp({ pending: false, error: null, success: null, targetAssignmentId: null });
                      }}
                      className="rounded border px-3 py-1.5 text-sm"
                      style={{ borderColor: 'var(--outline)' }}
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      data-testid={`revoke-submit-${a.id}`}
                      disabled={revokeOp.pending && revokeOp.targetAssignmentId === a.id}
                      className="rounded px-3 py-1.5 text-sm font-medium disabled:opacity-60"
                      style={{ background: '#c62828', color: '#fff' }}
                    >
                      {revokeOp.pending && revokeOp.targetAssignmentId === a.id ? 'Đang thu hồi…' : 'Xác nhận thu hồi'}
                    </button>
                  </div>
                  {revokeOp.targetAssignmentId === a.id && revokeOp.error && (
                    <div
                      role="alert"
                      data-testid={`revoke-error-${a.id}`}
                      className="rounded border p-2 text-xs"
                      style={{ borderColor: '#c62828', background: '#ffebee', color: '#c62828' }}
                    >
                      {revokeOp.error}
                    </div>
                  )}
                  {revokeOp.targetAssignmentId === a.id && revokeOp.success && (
                    <div
                      data-testid={`revoke-success-${a.id}`}
                      className="rounded border p-2 text-xs"
                      style={{ borderColor: '#197a56', background: '#e8f5e9', color: '#197a56' }}
                    >
                      {revokeOp.success}
                    </div>
                  )}
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Assign form — only when canManage */}
      {canManage && (
        <form
          data-testid="assign-form"
          onSubmit={handleAssign}
          className="mt-2 rounded-lg border p-4"
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container-lowest)' }}
        >
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
            Phân công chuyên viên tuyển dụng mới
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block" style={{ color: 'var(--on-surface)' }}>
                User ID (UUID v4) *
              </span>
              <input
                type="text"
                data-testid="assign-recruiter-id"
                value={assignRecruiterId}
                onChange={(e) => setAssignRecruiterId(e.target.value)}
                placeholder="UUID v4 của chuyên viên tuyển dụng"
                className="w-full rounded border px-3 py-2 text-sm font-mono"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block" style={{ color: 'var(--on-surface)' }}>
                Lý do (tuỳ chọn)
              </span>
              <input
                type="text"
                data-testid="assign-reason"
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                placeholder="VD: Bổ sung cho order backlog"
                className="w-full rounded border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              data-testid="assign-submit"
              disabled={assignOp.pending}
              className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            >
              {assignOp.pending ? 'Đang phân công…' : 'Phân công'}
            </button>
            {actorId && (
              <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                Actor: {actorId}
              </span>
            )}
          </div>
          {assignOp.error && (
            <div
              role="alert"
              data-testid="assign-error"
              className="mt-3 rounded border p-2 text-sm"
              style={{ borderColor: '#c62828', background: '#ffebee', color: '#c62828' }}
            >
              {assignOp.error}
            </div>
          )}
          {assignOp.success && (
            <div
              data-testid="assign-success"
              className="mt-3 rounded border p-2 text-sm"
              style={{ borderColor: '#197a56', background: '#e8f5e9', color: '#197a56' }}
            >
              {assignOp.success}
            </div>
          )}
        </form>
      )}

      {!canManage && (
        <div
          data-testid="readonly-banner"
          className="mt-2 rounded border p-3 text-sm"
          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
        >
          Bạn đang xem ở chế độ chỉ-đọc. Phân công / thu hồi yêu cầu quyền ADMIN hoặc HR_MANAGER.
        </div>
      )}
    </section>
  );
}
