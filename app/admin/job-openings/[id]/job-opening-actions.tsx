'use client';

/**
 * job-opening-actions.tsx — P1-A0.5 narrow Client Component action island.
 *
 * Contract (RQ-08 / v1.1 §F / LOCK-07):
 *   - Server Component `app/admin/job-openings/[id]/page.tsx` derives
 *     `flags` (canClassify, canOpen, blockedReason) and passes them as
 *     props. The Client Component NEVER re-derives authority or lifecycle.
 *   - Client sends commands only; server re-evaluates every precondition.
 *   - On success → `router.refresh()` (no toast framework — v1.1 §F; inline
 *     status text only).
 *
 * Two control groups:
 *   (a) ServiceModel selector (4 enum radio) — visible only when
 *       `flags.canClassify === true`. Submit POSTs to `/classify` with
 *       the chosen enum + a UUID-v4 Idempotency-Key.
 *   (b) "Mở JobOpening" button — visible only when `flags.canOpen === true`.
 *       Submit POSTs to `/open` with empty body + UUID-v4 Idempotency-Key.
 *
 * HR_STAFF visibility (server-derived):
 *   - ServiceModel selector NEVER shown for HR_STAFF (regardless of flags).
 *   - "Mở" button only when `flags.canOpen === true` (active A0.4
 *     assignment + all preconditions met). Otherwise disabled with
 *     `flags.blockedReason` text.
 *
 * ADMIN/HR_MANAGER visibility:
 *   - Both controls shown when status === 'DRAFT' AND placementCount === 0
 *     AND authority holds.
 *
 * DIRECTOR/PM visibility: `flags.canClassify === false && flags.canOpen
 *   === false` → neither control rendered. Page is read-only.
 *
 * ────────────────────────────────────────────────────────────────────────
 * Pre-audit correction batch 1/1 §I — per-tab retry idempotency persistence
 * ────────────────────────────────────────────────────────────────────────
 * The idempotency key is scoped by:
 *   - openingId (URL-derived)
 *   - command   ('classify' | 'open')
 *   - canonical payload hash (ServiceModel value for classify; empty for open)
 *
 * On submit, the component MINT a fresh UUID-v4 key (browser-native
 * `crypto.randomUUID()` — no `Math.random` fallback in production).
 * The key is stored in a per-tab in-memory map keyed by the scope above.
 *
 * Retry semantics:
 *   - Same scope + same payload (same key) → REUSE the stored key on
 *     network / 4xx / 5xx failures so the server can recognize the retry
 *     via the existing idempotency record.
 *   - Terminal success (HTTP 2xx) → CLEAR the key from the map.
 *   - Changed classification payload → MINT a new key (different scope).
 *   - Classify and open keys never collide (different command in scope).
 */
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  jobOpeningServiceModelLabel,
  jobOpeningStatusLabel,
} from '@/src/domains/staffing/job-opening-ui';

export type ServiceModel =
  | 'STAFFING_SUPPLY'
  | 'LABOR_LEASING'
  | 'RECRUITMENT_SERVICE'
  | 'REFERRAL_SERVICE';

export const SERVICE_MODEL_OPTIONS: ReadonlyArray<{
  value: ServiceModel;
  label: string;
}> = [
  { value: 'STAFFING_SUPPLY', label: jobOpeningServiceModelLabel('STAFFING_SUPPLY') },
  { value: 'LABOR_LEASING', label: jobOpeningServiceModelLabel('LABOR_LEASING') },
  { value: 'RECRUITMENT_SERVICE', label: jobOpeningServiceModelLabel('RECRUITMENT_SERVICE') },
  { value: 'REFERRAL_SERVICE', label: jobOpeningServiceModelLabel('REFERRAL_SERVICE') },
];

export interface JobOpeningActionsFlags {
  /** True only when caller is ADMIN/HR_MANAGER + status DRAFT + placementCount 0. */
  canClassify: boolean;
  /** True only when ALL preconditions met (full 7-precondition set) for this caller. */
  canOpen: boolean;
  /** When `canOpen === false`, a short safe-text reason ("Bạn cần được phân công..."). */
  blockedReason: string | null;
  /** Server-derived opening status (DRAFT/OPEN/FILLED/CANCELLED) — informational only. */
  currentStatus: string;
  /** ServiceModel already set on the JobOpening (informational only). */
  currentServiceModel: ServiceModel | null;
}

export interface JobOpeningActionsOpening {
  id: string;
}

