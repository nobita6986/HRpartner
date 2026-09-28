/**
 * recruiter-workbench.placement-actions.states.ts — P1-F1 pure state
 * helpers for the placement action cell (LOCK-02..LOCK-08, LOCK-15, F-06).
 *
 * Lifecycle authority is owned entirely by the F0 routes; this module
 * never derives transition decisions from the wire status. It only:
 *   - enumerates which `PlacementCommandName` is allowed given the row's
 *     `placement` + `placementOptions` + `caseStatus` + `nextAction`
 *     snapshot;
 *   - formats an inline error message from a canonical F0 response envelope;
 *   - gates the "ENABLE EFFECTIVE" rule for HRP-managed placements
 *     (LOCK-15 — server still rejects with `HRP_EFFECTIVE_FORBIDDEN`);
 *   - produces a deterministic payload-hash for the
 *     `sessionStorage.Idempotency-Key` scope (LOCK-13).
 *
 * Pure: no React, no Prisma, no fetches. The render-time helpers
 * (`availableActionsForRow`, `canPerformPlacementAction`) are tested
 * independently in `placement-actions.states.test.ts`.
 */
import type {
  RecruiterWorkbenchRow,
  ServerDerivedNextAction,
} from '@/src/domains/talent/recruiter-workbench.types';
import type { PlacementStatus } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────
// 1. Canonical command name (route dispatch table).
// ─────────────────────────────────────────────────────────────────────────

export type PlacementCommandName =
  | 'placement.create'
  | 'placement.confirm'
  | 'placement.effective'
  | 'placement.fail'
  | 'placement.cancel';

export const PLACEMENT_COMMANDS = [
  'placement.create',
  'placement.confirm',
  'placement.effective',
  'placement.fail',
  'placement.cancel',
] as const satisfies ReadonlyArray<PlacementCommandName>;

export type PlacementCommandPayloadShape =
  | {
      command: 'placement.create';
      placementCaseId: string;
      jobOpeningId: string;
      sourceCandidateSubmissionId?: string;
    }
  | {
      command: 'placement.confirm' | 'placement.fail' | 'placement.cancel';
      placementId: string;
    }
  | {
      command: 'placement.effective';
      placementId: string;
      evidence: {
        clientAcknowledgedAt: string;
        clientAcknowledgedByUserId: string;
        acknowledgementRef: string;
      };
    };

// ─────────────────────────────────────────────────────────────────────────
// 2. Availability matrix (LOCK-02 / LOCK-04 / LOCK-15 / F-06).
// ─────────────────────────────────────────────────────────────────────────

export interface PlacementActionDescriptor {
  command: PlacementCommandName;
  /** Short user-facing label, Vietnamese. */
  label: string;
  /** ARIA intent hint for assistive tech — NEVER used for styling. */
  intent: 'primary' | 'secondary' | 'danger';
}

/**
 * Workflow gate (F-06): placement mutations are only ever offered when
 * the server-derived `nextAction` is `REVIEW_PLACEMENT`. Every other
 * `nextAction` value (`OPEN_INTAKE`, `REQUEST_DOCS`, `SCREEN_SUBMISSION`,
 * `SCHEDULE_SCREEN`, `AWAITING_RESULT`, `NONE`) → empty action list.
 *
 * The server is the canonical authority (it still owns the lifecycle
 * state machine); the UI gate is purely UX.
 */
function isPlacementReadyRow(
  nextAction: ServerDerivedNextAction | null | undefined,
): boolean {
  return nextAction === 'REVIEW_PLACEMENT';
}

/**
 * Pure: given the row + the user's role context, return the ordered list of
 * available actions.
 *
 * Rules:
 *   - caseStatus === 'CLOSED' → no actions (terminal).
 *   - server `nextAction` must be `REVIEW_PLACEMENT` for any mutation
 *     affordance (F-06); otherwise no actions.
 *   - `placement === null` && `placementOptions` has ≥ 1 candidate →
 *     ONLY `placement.create`.
 *   - `placement?.status === 'SELECTED'`:
 *     HRP_MANAGED   → `placement.confirm` + `placement.fail` + `placement.cancel`
 *     CLIENT_MANAGED→ same triplet
 *   - `placement?.status === 'CONFIRMED'`:
 *     HRP_MANAGED   → `placement.fail` + `placement.cancel` (NO EFFECTIVE)
 *     CLIENT_MANAGED→ `placement.effective` + `placement.fail` + `placement.cancel`
 *   - `placement.status ∈ {EFFECTIVE, FAILED, CANCELLED}` → no actions.
 *   - `placement.status === 'SELECTED'` AND `caseStatus !== 'READY_TO_PLACE'`
 *     → locked (read-only) — caller checks `isStalePlacementSnapshot`.
 */
