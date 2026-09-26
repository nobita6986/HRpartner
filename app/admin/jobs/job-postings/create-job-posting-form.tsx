/**
 * create-job-posting-form.tsx — hrp-p1-a0-1 / DEC-02, DEC-03, DEC-04.
 *
 * Form chọn StaffingOrderSlot đủ điều kiện và POST `/api/admin/jobs/job-postings`
 * để tạo/reuse JobPosting DRAFT. UI chỉ là client view; authorization là P1-A0 server-side
 * (`ALLOWED_MUTATION_ROLES` ở `job-posting-authoring.service.ts`).
 *
 * Locked decisions (T0 §2):
 *   - DEC-02: Server Component load eligible-slot DTO qua service canonical và truyền vào
 *     client form (`eligibleSlots` prop). Selector client KHÔNG phải authorization authority.
 *   - DEC-03: Eligibility predicate ở `listEligibleSlotsForNewJobPosting` — StaffingOrder.status
 *     IN OPEN|CLOSING_SOON, deadlineDate chưa hết hoặc null, validTo chưa hết hoặc null,
 *     slotsFilled < slotsNeeded, jobOpeningId IS NULL.
 *   - DEC-04: Một logical create attempt dùng một UUID Idempotency-Key. Double-click bị
 *     khóa (`isSubmitting` + UUID cố định trong toàn bộ vòng đời của lần submit). Retry
 *     sau network timeout/unknown outcome reuse cùng key. User action mới → key mới.
 *     Không bypass `withIdempotency`.
 *
 * Sau thành công: redirect tới `/admin/jobs/job-postings/[id]` (canonical editor) — DEC-01.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * hrp-p1-a0-1 (DEC-02): danh sách eligible slot được Server Component load qua service canonical
 * `listEligibleSlotsForNewJobPosting` (`job-posting-list.service.ts`) và truyền vào form. Đây
 * là DTO shape khớp `JobPostingSlotSelectorDto` — server mapper thêm `slotsAvailable` và
 * `orderStatus` (derived) để UI không phải tính lại.
 */
export interface EligibleSlotDto {
  /** UUID của StaffingOrderSlot — đây là `slotId` POST lên `/api/admin/jobs/job-postings`. */
  readonly slotId: string;
  /** UUID của StaffingOrder cha. */
  readonly staffingOrderId: string;
  /** Mã staffing order hiển thị (vd "SO-001"). */
  readonly staffingOrderCode: string;
  /** Position title. */
  readonly positionTitle: string;
  /** Position code. */
  readonly positionCode: string;
  /** Location (work_location). */
  readonly location: string | null;
  /** Số chỗ còn nhận (`slotsNeeded - slotsFilled`). */
  readonly slotsAvailable: number;
  /** Trạng thái StaffingOrder: 'OPEN' | 'CLOSING_SOON' — guaranteed từ predicate. */
  readonly orderStatus: 'OPEN' | 'CLOSING_SOON';
}

export interface CreateJobPostingFormProps {
  /** Danh sách slot đủ điều kiện (server-loaded qua service canonical). */
  readonly eligibleSlots: readonly EligibleSlotDto[];
  /** URL endpoint mutation — DEC-01 (re-use POST hiện hữu). */
  readonly actionUrl: string;
  /** Error từ server khi load eligible slots (vd ENV_BLOCKED). */
  readonly loadError?: { code: string; message: string } | null;
}

interface SubmitState {
  readonly kind: 'idle' | 'submitting' | 'error' | 'success';
  readonly message?: string;
  /** JobPosting id để redirect — chỉ set khi success. */
  readonly jobPostingId?: string;
}

/** Sinh UUID v4 cho Idempotency-Key (DEC-04).
 *
 *  C-04 (correction batch 1/1): entropy phải đến từ `crypto.randomUUID()` (preferred) hoặc
 *  `crypto.getRandomValues()` (RFC 4122 fallback). KHÔNG dùng `Math.random` — nó không phải
 *  nguồn entropy đủ mạnh cho idempotency key. Một UUID có 122 bit entropy thật là đủ để
 *  cả million request vẫn không trùng key; `Math.random` trong một số engine (V8) chỉ có
 *  ~128 bit state nên collisions xảy ra sớm hơn dự kiến.
 */
