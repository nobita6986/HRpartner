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
 *   retries reuse the key but payload changes mint a fresh one. Cleared
 *   on 200/201 terminal success.
 *
 * This is an isomorphic module — the pure helpers (`mintPlacementIdempotencyKey`)
 * export from `./placement-actions.states`. This file glues them to the
 * global `fetch` (browser) and to per-tab `sessionStorage` (browser).
 *
 * NO deps beyond the project modules — no SWR, no react-query, no library
 * abstraction over `fetch`.
 */

import { PLACEMENT_COMMAND_ROUTES } from '@/src/domains/talent/placement.commands';

import {
  type PlacementCommandName,
  type PlacementCommandPayloadShape,
  sessionStorageKeyForPlacementCommand,
} from './recruiter-workbench.placement-actions.states';

// ─────────────────────────────────────────────────────────────────────────
// 1. Raw UUID v4 mint (LOCK-13).
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generate a fresh UUID v4 using `crypto.randomUUID` (browser-native).
 * Throws if the runtime does NOT expose `crypto.randomUUID` — i.e. the
 * caller forgot to gate on `typeof window`. We do NOT polyfill.
 */
export function mintUuidV4(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('crypto.randomUUID không khả dụng — trình duyệt không hỗ trợ');
  }
  return globalThis.crypto.randomUUID();
}

/**
 * Mint-or-reuse the per-tab sessionStorage Idempotency-Key for the given
 * canonical command + scope + payload.
 *
 * Returns `{ key, isFresh }`:
 *   - `isFresh=true` → first time the row sees this command+payload → key
 *     was just minted. Subsequent calls (double-click / network retry /
 *     5xx retry) with the same scope + payload reuse the same key.
 *   - `isFresh=false` → key reused from sessionStorage.
 *
 * On `200/201` success the caller MUST clear the entry (see
 * `clearPlacementIdempotencyKey`) so a same-payload retry AFTER a successful
 * transition is treated as a fresh user action (UX: the user sees the
 * updated status; a subsequent click must be intentional).
 */
export function mintPlacementIdempotencyKey(args: {
  command: PlacementCommandName;
  scope: string;
  payload: unknown;
}): { key: string; isFresh: boolean } {
  const storageKey = sessionStorageKeyForPlacementCommand(args);
  if (typeof globalThis.window === 'undefined') {
    // Non-browser runtime — always mint fresh (caller is a server-side test).
    return { key: mintUuidV4(), isFresh: true };
  }
  const existing = globalThis.window.sessionStorage.getItem(storageKey);
  if (existing && existing.length === 36) {
    // Mid-key shape check; we deliberately do NOT call `isUuidV4` here to
    // avoid an import cycle (and the storage key already encodes the
    // command+scope+hash, so a collision with a wrong format is impossible).
    return { key: existing, isFresh: false };
  }
  const fresh = mintUuidV4();
  globalThis.window.sessionStorage.setItem(storageKey, fresh);
  return { key: fresh, isFresh: true };
}