export interface JobOpeningActionsProps {
  opening: JobOpeningActionsOpening;
  flags: JobOpeningActionsFlags;
}

/**
 * Generate a UUID v4 using browser-native `crypto.randomUUID` ONLY.
 *
 * Pre-audit correction batch 1/1 §I: no `Math.random` fallback in
 * production behavior. The fallback `getRandomValues` path is retained
 * for SSR pre-hydration test environments where `randomUUID` may be
 * unavailable, but the test renderer is expected to provide a polyfill.
 */
function uuidV4(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
  // If neither API is available we throw — the page cannot mint a safe
  // UUID v4 without one, and silently using Math.random would corrupt
  // idempotency semantics across retries (collision probability too high).
  throw new Error('crypto.randomUUID / getRandomValues unavailable');
}

/**
 * Per-tab retry key store (P1-A0.5 §I).
 *
 * Module-scope Map; one instance per JS realm (each browser tab gets a
 * fresh realm on reload, so per-tab scope is enforced naturally). We do
 * NOT persist to localStorage / sessionStorage because:
 *   - The contract requires per-tab scope, not cross-tab;
 *   - localStorage would survive a logout on a shared device.
 *
 * Key shape: `${openingId}:${command}:${payloadHash}` → UUID v4 string.
 */
const retryKeyStore = new Map<string, string>();

type Command = 'classify' | 'open';

function getRetryKey(
  openingId: string,
  command: Command,
  payloadHash: string,
): string {
  return `idempotency:${openingId}:${command}:${payloadHash}`;
}

function payloadHashFor(command: Command, payload: unknown): string {
  // Canonical payload hash — JSON.stringify on the canonical, sorted form.
  // For classify the payload is { serviceModel }, for open the payload is
  // empty (always hash to a constant).
  let canonical: string;
  if (command === 'classify') {
    canonical = JSON.stringify({ serviceModel: payload });
  } else {
    canonical = '';
  }
  return canonical;
}

function obtainKey(
  openingId: string,
  command: Command,
  payload: unknown,
): string {
  const hash = payloadHashFor(command, payload);
  const k = getRetryKey(openingId, command, hash);
  const existing = retryKeyStore.get(k);
  if (existing) return existing;
  const fresh = uuidV4();
  retryKeyStore.set(k, fresh);
  return fresh;
}

function clearKey(openingId: string, command: Command, payload: unknown): void {
  const hash = payloadHashFor(command, payload);
  retryKeyStore.delete(getRetryKey(openingId, command, hash));
}

