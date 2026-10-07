/**
 * job-posting-error-map.ts — hrp-m2a-operational-ux-debt / F8.
 *
 * Safe-Vietnamese error mapper for the admin JobPosting surface.
 *
 * Goal: never echo a raw developer / DB / API message, UUID, SQL fragment,
 * stack trace or PII to the operator. Each known server / route error code
 * maps to a localized, recovery-oriented message; unknown codes (or null /
 * empty / non-string inputs) collapse to a single generic safe fallback.
 *
 * Origin: HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md §D
 * (Priority 2 — F8) authorizes this module in this round. The integration
 * contract for the T1B-owned editor shell is captured in the HANDOFF
 * (hrp-m2a-operational-ux-debt/HANDOFF.md §6) — the only allowed call site
 * on the editor shell is the existing `readErrorMessage(res)` being replaced
 * by a thin call into `summarizeJobPostingApiError(res.json())`.
 *
 * Mirrors the placement-ui.ts:78-103 pattern (CONFLICT_LABELS table +
 * `conflictLabel(code)` pure function + unknown-code fallback). Repo-owned,
 * no dependency, no I/O, no DOM.
 *
 * @module src/domains/staffing/job-posting-error-map
 */

// ─── Known error codes ────────────────────────────────────────────────────

/**
 * AuthoringError codes that `src/domains/staffing/job-posting-authoring.service.ts`
 * can throw. Each entry here MUST stay byte-stable — the API route at
 * `app/api/admin/jobs/job-postings/[id]/publish/route.ts:98-105` echoes
 * `error.code` straight through; route callers depend on the literal.
 */
export type JobPostingAuthoringErrorCode =
  | 'JOB_OPENING_NOT_OPEN'
  | 'INVALID_STATE_TRANSITION'
  | 'INVALID_REVISION'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'SLUG_COLLISION'
  | 'IDEMPOTENCY_CONFLICT'
  | 'PERMISSION_DENIED';

/**
 * Route-level codes that the POST/PATCH/.../archive route handlers can return
 * (see `app/api/admin/jobs/job-postings/[id]/publish/route.ts` and the
 * idempotency helper at `src/shared/integrity/idempotency`).
 */
export type JobPostingRouteErrorCode =
  | 'IDEMPOTENCY_REQUIRED'
  | 'INTERNAL'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED';

export type JobPostingErrorCode =
  | JobPostingAuthoringErrorCode
  | JobPostingRouteErrorCode
  | string; // open for forward-compat — `jobPostingErrorLabel` falls back safely.

// ─── Localized labels ──────────────────────────────────────────────────────

/**
 * Stable code-to-Vietnamese label map for the admin JobPosting surface.
 * Order is intentional: lifecycle/transition errors first, then revision
 * drift, then idempotency, then transport-level failures.
 *
 * Each label is recovery-oriented (it tells the operator WHAT to do next)
 * and never embeds UUIDs, raw messages, or stack-trace excerpts.
 */
export const JOB_POSTING_ERROR_LABELS: Readonly<Record<string, string>> = Object.freeze({
  // ─── Authoring / lifecycle ──────────────────────────────────────────────
  JOB_OPENING_NOT_OPEN:
    'Đợt tuyển dụng chưa được mở. Hãy mở đợt tuyển dụng trước khi đăng tin.',
  INVALID_STATE_TRANSITION:
    'Tin tuyển dụng đang ở trạng thái không cho phép thao tác này. Hãy tải lại trang rồi thử lại.',
  INVALID_REVISION:
    'Tin tuyển dụng vừa được cập nhật. Hãy tải lại trang rồi lưu lại.',
  INVALID_INPUT: 'Dữ liệu chưa hợp lệ. Hãy kiểm tra tiêu đề và nội dung tin tuyển dụng.',
  NOT_FOUND: 'Không tìm thấy tin tuyển dụng hoặc bạn không có quyền xem.',
  SLUG_COLLISION:
    'Không thể tạo đường dẫn công khai. Hãy đổi tiêu đề rồi lưu lại.',
  IDEMPOTENCY_CONFLICT:
    'Thao tác trước đó chưa hoàn tất. Hãy tải lại trang rồi thử lại.',
  PERMISSION_DENIED: 'Tài khoản hiện tại không có quyền thực hiện thao tác với tin tuyển dụng.',

  // ─── Route / transport ─────────────────────────────────────────────────
  IDEMPOTENCY_REQUIRED:
    'Không thể xác nhận thao tác. Hãy tải lại trang rồi thử lại.',
  INTERNAL:
    'Không thể cập nhật tin tuyển dụng do lỗi hệ thống. Vui lòng thử lại hoặc liên hệ quản trị viên.',
  FORBIDDEN: 'Tài khoản hiện tại không có quyền xem tin tuyển dụng này.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn — hãy đăng nhập lại rồi thử lại.',
});

/**
 * Generic safe fallback for any unknown / unrecognized / null / empty code.
 * Single source of truth — UI MUST display this string verbatim, never
 * fabricate a new generic message. Intentionally explicit so a future
 * PR cannot accidentally diverge.
 */
export const JOB_POSTING_UNKNOWN_ERROR_LABEL =
  'Không thể cập nhật tin tuyển dụng. Vui lòng thử lại hoặc liên hệ quản trị viên.';

// ─── Recovery navigation hints ────────────────────────────────────────────

