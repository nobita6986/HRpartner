/**
 * recruiter-workbench.placement-actions.fetch.ts — P1-F1 client fetch
 * wrapper for the 5 F0 placement mutation routes.
 *
 * LOCK-05: client NEVER POSTs without an Idempotency-Key header (UUID v4).
 * LOCK-06: revalidation strategy is `router.refresh()` only. No SWR,
 *   no optimistic status mutation. The fetch helper returns the server
 *   payload verbatim; the caller decides whether to call `router.refresh()`.
 * LOCK-13: idempotency key is RAW UUID v4 (per-tab `sessionStorage`),
 *   scoped in `hrp.p1f1.idem.<command>.<scope>.<payloadHash>` so identical
 *   retries reuse the key but payload changes mint a fresh one.
 *
 * Safe error mapping (F-03 / LOCK-09 / RQ-12 / AC-08):
 *   - 500 / unknown / network failure → fixed generic Vietnamese message.
 *     NEVER render raw `envelope.message`, raw `Error.message`, `details`,
 *     `acknowledgementRef`, evidence, actor ID, tokens, or PII.
 *   - 4xx (400/401/403/404/409) → frozen safe mapping; preserves
 *     canonical server `message` if present and Vietnamese-friendly, else
 *     fall back to a generic message keyed by `error` code.
 *   - Same `Idempotency-Key` is preserved across network uncertainty and
 *     5xx retry (the key was already minted; we never clear it on
 *     non-terminal outcomes — only on 200/201 success).
 */

import { PLACEMENT_COMMAND_ROUTES } from '@/src/domains/talent/placement.commands';

import {
  NETWORK_GENERIC_VI,
  type PlacementCommandName,
  type PlacementCommandPayloadShape,
  SAFE_CODE_MESSAGES,
  SERVER_GENERIC_VI,
  sessionStorageKeyForPlacementCommand,
} from './recruiter-workbench.placement-actions.states';

// ─────────────────────────────────────────────────────────────────────────
// 1. Raw UUID v4 mint (LOCK-13).
// ─────────────────────────────────────────────────────────────────────────

export function mintUuidV4(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('crypto.randomUUID không khả dụng — trình duyệt không hỗ trợ');
  }
  return globalThis.crypto.randomUUID();
}

/**
 * Mint-or-reuse the per-tab sessionStorage Idempotency-Key for the given
 * canonical command + scope + payload.
 */
export function mintPlacementIdempotencyKey(args: {
  command: PlacementCommandName;
  scope: string;
  payload: unknown;
}): { key: string; isFresh: boolean } {
  const storageKey = sessionStorageKeyForPlacementCommand(args);
  if (typeof globalThis.window === 'undefined') {
    return { key: mintUuidV4(), isFresh: true };
  }
  const existing = globalThis.window.sessionStorage.getItem(storageKey);
  if (existing && existing.length === 36) {
    return { key: existing, isFresh: false };
  }
  const fresh = mintUuidV4();
  globalThis.window.sessionStorage.setItem(storageKey, fresh);
  return { key: fresh, isFresh: true };
}

/**
 * Clear the idempotency key EXACTLY on terminal success (200/201).
 *
 * On ANY non-terminal outcome (network exception, 4xx, 5xx, parse failure)
 * the key MUST stay in sessionStorage so the next deliberate attempt
 * reuses the SAME key — guaranteeing idempotent retry semantics under
 * uncertainty. The caller invokes this function ONLY after a `ok: true`
 * result.
 */
export function clearPlacementIdempotencyKey(args: {
  command: PlacementCommandName;
  scope: string;
  payload: unknown;
}): void {
  if (typeof globalThis.window === 'undefined') return;
  const storageKey = sessionStorageKeyForPlacementCommand({
    command: args.command,
    scope: args.scope,
    payload: args.payload,
  });
  globalThis.window.sessionStorage.removeItem(storageKey);
}

// ─────────────────────────────────────────────────────────────────────────
// 2. URL building — canonical F0 endpoints.
// ─────────────────────────────────────────────────────────────────────────

