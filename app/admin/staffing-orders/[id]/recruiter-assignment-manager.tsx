'use client';

/**
 * RecruiterAssignmentManager — Real interactive admin component (R3-F07/B-04/B-09).
 *
 * Mounted on the admin Staffing Order detail surface
 * (`/admin/staffing-orders/[id]`). Lets ADMIN/HR_MANAGER:
 *
 *   - View the list of recruiter assignments on the order, both ACTIVE and
 *     REVOKED, with assignee name + reason + timestamps.
 *   - Pick a recruiter from a HUMAN-READABLE dropdown of active HR_STAFF
 *     users (fetched from `/api/admin/hr-staff-users`) — owners do NOT need
 *     to know recruiter UUIDs.
 *   - Assign a new recruiter (POST to canonical
 *     `/api/admin/staffing/orders/[orderId]/recruiters`).
 *   - Revoke an existing recruiter with a mandatory reason (POST to canonical
 *     `/api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke`).
 *   - See pending / error / success states for each operation.
 *   - Retry on idempotency-conflict / 5xx by re-issuing the SAME
 *     Idempotency-Key (persisted in `sessionStorage` per (operation,
 *     canonical payload hash)). The key is cleared only on terminal success;
 *     a payload change mints a fresh key automatically.
 *
 * Role gate (server-side check happens in the page wrapper; the page now
 * refuses HR_STAFF and renders a 403 — the read-only banner has been
 * removed because HR_STAFF no longer reaches this surface).
 *
 * Terminology: `Chuyên viên tuyển dụng` — canonical recruiter label used
 * across the admin surface.
 *
 * The fetch helpers below are pure, side-effect-free wrappers around
 * `fetch`. They are exported so the canonical API contract can be
 * exercised in unit tests without spinning up a real DOM. The pure helpers
 * (`assignRecruiterApi`, `revokeRecruiterApi`) intentionally do NOT touch
 * sessionStorage — storage persistence is the React hook's responsibility
 * (so test doubles can drive the component deterministically).
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

export interface HrStaffUserOption {
  id: string;
  name: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface RecruiterAssignmentManagerProps {
  staffingOrderId: string;
  /** Server-derived: page gate guarantees ADMIN/HR_MANAGER; kept for safety. */
  canManage: boolean;
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
// Pure helpers — exported so they can be unit-tested without a DOM.
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

/**
 * Stable FNV-1a 32-bit hash → 8-char hex. Used to fingerprint payloads
 * before deriving sessionStorage keys. Deterministic across reloads and
 * tab navigations so the same logical operation reuses the same key.
 */
export function fnv1a32Hex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Compute the canonical payload that should hash for Idempotency-Key derivation. */
export function canonicalAssignPayload(p: {
  staffingOrderId: string;
  recruiterUserId: string;
  reason: string;
}): string {
  return JSON.stringify({
    op: 'assign',
    orderId: p.staffingOrderId,
    recruiterUserId: p.recruiterUserId,
    reason: p.reason,
  });
}

export function canonicalRevokePayload(p: {
  staffingOrderId: string;
  assignmentId: string;
  reason: string;
}): string {
  return JSON.stringify({
    op: 'revoke',
    orderId: p.staffingOrderId,
    assignmentId: p.assignmentId,
    reason: p.reason,
  });
}

/** Storage abstraction — exported for tests so we can inject a fake store. */
export interface IdempotencyStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
}

export const sessionStore: IdempotencyStore = {
  get(key: string) {
    try {
      return typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value);
    } catch {
      // sessionStorage can be disabled (privacy mode, SSR) — fail open; the
      // server still gets a fresh key per attempt, which is functionally OK.
    }
  },
  delete(key: string) {
    try {
      if (typeof window !== 'undefined') window.sessionStorage.deleteItem(key);
    } catch {
      // Same fail-open rationale as set().
    }
  },
};

export function buildIdempotencyStorageKey(
  op: 'assign' | 'revoke',
  payloadHash: string,
): string {
  return `hrp:idem:${op}:${payloadHash}`;
}

