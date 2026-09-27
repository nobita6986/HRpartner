/**
 * recruiter-workbench.placement-actions.states.ts — P1-F1 pure state
 * helpers for the placement action cell (LOCK-02..LOCK-08, LOCK-15).
 *
 * Lifecycle authority is owned entirely by the F0 routes; this module
 * never derives transition decisions from the wire status. It only:
 *   - enumerates which `PlacementCommandName` is allowed given the row's
 *     `placement` + `placementOptions` + `caseStatus` snapshot;
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
} from '@/src/domains/talent/recruiter-workbench.types';
import type { PlacementStatus } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────
// 1. Canonical command name (route dispatch table).
// ─────────────────────────────────────────────────────────────────────────

/**
 * The 5 F0 mutation endpoints, by canonical name.
 *
 * `placement.create` is the only command that operates WITHOUT an existing
 * placement id — it MUST receive a `caseId + jobOpeningId [+ submissionId]`
 * payload. The other 4 commands operate ON an existing placement id.
 */
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

/**
 * `placement.create` UNLIKE the others — needs a `(caseId, jobOpeningId,
 * sourceCandidateSubmissionId?)` body. The transition commands take `{}`.
 */
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
// 2. Availability matrix (LOCK-02 / LOCK-04 / LOCK-15).
// ─────────────────────────────────────────────────────────────────────────

/**
 * The label + button intent matrix. The UI renders buttons ONLY for the
 * commands returned here; everything else is hidden (LOCK-04).
 */
export interface PlacementActionDescriptor {
  command: PlacementCommandName;
  /** Short user-facing label, Vietnamese. */
  label: string;
  /** ARIA intent hint for assistive tech — NEVER used for styling. */
  intent: 'primary' | 'secondary' | 'danger';
}

/**
 * Pure: given the row + the user's role context, return the ordered list of
 * available actions.
 *
 * Rules:
 *   - CLOSED case → no actions (terminal). Effect: the action cell renders
 *     "—" (LOCK-04 single-row, no bulk).
 *   - caseStatus === 'READY_TO_PLACE' AND placement === null AND
 *     placementOptions has ≥ 1 candidate → ONLY `placement.create`.
 *   - caseStatus === 'READY_TO_PLACE' AND placement !== null AND
 *     placement.status === 'SELECTED':
 *       HRP_MANAGED   → `placement.confirm` + `placement.fail` + `placement.cancel`
 *       CLIENT_MANAGED→ same triplet (HRP only-forbids EFFECTIVE)
 *   - placement.status === 'CONFIRMED':
 *       HRP_MANAGED   → `placement.fail` + `placement.cancel` (NO EFFECTIVE)
 *       CLIENT_MANAGED→ `placement.effective` + `placement.fail` + `placement.cancel`
 *   - placement.status ∈ {EFFECTIVE, FAILED, CANCELLED} → no actions (terminal).
 *   - placement.status === 'SELECTED' AND caseStatus !== 'READY_TO_PLACE' →
 *     locked (read-only). User sees an inline alert; UI does NOT surface
 *     command buttons (LOCK-15 stale-rejection rule).
 */
export function availableActionsForRow(
  row: Pick<
    RecruiterWorkbenchRow,
    'caseStatus' | 'placement' | 'placementOptions'
  >,
): ReadonlyArray<PlacementActionDescriptor> {
  const placement = row.placement;
  const caseStatus = row.caseStatus;

  // Terminal case → no actions.
  if (caseStatus === 'CLOSED') return [];

  // Treat `undefined` (DTO not yet projected) the same as `null`.
  if (placement == null) {
    // No placement yet — only viable action is create.
    const options = row.placementOptions ?? [];
    if (caseStatus !== 'READY_TO_PLACE') return [];
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
    if (caseStatus !== 'READY_TO_PLACE') return [];
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

  // EFFECTIVE / FAILED / CANCELLED → terminal placement → no actions.
  return [];
}

/**
 * Convenience: TRUE iff at least one action is available for the row.
 * Used by `PlacementActionCell` to decide between the action chip and the
 * "—" sentinel.
 */
export function canPerformPlacementAction(
  row: Pick<
    RecruiterWorkbenchRow,
    'caseStatus' | 'placement' | 'placementOptions'
  >,
): boolean {
  return availableActionsForRow(row).length > 0;
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Inline status label.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Pure: format the placement's status into a short Vietnamese chip label.
 * Used by the action cell to show the current placement status when no
 * mutation is possible (e.g. terminal placement on a non-CLOSED case).
 */
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
      // Defensive: an unknown enum value MUST still render — never
      // throw inside a render path.
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
 * Priority:
 *   1. `envelope.message` if present and non-empty (already Vietnamese-friendly).
 *   2. Fallback to `envelope.error` code in parens if message absent.
 *   3. Final fallback to a generic message so the inline alert NEVER crashes
 *      the row.
 *
 * The returned string is plain text — the caller wraps it in
 * `<p role="alert">…</p>` / `<p role="status">…</p>`. No HTML ever leaks
 * into this channel.
 */
export function formatErrorMessage(
  envelope: PlacementErrorEnvelope | null | undefined,
  fallback = 'Yêu cầu thất bại. Vui lòng thử lại.',
): string {
  if (!envelope || typeof envelope !== 'object') return fallback;
  const msg = typeof envelope.message === 'string' ? envelope.message.trim() : '';
  if (msg.length > 0) return msg;
  const code = typeof envelope.error === 'string' ? envelope.error.trim() : '';
  if (code.length > 0) return `${code} — ${fallback}`;
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Idempotency-Key scoping (LOCK-13 — raw UUID v4, per-tab sessionStorage).
// ─────────────────────────────────────────────────────────────────────────

/**
 * FNV-1a (32-bit) string hash. Returns a non-negative 32-bit integer
 * as an unsigned hex string (8 chars). Deterministic, dependency-free,
 * fast — adequate to detect "same payload" / "different payload" change.
 *
 * NOTE: This is NOT a cryptographic hash. Its only job is to make a
 * sessionStorage key stable across double-click / network retry when
 * the payload is byte-equal, and to mint a fresh key when the payload
 * actually changed. Cryptographic strength is the server-side
 * `Idempotency-Key` header's job, not this hash's.
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
 * Used as input to `fnv1a32Hex`. `Date` → ISO string; otherwise fall back
 * to JSON with `replacer`.
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
 * retry). A payload change mints a fresh key. The router's
 * `sessionStorage` API scopes every key to the tab — they cannot leak
 * across windows or sessions.
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
  if (row.placement.status === 'FAILED') return false; // FAILED is terminal & does not gate the case
  if (row.placement.status === 'CANCELLED') return false;
  // SELECTED / CONFIRMED → requires caseStatus = READY_TO_PLACE.
  if (row.caseStatus !== 'READY_TO_PLACE') return true;
  return false;
}