export function urlForPlacementCommand(args: {
  command: PlacementCommandName;
  placementId?: string;
}): string {
  const route = PLACEMENT_COMMAND_ROUTES[
    args.command === 'placement.create'
      ? 'create'
      : args.command === 'placement.confirm'
        ? 'confirm'
        : args.command === 'placement.effective'
          ? 'effective'
          : args.command === 'placement.fail'
            ? 'fail'
            : 'cancel'
  ];

  const pathOnly = route.replace(/^[A-Z]+:/, '');

  if (pathOnly.includes('[id]')) {
    if (!args.placementId) {
      throw new Error(
        `command "${args.command}" yêu cầu placementId để build URL`,
      );
    }
    return pathOnly.replace(
      '[id]',
      encodeURIComponent(args.placementId),
    );
  }
  return pathOnly;
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Safe Vietnamese message mapping (F-03).
//   - Constants live in `./recruiter-workbench.placement-actions.states`
//     so the same frozen text is used by both `formatErrorMessage` (inline
//     alert rendering) and this fetch wrapper.
//   - `safeMessageForError` here ONLY adds the INTERNAL → server-generic
//     alias and a status-keyed last-resort fallback. The two callers stay
//     semantically aligned.
// ─────────────────────────────────────────────────────────────────────────

const SAFE_CODE_MESSAGES_WITH_INTERNAL: Record<string, string> = {
  ...SAFE_CODE_MESSAGES,
  INTERNAL: SERVER_GENERIC_VI,
};

/**
 * Map a server error code → safe Vietnamese display message.
 * NEVER pass through raw `envelope.message` if the status is 5xx or the
 * error code is unknown (defense against accidental PII leakage).
 */
function safeMessageForError(
  errorCode: string,
  status: number,
  envelopeMessage: string | null,
): string {
  if (status >= 500 || status === 0) {
    return SAFE_CODE_MESSAGES_WITH_INTERNAL[errorCode] ?? SERVER_GENERIC_VI;
  }
  if (errorCode === 'UNKNOWN' || !errorCode) {
    return `Yêu cầu thất bại (mã ${status}). Vui lòng thử lại.`;
  }
  const canned = SAFE_CODE_MESSAGES[errorCode];
  if (canned) return canned;
  // 4xx with a known Vietnamese-friendly server message: keep verbatim.
  // The server is responsible for not leaking PII/secret fields here;
  // if it does, the F0 route's logging taxonomy will catch the regression.
  if (envelopeMessage && envelopeMessage.trim().length > 0) {
    return envelopeMessage;
  }
  return `Yêu cầu thất bại (mã ${status}). Vui lòng thử lại.`;
}

// ─────────────────────────────────────────────────────────────────────────
// 4. POST wrapper — Idempotency-Key in header + safe JSON body.
// ─────────────────────────────────────────────────────────────────────────

export interface PlacementCommandRequest {
  command: PlacementCommandName;
  payload: PlacementCommandPayloadShape;
}

export interface PlacementCommandSuccess<TBody> {
  ok: true;
  status: number;
  body: TBody;
  replayed: boolean;
}

export interface PlacementCommandFailure {
  ok: false;
  status: number;
  errorCode: string;
  /** Short, Vietnamese-safe message usable in `<p role="alert">`. */
  displayMessage: string;
}

export type PlacementCommandResult<TBody> =
  | PlacementCommandSuccess<TBody>
  | PlacementCommandFailure;

export function headersForPlacementCommand(idempotencyKey: string): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-idempotency-key': idempotencyKey,
  };
}

/**
 * The single public entry point for posting a placement mutation.
 *
 * Steps:
 *   1. mint-or-reuse `Idempotency-Key` scoped to `(command, scope, payload)`
 *   2. POST the canonical URL with the body + Idempotency-Key header
 *   3. Parse the response (status + JSON envelope or null)
 *   4. Map to safe Vietnamese message (F-03): 500/network/unknown → generic;
 *      4xx → frozen safe mapping keyed by error code.
 *   5. On terminal success (200/201), CLEAR the idempotency key so the
 *      NEXT deliberate attempt with the SAME payload mints a fresh key.
 *      On any non-terminal outcome, the key stays put (LOCK-13 retention).
 *   6. Return a discriminated union — caller NEVER has to inspect raw
 *      `Response` objects.
 */