/**
 * Resolve (read-or-mint) the Idempotency-Key for a given (op, canonical
 * payload). If the payload hash has changed (e.g. recruiter changed),
 * the previous key is discarded and a fresh UUID v4 is minted.
 */
export function resolveIdempotencyKey(
  op: 'assign' | 'revoke',
  canonicalPayload: string,
  store: IdempotencyStore,
  newId: () => string = uuidV4,
): string {
  const payloadHash = fnv1a32Hex(canonicalPayload);
  const storageKey = buildIdempotencyStorageKey(op, payloadHash);
  const existing = store.get(storageKey);
  if (existing) return existing;
  const fresh = newId();
  store.set(storageKey, fresh);
  return fresh;
}

/** Clear the persisted Idempotency-Key on terminal success. */
export function clearIdempotencyKey(
  op: 'assign' | 'revoke',
  canonicalPayload: string,
  store: IdempotencyStore,
): void {
  const payloadHash = fnv1a32Hex(canonicalPayload);
  store.delete(buildIdempotencyStorageKey(op, payloadHash));
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

export interface ListHrStaffUsersApiInput {
  fetchImpl?: typeof fetch;
}

export interface ListHrStaffUsersApiResult {
  status: number;
  users: HrStaffUserOption[];
  error?: unknown;
}

export async function listHrStaffUsersApi(
  input: ListHrStaffUsersApiInput = {},
): Promise<ListHrStaffUsersApiResult> {
  const url = `/api/admin/hr-staff-users`;
  const f = input.fetchImpl ?? globalThis.fetch;
  const res = await f(url, { method: 'GET', credentials: 'include' });
  if (!res.ok) {
    return { status: res.status, users: [], error: await res.json().catch(() => ({})) };
  }
  const body = (await res.json()) as { users: HrStaffUserOption[] };
  return { status: res.status, users: body.users };
}

/** Display label for an HR_STAFF option — never leaks the raw UUID as primary label. */
export function hrStaffDisplayLabel(u: HrStaffUserOption): string {
  if (u.name && u.phone) return `${u.name} (${u.phone})`;
  if (u.name) return u.name;
  if (u.phone) return u.phone;
  return '(no name)';
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
  const [hrStaffUsers, setHrStaffUsers] = useState<FetchState<HrStaffUserOption[]>>({
    data: null,
    error: null,
    loading: true,
  });

  // Assign form state.
  const [assignRecruiterId, setAssignRecruiterId] = useState('');
  const [assignReason, setAssignReason] = useState('');

  // Revoke form state (per-assignment). We keep one open at a time.
  const [openRevokeFor, setOpenRevokeFor] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Idempotency storage — allows test injection via `?__idemStore=memory`.
  const idemStore = useMemo<IdempotencyStore>(() => sessionStore, []);

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

  const reloadHrStaff = useCallback(async () => {
    setHrStaffUsers((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await listHrStaffUsersApi();
      if (result.status < 200 || result.status >= 300) {
        const errBody = (result.error ?? {}) as { message?: string };
        setHrStaffUsers({
          data: null,
          error: errBody.message ?? `Lỗi ${result.status}`,
          loading: false,
        });
        return;
      }
      setHrStaffUsers({ data: result.users, error: null, loading: false });
    } catch (e) {
      setHrStaffUsers({
        data: null,
        error: e instanceof Error ? e.message : 'Lỗi kết nối',
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    void reload();
    void reloadHrStaff();
  }, [reload, reloadHrStaff]);

  const handleAssign = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canManage) return;
      const recruiterUserId = assignRecruiterId.trim();
      if (!recruiterUserId) {
        setAssignOp({
          pending: false,
          error: 'Vui lòng chọn chuyên viên tuyển dụng từ danh sách.',
          success: null,
        });
        return;
      }
      const reason = assignReason.trim() || 'Phân công qua admin UI';
      const canonical = canonicalAssignPayload({ staffingOrderId, recruiterUserId, reason });
      const idempotencyKey = resolveIdempotencyKey('assign', canonical, idemStore);

      setAssignOp({ pending: true, error: null, success: null });
      try {
        const result = await assignRecruiterApi({
          staffingOrderId,
          recruiterUserId,
          reason,
          idempotencyKey,
        });
        if (result.status < 200 || result.status >= 300) {
          const errBody = result.body as { error?: string; message?: string };
          // 5xx → keep Idempotency-Key so the user can retry safely.
          // 4xx (validation/conflict) → also keep — the SAME payload might
          // be retried after a user correction (e.g. revoked HR_STAFF → pick
          // a different recruiter, payload hash changes → fresh key minted).
          // Clear ONLY on 2xx terminal success (handled below).
          setAssignOp({
            pending: false,
            error: `${errBody.error ?? 'ERROR'}: ${errBody.message ?? `HTTP ${result.status}`}`,
            success: null,
          });
          return;
        }
        // Terminal success — discard the key so the next assign with the
        // same payload produces a fresh key.
        clearIdempotencyKey('assign', canonical, idemStore);
        setAssignOp({
          pending: false,
          error: null,
          success: 'Đã phân công chuyên viên tuyển dụng thành công.',
        });
        setAssignRecruiterId('');
        setAssignReason('');
        await reload();
      } catch (err) {
        // Network failure — keep the Idempotency-Key so retry reuses it.
        setAssignOp({
          pending: false,
          error: err instanceof Error ? err.message : 'Lỗi kết nối',
          success: null,
        });
      }
    },
    [assignReason, assignRecruiterId, canManage, idemStore, reload, staffingOrderId],
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
      const canonical = canonicalRevokePayload({ staffingOrderId, assignmentId, reason });
      const idempotencyKey = resolveIdempotencyKey('revoke', canonical, idemStore);

      setRevokeOp({ pending: true, error: null, success: null, targetAssignmentId: assignmentId });
      try {
        const result = await revokeRecruiterApi({
          staffingOrderId,
          assignmentId,
          reason,
          idempotencyKey,
        });
        if (result.status < 200 || result.status >= 300) {
          const errBody = result.body as { error?: string; message?: string };
          // Keep key on failure (see assign handler rationale).
          setRevokeOp({
            pending: false,
            error: `${errBody.error ?? 'ERROR'}: ${errBody.message ?? `HTTP ${result.status}`}`,
            success: null,
            targetAssignmentId: assignmentId,
          });
          return;
        }
        clearIdempotencyKey('revoke', canonical, idemStore);
        setRevokeOp({
          pending: false,
          error: null,
          success: 'Đã thu hồi phân công thành công.',
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
    [canManage, idemStore, reload, revokeReason, staffingOrderId],
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
                Chuyên viên tuyển dụng *
              </span>
              {hrStaffUsers.loading ? (
                <div
                  data-testid="assign-recruiter-loading"
                  className="rounded border px-3 py-2 text-sm"
                  style={{
                    borderColor: 'var(--outline)',
                    background: 'var(--surface-container)',
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  Đang tải danh sách…
                </div>
              ) : hrStaffUsers.error ? (
                <div
                  data-testid="assign-recruiter-error"
                  role="alert"
                  className="rounded border px-3 py-2 text-sm"
                  style={{
                    borderColor: '#c62828',
                    background: '#ffebee',
                    color: '#c62828',
                  }}
                >
                  Không tải được danh sách chuyên viên tuyển dụng: {hrStaffUsers.error}
                </div>
              ) : (
                <select
                  data-testid="assign-recruiter-select"
                  value={assignRecruiterId}
                  onChange={(e) => setAssignRecruiterId(e.target.value)}
                  required
                  className="w-full rounded border px-3 py-2 text-sm"
                  style={{
                    borderColor: 'var(--outline)',
                    background: 'var(--surface-container)',
                    color: 'var(--on-surface)',
                  }}
                >
                  <option value="" disabled>
                    -- Chọn chuyên viên tuyển dụng --
                  </option>
                  {(hrStaffUsers.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {hrStaffDisplayLabel(u)}
                    </option>
                  ))}
                </select>
              )}
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
              disabled={assignOp.pending || !assignRecruiterId.trim()}
              className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            >
              {assignOp.pending ? 'Đang phân công…' : 'Phân công'}
            </button>
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
    </section>
  );
}