function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC 4122
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Last-resort: deterministic per-call seed is unsafe for idempotency, but we still avoid Math.random.
  // Caller should treat this as a degraded environment and not retry quickly.
  throw new Error('Không có crypto.randomUUID hoặc crypto.getRandomValues để sinh Idempotency-Key an toàn.');
}

export function CreateJobPostingForm({ eligibleSlots, actionUrl, loadError }: CreateJobPostingFormProps) {
  const router = useRouter();
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [submit, setSubmit] = useState<SubmitState>({ kind: 'idle' });
  /** Idempotency-Key cố định cho cả vòng đời submit hiện tại (DEC-04). */
  const idempotencyKeyRef = useRef<string>('');

  // Sinh key MỚI mỗi lần user chuyển từ idle sang submitting (action mới).
  const ensureFreshKey = useCallback((): string => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey();
    }
    return idempotencyKeyRef.current;
  }, []);

  const isBusy = submit.kind === 'submitting';
  const isSuccess = submit.kind === 'success';

  // Redirect sau khi success — DEC-01.
  useEffect(() => {
    if (submit.kind === 'success' && submit.jobPostingId) {
      router.push(`/admin/jobs/job-postings/${submit.jobPostingId}`);
    }
  }, [submit, router]);

  const submitDisabledReason = useMemo(() => {
    if (isBusy) return 'Đang xử lý...';
    if (eligibleSlots.length === 0) return 'Chưa có StaffingOrderSlot đủ điều kiện';
    if (!selectedSlotId) return 'Vui lòng chọn một slot';
    return null;
  }, [isBusy, eligibleSlots.length, selectedSlotId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitDisabledReason !== null) return;
    // Double-click lock: nếu đã submitting, bỏ qua.
    if (submit.kind === 'submitting') return;

    const idempotencyKey = ensureFreshKey();
    setSubmit({ kind: 'submitting' });

    try {
      const response = await fetch(actionUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ slotId: selectedSlotId }),
      });

      const data = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) {
        const errCode = typeof data.error === 'string' ? data.error : 'UNKNOWN_ERROR';
        // C-04 (correction batch 1/1):
        //   - 4xx (client-side correction): reset key — user đang sửa payload.
        //   - 5xx (server-side / unknown): giữ key — retry phải reuse cùng key để
        //     `withIdempotency` detect duplicate và trả lại response cũ hoặc replay.
        //   - network failure: giữ key.
        const isClientError = response.status >= 400 && response.status < 500;
        if (isClientError) {
          idempotencyKeyRef.current = '';
        }
        // C-04: KHÔNG hiển thị raw message từ server (có thể chứa stack trace, SQL error,
        // PII). Render một safe generic message thay thế. Code giữ lại để user copy-paste
        // cho support, nhưng message hiển thị qua lưới an toàn.
        const safeMessage = isClientError
          ? `Yêu cầu không hợp lệ (${errCode}). Vui lòng kiểm tra lại lựa chọn và thử lại.`
          : `Máy chủ tạm thời không phản hồi (HTTP ${response.status}). Có thể retry với cùng Idempotency-Key.`;
        setSubmit({ kind: 'error', message: `[${errCode}] ${safeMessage}` });
        return;
      }

      const body = data as { jobPosting?: { id?: string } };
      const jobPostingId = body.jobPosting?.id;
      if (typeof jobPostingId !== 'string' || jobPostingId.length === 0) {
        setSubmit({ kind: 'error', message: 'Server không trả jobPosting.id — không thể redirect.' });
        // 4xx-equivalent: bad payload from server. Reset key để user retry sạch.
        idempotencyKeyRef.current = '';
        return;
      }
      setSubmit({ kind: 'success', jobPostingId });
    } catch (err) {
      // Network failure hoặc abort: KHÔNG reset key — retry phải dùng cùng Idempotency-Key
      // (DEC-04 + C-04: "Retry sau network timeout/unknown outcome phải reuse cùng key").
      // C-04: render safe generic message — KHÔNG hiển thị raw `err.message` (có thể chứa
      // DNS info, internal URL, stack trace).
      console.error('[create-job-posting] network error:', err);
      setSubmit({
        kind: 'error',
        message:
          'Mất kết nối tới máy chủ. Có thể retry với cùng Idempotency-Key.',
      });
    }
  }

  // Trạng thái load lỗi (vd ENV_BLOCKED khi không có synthetic DB).
  if (loadError) {
    return (
      <section
        className="rounded-lg border p-4 text-sm"
        style={{
          borderColor: 'var(--outline)',
          backgroundColor: 'var(--color-surface-container)',
          color: 'var(--on-surface-variant)',
        }}
        aria-label="Form tạo JobPosting — không khả dụng"
      >
        <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
          Tạo JobPosting mới
        </h2>
        <p>Không thể tải danh sách StaffingOrderSlot đủ điều kiện: [{loadError.code}] {loadError.message}</p>
        <p className="mt-1 text-xs italic">
          Khi synthetic DB chưa sẵn, form vẫn hiển thị nhưng selector rỗng.
        </p>
      </section>
    );
  }

  if (isSuccess) {
    return (
      <section
        className="rounded-lg border p-4 text-sm"
        style={{
          borderColor: 'var(--outline)',
          backgroundColor: 'var(--color-surface-container)',
          color: 'var(--on-surface-variant)',
        }}
        aria-label="Tạo JobPosting — thành công"
      >
        <p style={{ color: 'var(--color-primary-dark)' }}>
          Tạo JobPosting thành công. Đang chuyển tới editor...
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border p-4 text-sm"
      style={{
        borderColor: 'var(--outline)',
        backgroundColor: 'var(--color-surface-container)',
      }}
      aria-label="Tạo JobPosting mới"
    >
      <h2 className="mb-3 text-base font-semibold" style={{ color: 'var(--on-surface)' }}>
        Tạo JobPosting mới
      </h2>

      {eligibleSlots.length === 0 ? (
        <div className="rounded border border-dashed p-3 text-sm" style={{ borderColor: 'var(--outline)' }}>
          <p style={{ color: 'var(--on-surface-variant)' }}>
            Chưa có StaffingOrderSlot đủ điều kiện. Một slot đủ điều kiện phải thoả:
          </p>
          <ul className="ml-4 mt-1 list-disc space-y-0.5 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            <li>StaffingOrder.status ∈ OPEN|CLOSING_SOON</li>
            <li>deadlineDate chưa hết (hoặc null) và validTo chưa hết (hoặc null)</li>
            <li>{'slotsFilled < slotsNeeded'}</li>
            <li>Chưa có JobOpening / JobPosting canonical</li>
          </ul>
        </div>
      ) : (
        <>
          <label htmlFor="slot-select" className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
            Chọn StaffingOrderSlot:
          </label>
          <select
            id="slot-select"
            name="slotId"
            value={selectedSlotId}
            onChange={(e) => {
              setSelectedSlotId(e.target.value);
              // Đổi lựa chọn → key cũ không còn hợp lệ cho action mới.
              idempotencyKeyRef.current = '';
              if (submit.kind === 'error') setSubmit({ kind: 'idle' });
            }}
            disabled={isBusy}
            className="mb-3 w-full rounded border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface)' }}
          >
            <option value="">— Chọn slot —</option>
            {eligibleSlots.map((slot) => (
              <option key={slot.slotId} value={slot.slotId}>
                {slot.staffingOrderCode} · {slot.positionTitle}
                {slot.location ? ` · ${slot.location}` : ''}
                {` · còn ${slot.slotsAvailable} chỗ · ${slot.orderStatus}`}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitDisabledReason !== null}
            data-testid="create-job-posting-submit"
            className="rounded px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor:
                submitDisabledReason === null ? 'var(--color-primary)' : 'var(--color-surface-container-high)',
              color: submitDisabledReason === null ? 'white' : 'var(--on-surface-variant)',
              cursor: submitDisabledReason === null ? 'pointer' : 'not-allowed',
            }}
          >
            {isBusy ? 'Đang tạo...' : 'Tạo JobPosting DRAFT'}
          </button>
        </>
      )}

      {submit.kind === 'error' ? (
        <p
          role="alert"
          className="mt-3 text-sm"
          style={{ color: 'var(--color-error, #b91c1c)' }}
        >
          {submit.message ?? 'Đã xảy ra lỗi.'}
        </p>
      ) : null}
    </form>
  );
}