export async function runPlacementCommandRequest<TBody>(
  req: PlacementCommandRequest,
): Promise<PlacementCommandResult<TBody>> {
  const { command, payload } = req;

  const scope =
    command === 'placement.create'
      ? (payload as Extract<
          PlacementCommandPayloadShape,
          { command: 'placement.create' }
        >).placementCaseId
      : (payload as Exclude<
          PlacementCommandPayloadShape,
          { command: 'placement.create' }
        >).placementId;

  const placementIdForUrl =
    command === 'placement.create'
      ? undefined
      : (payload as Exclude<
          PlacementCommandPayloadShape,
          { command: 'placement.create' }
        >).placementId;

  const url = urlForPlacementCommand({
    command,
    ...(placementIdForUrl ? { placementId: placementIdForUrl } : {}),
  });

  const { key: idempotencyKey } = mintPlacementIdempotencyKey({
    command,
    scope,
    payload,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: headersForPlacementCommand(idempotencyKey),
      body: JSON.stringify(
        command === 'placement.create'
          ? {
              placementCaseId: (payload as { placementCaseId: string })
                .placementCaseId,
              jobOpeningId: (payload as { jobOpeningId: string }).jobOpeningId,
              ...((payload as { sourceCandidateSubmissionId?: string })
                .sourceCandidateSubmissionId
                ? {
                    sourceCandidateSubmissionId: (
                      payload as { sourceCandidateSubmissionId: string }
                    ).sourceCandidateSubmissionId,
                  }
                : {}),
            }
          : command === 'placement.effective'
            ? {
                evidence: (payload as Extract<
                  PlacementCommandPayloadShape,
                  { command: 'placement.effective' }
                >).evidence,
              }
            : {},
      ),
      cache: 'no-store',
    });
  } catch {
    // Network-level failure (DNS, CORS preflight, abort, offline, etc.).
    // F-03: render fixed generic Vietnamese message; the key stays in
    // sessionStorage so a deliberate retry reuses the same Idempotency-Key.
    return {
      ok: false,
      status: 0,
      errorCode: 'NETWORK',
      displayMessage: NETWORK_GENERIC_VI,
    };
  }

  const status = response.status;
  const success = status >= 200 && status < 300;

  if (success) {
    let body: TBody | null = null;
    try {
      body = (await response.json()) as TBody;
    } catch {
      body = null;
    }

    const replayed =
      body && typeof body === 'object' && 'replayed' in (body as object)
        ? Boolean((body as { replayed?: unknown }).replayed)
        : false;

    // LOCK-13: clear the idempotency key ONLY on terminal success. A
    // subsequent click with the same payload is treated as a fresh user
    // action (UX intent: the user sees the updated status and clicks again).
    clearPlacementIdempotencyKey({ command, scope, payload });

    return {
      ok: true,
      status,
      body: (body ?? ({} as TBody)),
      replayed,
    };
  }

  // Failure — try to parse the canonical `{ error, message }` envelope,
  // but DO NOT trust its `message` for 5xx or unknown codes.
  let envelopeError: string | null = null;
  let envelopeMessage: string | null = null;
  try {
    const parsed: unknown = await response.json();
    if (
      parsed &&
      typeof parsed === 'object' &&
      'error' in (parsed as Record<string, unknown>) &&
      'message' in (parsed as Record<string, unknown>)
    ) {
      const e = parsed as { error: unknown; message: unknown };
      if (typeof e.error === 'string') envelopeError = e.error;
      if (typeof e.message === 'string') envelopeMessage = e.message;
    }
  } catch {
    // ignore — non-JSON or empty body
  }

  const errorCode = envelopeError ?? 'UNKNOWN';
  const displayMessage = safeMessageForError(
    errorCode,
    status,
    envelopeMessage,
  );

  return {
    ok: false,
    status,
    errorCode,
    displayMessage,
  };
}