/** Clear ALL idempotency keys for the given command + scope (post-success). */
export function clearPlacementIdempotencyKey(args: {
  command: PlacementCommandName;
  scope: string;
  payload?: unknown;
}): void {
  if (typeof globalThis.window === 'undefined') return;
  // Clear by exact key when payload provided; otherwise clear every key
  // matching `hrp.p1f1.idem.<command>.<scope>.*` (defensive — covers the
  // case where the caller changes only the payload between submits).
  if (args.payload !== undefined) {
    globalThis.window.sessionStorage.removeItem(
      sessionStorageKeyForPlacementCommand({
        command: args.command,
        scope: args.scope,
        payload: args.payload,
      }),
    );
    return;
  }
  const prefix = `hrp.p1f1.idem.${args.command}.${args.scope}.`;
  const keysToRemove: string[] = [];
  for (let i = 0; i < globalThis.window.sessionStorage.length; i++) {
    const k = globalThis.window.sessionStorage.key(i);
    if (k && k.startsWith(prefix)) keysToRemove.push(k);
  }
  for (const k of keysToRemove) {
    globalThis.window.sessionStorage.removeItem(k);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 2. URL building — canonical F0 endpoints.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Compute the canonical URL for a placement command. The 5 canonical
 * endpoints live in `placement.commands.ts → PLACEMENT_COMMAND_ROUTES`
 * and the existing routes use `placementId` as the URL `:id`.
 *
 * The map's values are prefixed with the request method (e.g.
 * `POST:/api/admin/placements/[id]/actions/confirm`) for the
 * `withIdempotency` scope key. We strip the `METHOD:` prefix here so
 * the URL handed to `fetch()` is plain path.
 *
 * For `placement.create` there is no `:id` — the case+jobOpening come from
 * the body. For the 4 transitions the `:id` is the placement id.
 */
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

  // Strip the leading `METHOD:` prefix used by withIdempotency scoping.
  const pathOnly = route.replace(/^[A-Z]+:/, '');

  // Replace the `[id]` segment with the real placement id when present.
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
// 3. POST wrapper — Idempotency-Key in header + safe JSON body.
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
  envelope:
    | {
        error: string;
        message: string;
      }
    | null;
  errorCode: string;
  /** Short, Vietnamese-ready message usable in `<p role="alert">`. */
  displayMessage: string;
}

/**
 * Result envelope returned by `runPlacementCommandRequest`. Discriminated
 * on `ok` so the caller can switch on success vs failure at the type level.
 */
export type PlacementCommandResult<TBody> =
  | PlacementCommandSuccess<TBody>
  | PlacementCommandFailure;

/**
 * Headers bound by the F0 routes we POST to:
 *   - `Accept: application/json` — strict (no wildcard accept).
 *   - `Content-Type: application/json` — required by NextRequest.json() flow.
 *   - `x-idempotency-key: <raw uuid v4>` — LOCK-13.
 *
 * We NEVER set `credentials: include` — the request inherits the same
 * cookie jar as the page render. The `Idempotency-Key` is the only header
 * we add.
 */
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
 *   4. Return a discriminated union — caller NEVER has to inspect raw
 *      `Response` objects.
 *
 * The helper intentionally does NOT call `router.refresh()`; that is the
 * caller's responsibility after a successful `ok: true` result.
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
      // For `placement.create` we send the full body; for transitions we
      // send an empty object (the route's `validateXxxBody` accepts `{}`).
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
  } catch (e) {
    // Network-level failure (DNS, CORS preflight, etc.).
    return {
      ok: false,
      status: 0,
      envelope: null,
      errorCode: 'NETWORK',
      displayMessage:
        e instanceof Error
          ? `Không thể kết nối máy chủ: ${e.message}`
          : 'Không thể kết nối máy chủ.',
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

    // Best-effort replayed flag extraction; absence is fine (older routes).
    const replayed =
      body && typeof body === 'object' && 'replayed' in (body as object)
        ? Boolean((body as { replayed?: unknown }).replayed)
        : false;

    return {
      ok: true,
      status,
      body: (body ?? ({} as TBody)),
      replayed,
    };
  }

  // Failure — try to parse the canonical `{ error, message }` envelope.
  let envelope: { error: string; message: string } | null = null;
  try {
    const parsed: unknown = await response.json();
    if (
      parsed &&
      typeof parsed === 'object' &&
      'error' in (parsed as Record<string, unknown>) &&
      'message' in (parsed as Record<string, unknown>)
    ) {
      const e = parsed as { error: unknown; message: unknown };
      if (typeof e.error === 'string' && typeof e.message === 'string') {
        envelope = { error: e.error, message: e.message };
      }
    }
  } catch {
    envelope = null;
  }

  const displayMessage = envelope
    ? (envelope.message.length > 0
        ? envelope.message
        : `${envelope.error} — Yêu cầu thất bại.`)
    : `Yêu cầu thất bại với mã ${status}.`;

  return {
    ok: false,
    status,
    envelope,
    errorCode: envelope?.error ?? 'UNKNOWN',
    displayMessage,
  };
}