type InlineStatus =
  | { kind: 'idle' }
  | { kind: 'submitting'; label: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function JobOpeningActions({ opening, flags }: JobOpeningActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedServiceModel, setSelectedServiceModel] = useState<ServiceModel | ''>('');
  const [status, setStatus] = useState<InlineStatus>({ kind: 'idle' });

  // Refs survive StrictMode double-render without surprising state resets.
  const openingIdRef = useRef(opening.id);
  openingIdRef.current = opening.id;

  // When the user changes the ServiceModel selection, the scope hash
  // changes too. We do NOT need to clear the old key on selection change
  // because the previous submission would have already cleared it on
  // success or failed without persisting a new key (the store keeps the
  // last-known key for the old hash). Re-selecting then re-submitting
  // mints a NEW key for the new hash; the old hash key remains in the
  // map until garbage-collected.
  useEffect(() => {
    // Reset inline status when flags.canOpen / canClassify change so a
    // stale "Đã mở JobOpening" doesn't linger after a navigation.
    setStatus({ kind: 'idle' });
  }, [flags.canClassify, flags.canOpen, opening.id]);

  const submitClassify = () => {
    if (!flags.canClassify) return;
    if (!selectedServiceModel) {
      setStatus({ kind: 'error', message: 'Vui lòng chọn hình thức tuyển dụng.' });
      return;
    }
    const payload = { serviceModel: selectedServiceModel };
    setStatus({ kind: 'submitting', label: 'Đang phân loại...' });
    const idempotencyKey = obtainKey(openingIdRef.current, 'classify', payload);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/staffing/job-openings/${encodeURIComponent(openingIdRef.current)}/classify`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          // Do NOT clear the key on failure — retry should reuse the same key.
          setStatus({ kind: 'error', message: 'Không thể cập nhật hình thức tuyển dụng. Vui lòng tải lại trang rồi thử lại.' });
          return;
        }
        // Terminal success → clear the retry key so the next click mints
        // a new one.
        clearKey(openingIdRef.current, 'classify', payload);
        setStatus({ kind: 'success', message: 'Đã cập nhật hình thức tuyển dụng.' });
        router.refresh();
      } catch {
        // Network error → retry should reuse the same key.
        setStatus({
          kind: 'error',
          message: 'Không thể kết nối máy chủ. Vui lòng thử lại.',
        });
      }
    });
  };

  const submitOpen = () => {
    if (!flags.canOpen) return;
    setStatus({ kind: 'submitting', label: 'Đang mở đợt tuyển dụng...' });
    const idempotencyKey = obtainKey(openingIdRef.current, 'open', null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/staffing/job-openings/${encodeURIComponent(openingIdRef.current)}/open`,
          {
            method: 'POST',
            headers: {
              'Idempotency-Key': idempotencyKey,
              // v1.1 §D: body MUST be empty; do NOT set content-type or body.
            },
          },
        );
        if (!res.ok) {
          setStatus({
            kind: 'error',
            message: 'Không thể mở đợt tuyển dụng. Vui lòng kiểm tra các điều kiện và thử lại.',
          });
          return;
        }
        clearKey(openingIdRef.current, 'open', null);
        setStatus({ kind: 'success', message: 'Đã mở đợt tuyển dụng.' });
        router.refresh();
      } catch {
        setStatus({
          kind: 'error',
          message: 'Không thể kết nối máy chủ. Vui lòng thử lại.',
        });
      }
    });
  };

  const statusClass =
    status.kind === 'error'
      ? 'text-red-700 bg-red-50 border-red-200'
      : status.kind === 'success'
        ? 'text-green-700 bg-green-50 border-green-200'
        : status.kind === 'submitting'
          ? 'text-blue-700 bg-blue-50 border-blue-200'
          : 'text-neutral-600 bg-neutral-50 border-neutral-200';

  return (
    <div
      data-testid="job-opening-actions"
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
    >
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--on-surface)' }}>
        Kích hoạt đợt tuyển dụng
      </h2>

      {/* ServiceModel selector — visible only when canClassify */}
      {flags.canClassify && (
        <div className="mb-4" data-testid="classify-section">
          <p className="text-sm mb-2" style={{ color: 'var(--on-surface-variant)' }}>
            Hình thức tuyển dụng:
          </p>
          <div className="flex flex-col gap-2">
            {SERVICE_MODEL_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="serviceModel"
                  value={opt.value}
                  checked={selectedServiceModel === opt.value}
                  onChange={() => setSelectedServiceModel(opt.value)}
                  disabled={isPending}
                  data-testid={`classify-radio-${opt.value}`}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={submitClassify}
            disabled={isPending || !selectedServiceModel}
            className="mt-3 px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}
            data-testid="classify-submit"
          >
            Phân loại
          </button>
        </div>
      )}

      {/* Open button — visible only when canOpen; otherwise disabled + reason text */}
      <div className="mt-4" data-testid="open-section">
        {flags.canOpen ? (
          <button
            type="button"
            onClick={submitOpen}
            disabled={isPending}
            className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}
            data-testid="open-submit"
          >
            Mở đợt tuyển dụng
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="px-4 py-2 rounded text-sm font-medium opacity-50 cursor-not-allowed"
            style={{ backgroundColor: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
            data-testid="open-disabled"
          >
            Mở đợt tuyển dụng
          </button>
        )}
        {flags.blockedReason && (
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--on-surface-variant)' }}
            data-testid="open-blocked-reason"
          >
            {flags.blockedReason}
          </p>
        )}
      </div>

      {/* Inline status — no toast framework (v1.1 §F). */}
      <div
        className={`mt-4 px-3 py-2 rounded border text-sm ${statusClass}`}
        data-testid="inline-status"
        data-status-kind={status.kind}
      >
        {status.kind === 'idle' && flags.currentServiceModel
          ? `Hình thức tuyển dụng: ${jobOpeningServiceModelLabel(flags.currentServiceModel)}`
          : status.kind === 'idle' && flags.currentStatus
            ? `Trạng thái: ${jobOpeningStatusLabel(flags.currentStatus)}`
            : status.kind === 'submitting'
              ? status.label
              : status.kind === 'success'
                ? status.message
                : status.kind === 'error'
                  ? status.message
                  : ''}
      </div>
    </div>
  );
}