/**
 * Recovery navigation hints keyed by error code. Only `JOB_OPENING_NOT_OPEN`
 * has a recovery hint today — opening a JobOpening is the one operator action
 * that genuinely unblocks the publish retry. Other codes either have no
 * navigation affordance or are operator-correctable in place (retry / reload).
 *
 * Functions returning `null` mean: stay on the current page, show the label.
 */
export const JOB_POSTING_RECOVERY_HINTS: Readonly<Record<string, string>> = Object.freeze({
  JOB_OPENING_NOT_OPEN: '/admin/job-openings/{{jobOpeningId}}',
});

/**
 * Resolve the recovery href for a known code, interpolating the server-side
 * `jobOpeningId` (UUID) where required. Unknown code → `null`. The returned
 * href is always a repo-local path (no external URL), so it is safe to feed
 * straight into `next/link`.
 */
export function jobPostingRecoveryHref(
  code: string | null | undefined,
  details?: { jobOpeningId?: string | null } | null,
): string | null {
  if (!code) return null;
  const template = JOB_POSTING_RECOVERY_HINTS[code];
  if (!template) return null;
  if (template.includes('{{jobOpeningId}}')) {
    const id = details?.jobOpeningId;
    if (typeof id !== 'string' || id.length === 0) return null;
    // Defensive: UUID-shaped strings only. Anything else is treated as
    // missing — operator stays on the current page.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null;
    }
    return template.replace('{{jobOpeningId}}', id);
  }
  return template;
}

// ─── Pure lookups ────────────────────────────────────────────────────────

/**
 * Map a stable error code to a localized, recovery-oriented Vietnamese label.
 *
 * Contract:
 *  - `code` non-null, non-empty, recognized → return `JOB_POSTING_ERROR_LABELS[code]`.
 *  - `code` null / undefined / empty / non-string / unrecognized →
 *    return `JOB_POSTING_UNKNOWN_ERROR_LABEL` (single source of truth).
 *  - Caller MAY pass `fallback` to override the generic fallback for a
 *    specific caller surface (e.g. the JobPosting editor footer). The
 *    fallback is used ONLY for the unrecognized-code branch — known codes
 *    always return the table value.
 *
 * IMPORTANT: this function must NEVER accept a raw developer / DB message
 * (e.g. `body.message`) and never includes the raw value in its return
 * string. The signature accepts `code` only.
 */
export function jobPostingErrorLabel(
  code: JobPostingErrorCode | null | undefined,
  fallback: string = JOB_POSTING_UNKNOWN_ERROR_LABEL,
): string {
  if (typeof code !== 'string') return fallback;
  const trimmed = code.trim();
  if (trimmed.length === 0) return fallback;
  const known = JOB_POSTING_ERROR_LABELS[trimmed];
  if (typeof known === 'string' && known.length > 0) return known;
  return fallback;
}

// ─── Route envelope composer ─────────────────────────────────────────────

/**
 * Shape of a JSON envelope returned by the `/api/admin/jobs/job-postings/**`
 * routes. Only the fields this mapper reads are typed; everything else is
 * ignored (and never re-emitted by this module).
 */
export interface JobPostingApiErrorEnvelope {
  /** HTTP status from the route handler — used to gate fallback selection. */
  status?: number;
  /** Stable error code echoed by `AuthoringError.code` or route-level wrappers. */
  error?: string | null;
  /** Server-authored free-text — NEVER echoed by this mapper. */
  message?: string;
  /** Server-side structured detail (e.g. `jobOpeningId`). */
  details?: { jobOpeningId?: string | null; [k: string]: unknown } | null;
}

export interface JobPostingApiErrorSummary {
  label: string;
  recoveryHref: string | null;
}

/**
 * Compose a safe `{ label, recoveryHref }` summary from a route JSON envelope.
 *
 * Rules (mirrors the audit decision §F implementation pattern):
 *   - 2xx status → caller MUST NOT call this function (returns the safe
 *     fallback; defensive, not authoritative).
 *   - 4xx / 5xx with a recognized code → return the localized label +
 *     recovery href (when the code has one).
 *   - 4xx / 5xx with an unrecognized / missing code → return the generic
 *     safe fallback; `body.message` is NEVER echoed.
 *   - Unknown / null / undefined envelope → generic safe fallback.
 *
 * IMPORTANT: this function is the ONLY allowed UI entry point on the
 * JobPosting surface. Per the editor-shell integration contract, the
 * editor shell's `readErrorMessage(res)` (currently in
 * `app/admin/jobs/job-postings/[id]/editor-shell.tsx`) is to be replaced
 * by a thin call into this composer; no other UI consumer of the editor
 * surface may bypass this mapper.
 */
export function summarizeJobPostingApiError(
  envelope: JobPostingApiErrorEnvelope | null | undefined,
): JobPostingApiErrorSummary {
  const fallbackLabel = JOB_POSTING_UNKNOWN_ERROR_LABEL;
  if (!envelope || typeof envelope !== 'object') {
    return { label: fallbackLabel, recoveryHref: null };
  }
  const status = typeof envelope.status === 'number' ? envelope.status : 0;
  // 2xx is not an error — caller misuse. Return safe fallback defensively.
  if (status >= 200 && status < 300) {
    return { label: fallbackLabel, recoveryHref: null };
  }
  const label = jobPostingErrorLabel(envelope.error, fallbackLabel);
  const recoveryHref = jobPostingRecoveryHref(envelope.error, envelope.details);
  return { label, recoveryHref };
}