export function availableActionsForRow(
  row: Pick<
    RecruiterWorkbenchRow,
    'caseStatus' | 'placement' | 'placementOptions' | 'nextAction'
  >,
): ReadonlyArray<PlacementActionDescriptor> {
  if (row.caseStatus === 'CLOSED') return [];

  // F-06 workflow gate. Server is authority; this is UX-only.
  if (!isPlacementReadyRow(row.nextAction)) return [];

  const placement = row.placement;

  if (placement == null) {
    const options = row.placementOptions ?? [];
    if (row.caseStatus !== 'READY_TO_PLACE') return [];
    if (options.length === 0) return [];
    return [
      {
        command: 'placement.create',
        label: 'Tạo bố trí',
        intent: 'primary',
      },
    ];
  }

  const status = placement.status;
  const mode = placement.managementMode;

  if (status === 'SELECTED') {
    // LOCK-15 stale-rejection: case not ready → lock the cell.
    if (row.caseStatus !== 'READY_TO_PLACE') return [];
    return [
      { command: 'placement.confirm', label: 'Xác nhận', intent: 'primary' },
      { command: 'placement.fail', label: 'Thất bại', intent: 'danger' },
      { command: 'placement.cancel', label: 'Huỷ', intent: 'secondary' },
    ];
  }

  if (status === 'CONFIRMED') {
    if (mode === 'HRP_MANAGED') {
      // HRP-managed: server forbids EFFECTIVE (C-08). UI hides the
      // button too (LOCK-15) so the row never offers an action that
      // will return 400 INVALID_TRANSITION / HRP_EFFECTIVE_FORBIDDEN.
      return [
        { command: 'placement.fail', label: 'Thất bại', intent: 'danger' },
        { command: 'placement.cancel', label: 'Huỷ', intent: 'secondary' },
      ];
    }
    return [
      {
        command: 'placement.effective',
        label: 'Đánh dấu hiệu lực',
        intent: 'primary',
      },
      { command: 'placement.fail', label: 'Thất bại', intent: 'danger' },
      { command: 'placement.cancel', label: 'Huỷ', intent: 'secondary' },
    ];
  }

  return [];
}

/**
 * Convenience: TRUE iff at least one action is available for the row.
 */
