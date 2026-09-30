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
 */
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export type ServiceModel =
  | 'STAFFING_SUPPLY'
  | 'LABOR_LEASING'
  | 'RECRUITMENT_SERVICE'
  | 'REFERRAL_SERVICE';

export const SERVICE_MODEL_OPTIONS: ReadonlyArray<{
  value: ServiceModel;
  label: string;
}> = [
  { value: 'STAFFING_SUPPLY', label: 'Cung ứng nhân sự (STAFFING_SUPPLY)' },
  { value: 'LABOR_LEASING', label: 'Cho thuê lại lao động (LABOR_LEASING)' },
  { value: 'RECRUITMENT_SERVICE', label: 'Tuyển dụng (RECRUITMENT_SERVICE)' },
  { value: 'REFERRAL_SERVICE', label: 'Giới thiệu ứng viên (REFERRAL_SERVICE)' },
];

/**
 * Server-derived flags. The page component computes these and passes them
 * to the island as PROPS ONLY. The Client Component never re-derives
 * authority or lifecycle from the `opening` shape alone.
 */
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

/**
 * Server-derived opening snapshot. NEVER includes actorId, assigneeId,
 * assignment audit, or any PII. The page server component builds this
 * shape from `JobOpeningDetailDto`.
 */
export interface JobOpeningActionsOpening {
  id: string;
}

export interface JobOpeningActionsProps {
  opening: JobOpeningActionsOpening;
  flags: JobOpeningActionsFlags;
}

/**
 * Generate a UUID v4 using crypto.getRandomValues (browser-native, no deps).
 * Falls back to a v4-shaped string from Math.random in case crypto is missing
 * (test environment / SSR pre-hydration).
 */
function uuidV4(): string {
  const c = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : null;
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
  // Last-resort fallback. RFC4122 v4 shape; not cryptographically strong.
  const rand = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${rand(8)}-${rand(4)}-4${rand(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${rand(3)}-${rand(12)}`;
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

  const submitClassify = () => {
    if (!flags.canClassify) return;
    if (!selectedServiceModel) {
      setStatus({ kind: 'error', message: 'Vui lòng chọn một ServiceModel' });
      return;
    }
    setStatus({ kind: 'submitting', label: 'Đang phân loại...' });
    const idempotencyKey = uuidV4();
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/staffing/job-openings/${encodeURIComponent(opening.id)}/classify`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify({ serviceModel: selectedServiceModel }),
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const message =
            typeof body?.message === 'string'
              ? body.message
              : `Phân loại thất bại (HTTP ${res.status})`;
          setStatus({ kind: 'error', message });
          return;
        }
        setStatus({ kind: 'success', message: 'Đã phân loại ServiceModel' });
        // Server re-derives everything; client only refreshes the route.
        router.refresh();
      } catch (err) {
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Lỗi mạng',
        });
      }
    });
  };

  const submitOpen = () => {
    if (!flags.canOpen) return;
    setStatus({ kind: 'submitting', label: 'Đang mở JobOpening...' });
    const idempotencyKey = uuidV4();
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/staffing/job-openings/${encodeURIComponent(opening.id)}/open`,
          {
            method: 'POST',
            headers: {
              'Idempotency-Key': idempotencyKey,
              // v1.1 §D: body MUST be empty; do NOT set content-type or body.
            },
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const message =
            typeof body?.message === 'string'
              ? body.message
              : `Mở JobOpening thất bại (HTTP ${res.status})`;
          setStatus({ kind: 'error', message });
          return;
        }
        setStatus({ kind: 'success', message: 'Đã mở JobOpening' });
        router.refresh();
      } catch (err) {
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Lỗi mạng',
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
        Kích hoạt JobOpening
      </h2>

      {/* ServiceModel selector — visible only when canClassify */}
      {flags.canClassify && (
        <div className="mb-4" data-testid="classify-section">
          <p className="text-sm mb-2" style={{ color: 'var(--on-surface-variant)' }}>
            Phân loại ServiceModel:
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
            Mở JobOpening
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="px-4 py-2 rounded text-sm font-medium opacity-50 cursor-not-allowed"
            style={{ backgroundColor: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
            data-testid="open-disabled"
          >
            Mở JobOpening
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
          ? `ServiceModel hiện tại: ${flags.currentServiceModel}`
          : status.kind === 'idle' && flags.currentStatus
            ? `Trạng thái: ${flags.currentStatus}`
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