export function canPerformPlacementAction(
  row: Pick<
    RecruiterWorkbenchRow,
    'caseStatus' | 'placement' | 'placementOptions' | 'nextAction'
  >,
): boolean {
  return availableActionsForRow(row).length > 0;
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Inline status label.
// ─────────────────────────────────────────────────────────────────────────

export function formatPlacementStatusVi(
  status: PlacementStatus,
): string {
  switch (status) {
    case 'SELECTED':
      return 'Đã chọn';
    case 'CONFIRMED':
      return 'Đã xác nhận';
    case 'EFFECTIVE':
      return 'Đã hiệu lực';
    case 'FAILED':
      return 'Thất bại';
    case 'CANCELLED':
      return 'Đã huỷ';
    default: {
      const _exhaustive: never = status;
      return String(_exhaustive);
    }
  }
}

export function formatManagementModeVi(
  mode: 'HRP_MANAGED' | 'CLIENT_MANAGED',
): string {
  return mode === 'HRP_MANAGED' ? 'HRP quản lý' : 'Khách hàng quản lý';
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Error formatting (LOCK-07 — safe inline `role="alert"`).
// ─────────────────────────────────────────────────────────────────────────

export interface PlacementErrorEnvelope {
  error?: string;
  message?: string;
}

/**
 * Pure: extract a Vietnamese-safe inline message from a server response.
 *
 * Priority (F-03 / LOCK-09 / RQ-12 / AC-08):
 *   1. 5xx or status=0 (network failure) → fixed generic Vietnamese message
 *      NEVER `envelope.message`, NEVER `Error.message`, NEVER details /
 *      acknowledgementRef / actor / tokens / PII.
 *   2. frozen SAFE_CODE_MESSAGES lookup keyed by canonical `error` code
 *   3. fallback to a generic message keyed by status
 *
 * The returned string is plain text — the caller wraps it in
 * `<p role="alert">…</p>` / `<p role="status">…</p>`.
 */
export const SAFE_CODE_MESSAGES: Readonly<Record<string, string>> = {
  VALIDATION: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại.',
  IDEMPOTENCY_REQUIRED:
    'Thiếu Idempotency-Key — không retry được. Vui lòng tải lại trang.',
  IDEMPOTENCY_CONFLICT:
    'Yêu cầu trùng với thao tác trước nhưng payload khác. Vui lòng tải lại trang.',
  IDEMPOTENCY_KEY_REUSED:
    'Yêu cầu trùng với thao tác trước nhưng payload khác. Vui lòng tải lại trang.',
  NO_TOKEN: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  INVALID_TOKEN: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  USER_INACTIVE: 'Tài khoản đang bị khoá. Vui lòng liên hệ quản trị.',
  USER_NOT_FOUND: 'Không tìm thấy người dùng. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  PLACEMENT_NOT_FOUND:
    'Bố trí không còn tồn tại. Danh sách đã được làm mới.',
  INVALID_STATE_TRANSITION:
    'Trạng thái đã thay đổi — danh sách đã được làm mới.',
  PLACEMENT_VALIDATION_ERROR:
    'Yêu cầu không hợp lệ với trạng thái hiện tại của bố trí.',
  PLACEMENT_IDEMPOTENCY_CONFLICT:
    'Yêu cầu trùng với thao tác trước nhưng payload khác. Vui lòng tải lại trang.',
};

export const SERVER_GENERIC_VI = 'Đã có lỗi máy chủ. Vui lòng thử lại sau.';
export const NETWORK_GENERIC_VI = 'Không thể kết nối máy chủ. Vui lòng thử lại.';
export const GENERIC_FALLBACK_VI = 'Yêu cầu thất bại. Vui lòng thử lại.';

export function formatErrorMessage(
  envelope: PlacementErrorEnvelope | null | undefined,
  status = 0,
  fallback = GENERIC_FALLBACK_VI,
): string {
  // F-03: 5xx or network failure → fixed generic Vietnamese only.
  // We DO NOT consult envelope.message even when it's present.
  if (status >= 500) {
    const code =
      envelope && typeof envelope.error === 'string'
        ? envelope.error.trim()
        : '';
    return SAFE_CODE_MESSAGES[code] ?? SERVER_GENERIC_VI;
  }
  if (status === 0) {
    return NETWORK_GENERIC_VI;
  }
  if (!envelope || typeof envelope !== 'object') return fallback;
  const code = typeof envelope.error === 'string' ? envelope.error.trim() : '';
  const msg = typeof envelope.message === 'string' ? envelope.message.trim() : '';

  if (code === 'UNKNOWN' || code.length === 0) {
    return status > 0
      ? `Yêu cầu thất bại (mã ${status}). Vui lòng thử lại.`
      : fallback;
  }
  const canned = SAFE_CODE_MESSAGES[code];
  if (canned) return canned;
  if (msg.length > 0) return msg;
  return `${code} — ${fallback}`;
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Idempotency-Key scoping (LOCK-13 — raw UUID v4, per-tab sessionStorage).
// ─────────────────────────────────────────────────────────────────────────

/**
 * FNV-1a (32-bit) string hash. Returns a non-negative 32-bit integer
 * as an unsigned hex string (8 chars). Deterministic, dependency-free,
 * fast — adequate to detect "same payload" / "different payload" change.
 *
 * NOT a cryptographic hash. Its only job is to make a sessionStorage key
 * stable across double-click / network retry when the payload is
 * byte-equal, and to mint a fresh key when the payload actually changed.
 */
export function fnv1a32Hex(payload: unknown): string {
  let h = 0x811c9dc5;
  const s = canonicalizePayload(payload);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Deterministic JSON stringification with sorted keys at every depth.
 * `Date` → ISO string; otherwise fall back to JSON with `replacer`.
 */
export function canonicalizePayload(payload: unknown): string {
  return JSON.stringify(payload, (_key, value: unknown) => {
    if (value instanceof Date) return value.toISOString();
    if (value === undefined) return null;
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  });
}

/**
 * Per-tab sessionStorage scoping key (LOCK-13).
 *
 * Format: `hrp.p1f1.idem.<command>.<scope>.<payloadHash>` where:
 *   - `command` is the canonical PlacementCommandName;
 *   - `scope` is the placement/case id (the ONLY mutable-key dimension);
 *   - `payloadHash` is the FNV-1a hash of the canonical payload.
 *
 * Two clicks with the same scope and payload hit the same key (idempotent
 * retry). A payload change mints a fresh key.
 */
export function sessionStorageKeyForPlacementCommand(args: {
  command: PlacementCommandName;
  scope: string;
  payload: unknown;
}): string {
  const hash = fnv1a32Hex(args.payload);
  return `hrp.p1f1.idem.${args.command}.${args.scope}.${hash}`;
}

// ─────────────────────────────────────────────────────────────────────────
// 6. Reconciliation helper — "stale" detection.
// ─────────────────────────────────────────────────────────────────────────

/**
 * TRUE when `placement` exists but the case is in a status that no longer
 * allows transitions on it (e.g. the row's caseStatus is `CLOSED` while
 * `placement.status === 'SELECTED'`). The UI shows an inline alert, NOT
 * a command button — the canonical rule:
 *
 *   "DO NOT call the F0 route when the local snapshot is stale" (LOCK-15).
 */
export function isStalePlacementSnapshot(
  row: Pick<RecruiterWorkbenchRow, 'caseStatus' | 'placement'>,
): boolean {
  if (row.placement == null) return false;
  if (row.placement.status === 'EFFECTIVE') return row.caseStatus !== 'CLOSED';
  if (row.placement.status === 'FAILED') return false;
  if (row.placement.status === 'CANCELLED') return false;
  if (row.caseStatus !== 'READY_TO_PLACE') return true;
  return false;
}
