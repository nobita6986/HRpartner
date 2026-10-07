'use client';

/**
 * JobPostingEditorShell — P1-A0 admin authoring client component.
 *
 * Wires the JobPostingRichTextEditor (Tiptap) to the real persistence API:
 *   - PATCH /api/admin/jobs/job-postings/[id]   (save draft)
 *   - POST  /api/admin/jobs/job-postings/[id]/publish
 *   - POST  /api/admin/jobs/job-postings/[id]/unpublish
 *   - POST  /api/admin/jobs/job-postings/[id]/archive
 *
 * Optimistic revision: read initial revision from server, send it back on
 * every write; server bumps revision atomically. On 409 INVALID_REVISION the
 * user must reload — surface a clear error.
 *
 * Idempotency-Key: every write uses a freshly generated UUID v4 — the API
 * rejects duplicate keys so retries are safe.
 *
 * A0 allows:
 *   - title (string, required to publish)
 *   - salaryDisplay (string, optional)
 *   - descriptionJson (rich Tiptap doc, required to publish)
 *   - requirementsJson, benefitsJson, applicationInstructionsJson (optional)
 *   - contentSchemaVersion (currently locked to 1)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { JSONContent } from '@tiptap/core';

import { JobPostingRichTextEditor } from '@/src/shared/ui/editor/JobPostingRichTextEditor';
import { JOB_POSTING_RICH_TEXT_SCHEMA_VERSION } from '@/src/shared/content/job-posting-rich-text';
import type { JobPostingDetailDto } from '@/src/domains/staffing/job-posting-list.service';
import type { JobPostingLifecycleStatus } from '@/src/domains/staffing/job-posting-authoring.service';
import { jobOpeningStatusLabel } from '@/src/domains/staffing/job-opening-ui';
import { jobPostingStatusLabel } from '@/src/domains/staffing/job-posting-ui';
import {
  summarizeJobPostingApiError,
} from '@/src/domains/staffing/job-posting-error-map';
import type { JobPostingApiErrorSummary } from '@/src/domains/staffing/job-posting-error-map';
// hrp-t1c-jobposting-media-youtube (RQ-05..RQ-09, RQ-02..RQ-04): gallery + YouTube cards.
// Editor shell pre-loads initial server snapshot qua route handler
// `/api/admin/jobs/job-postings/[id]/media` để tránh waterfall.
import { JobPostingMediaCard, type JobPostingMediaAssignment } from './media-card';
import { JobPostingYouTubeCard } from './youtube-card';

interface JobPostingEditorShellProps {
  initial: JobPostingDetailDto;
  /**
   * hrp-t1c-jobposting-media-youtube (RQ-05): server-side pre-fetch của
   * `listJobPostingMedia` (PUBLIC media, cover-first, order ASC). Tránh
   * waterfall khi client mount — đã chạy trong Server Component page.
   */
  initialMedia: JobPostingMediaAssignment[];
  /** Mutation roles gate (server already enforces; this is just UI affordance). */
  canMutate: boolean;
}

type RichFieldKey = 'descriptionJson' | 'requirementsJson' | 'benefitsJson' | 'applicationInstructionsJson';

const RICH_FIELD_LABELS: Record<RichFieldKey, string> = {
  descriptionJson: 'Mô tả công việc (bắt buộc khi đăng tin)',
  requirementsJson: 'Yêu cầu ứng viên (tuỳ chọn)',
  benefitsJson: 'Phúc lợi (tuỳ chọn)',
  applicationInstructionsJson: 'Hướng dẫn ứng tuyển (tuỳ chọn)',
};

const RICH_FIELD_PLACEHOLDERS: Record<RichFieldKey, string> = {
  descriptionJson: 'Mô tả công việc — các heading H2/H3, danh sách bullet/numbered, đoạn văn, in đậm/nghiêng, link https://',
  requirementsJson: 'Yêu cầu ứng viên — bắt buộc có heading đầu tiên',
  benefitsJson: 'Phúc lợi — bullet list gọn',
  applicationInstructionsJson: 'Các bước nộp hồ sơ — numbered list',
};

function makeIdempotencyKey(): string {
  // RFC 4122 v4 — crypto.randomUUID is available in modern browsers & Node.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback (should not run in modern targets).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isRichDoc(value: unknown): value is JSONContent {
  if (!value || typeof value !== 'object') return false;
  return (value as { type?: unknown }).type === 'doc';
}

function asRichDoc(value: unknown): JSONContent {
  if (isRichDoc(value)) return value;
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

/**
 * hrp-m2a-operational-ux-debt (F8, integrated by T1B UI V1):
 * Replace the legacy `readErrorMessage` that echoed `body.message` /
 * `body.error` with a thin call into the repo-owned safe mapper
 * `summarizeJobPostingApiError`. The mapper NEVER echoes raw developer /
 * DB messages, UUIDs, SQL, stack traces, or PII — see
 * `src/domains/staffing/job-posting-error-map.ts`.
 *
 * T1A owns the mapper (Mốc 2A). T1B is the only allowed call site on the
 * editor shell per `docs/tasks/hrp-m2a-operational-ux-debt/HANDOFF.md §6`.
 *
 * When the recovery href is present (today only `JOB_OPENING_NOT_OPEN`),
 * the editor shell renders a `<Link>` to the canonical JobOpening page so
 * the operator can unblock the publish retry in one click.
 */
export async function readApiErrorSummary(
  res: Response,
  fallbackJobOpeningId: string | null,
): Promise<JobPostingApiErrorSummary> {
  let envelope: {
    status?: number;
    error?: string | null;
    details?: { jobOpeningId?: string | null; [k: string]: unknown } | null;
  } = {
    status: res.status,
  };
  try {
    const body = (await res.json()) as {
      status?: number;
      error?: string | null;
      message?: string;
      details?: { jobOpeningId?: string | null; [k: string]: unknown } | null;
    };
    envelope = {
      status: typeof body?.status === 'number' ? body.status : res.status,
      error: typeof body?.error === 'string' ? body.error : null,
      details: body?.details ?? null,
    };
  } catch {
    // Non-JSON or unreadable body — keep the status-only envelope; the mapper
    // collapses unknown shape to the generic safe fallback.
  }
  // Inject the editor's known jobOpeningId into details only when the
  // server envelope does NOT carry one — the server value is authoritative.
  if (
    fallbackJobOpeningId &&
    (!envelope.details || !('jobOpeningId' in envelope.details))
  ) {
    const base =
      envelope.details && typeof envelope.details === 'object'
        ? envelope.details
        : {};
    envelope.details = { ...base, jobOpeningId: fallbackJobOpeningId };
  }
  return summarizeJobPostingApiError(envelope);
}

export function JobPostingEditorShell({ initial, initialMedia, canMutate }: JobPostingEditorShellProps) {
  const router = useRouter();

  // ----- Local form state ------------------------------------------------
  const [title, setTitle] = useState<string>(initial.title ?? '');
  const [salaryDisplay, setSalaryDisplay] = useState<string>(initial.salaryDisplay ?? '');
  // hrp-p1-a0-1 (DEC-07): stamp toggles "Hot" + "Tuyển gấp" — lưu cùng draft update authority
  // (PATCH `/api/admin/jobs/job-postings/[id]`), optimistic revision giữ nguyên pattern.
  const [isHot, setIsHot] = useState<boolean>(initial.isHot ?? false);
  const [isUrgent, setIsUrgent] = useState<boolean>(initial.isUrgent ?? false);
  // hrp-ui-v1-job-card-stamps-brand (T1B / RQ-11 / DEC-09): 2 author-selected flag canonical
  // mới — "Thưởng cao" + "Sắp hết hạn". Cùng pattern: DRAFT-only, optimistic revision.
  const [isHighReward, setIsHighReward] = useState<boolean>(initial.isHighReward ?? false);
  const [isExpiringSoon, setIsExpiringSoon] = useState<boolean>(initial.isExpiringSoon ?? false);
  const [descriptionJson, setDescriptionJson] = useState<JSONContent>(() =>
    asRichDoc(initial.descriptionJson),
  );
  const [requirementsJson, setRequirementsJson] = useState<JSONContent>(() =>
    asRichDoc(initial.requirementsJson),
  );
  const [benefitsJson, setBenefitsJson] = useState<JSONContent>(() =>
    asRichDoc(initial.benefitsJson),
  );
  const [applicationInstructionsJson, setApplicationInstructionsJson] = useState<JSONContent>(() =>
    asRichDoc(initial.applicationInstructionsJson),
  );

  // Revision comes from the server; we send it back on every write.
  const [revision, setRevision] = useState<number>(initial.revision);
  const [status, setStatus] = useState<JobPostingLifecycleStatus>(initial.status);
  const [savedAt, setSavedAt] = useState<string | null>(initial.updatedAt ?? null);

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  /**
   * hrp-m2a-operational-ux-debt (F8, integrated by T1B UI V1):
   * Repo-owned mapper may return a recovery href (today only for
   * `JOB_OPENING_NOT_OPEN`). Rendered as a `<Link>` cạnh safe error UI.
   */
  const [errorRecoveryHref, setErrorRecoveryHref] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const initialSnapshotRef = useRef<{
    title: string;
    salaryDisplay: string;
    isHot: boolean;
    isUrgent: boolean;
    isHighReward: boolean;
    isExpiringSoon: boolean;
    descriptionJson: JSONContent;
    requirementsJson: JSONContent;
    benefitsJson: JSONContent;
    applicationInstructionsJson: JSONContent;
  }>({
    title: initial.title ?? '',
    salaryDisplay: initial.salaryDisplay ?? '',
    isHot: initial.isHot ?? false,
    isUrgent: initial.isUrgent ?? false,
    isHighReward: initial.isHighReward ?? false,
    isExpiringSoon: initial.isExpiringSoon ?? false,
    descriptionJson: asRichDoc(initial.descriptionJson),
    requirementsJson: asRichDoc(initial.requirementsJson),
    benefitsJson: asRichDoc(initial.benefitsJson),
    applicationInstructionsJson: asRichDoc(initial.applicationInstructionsJson),
  });

  // ----- Dirty tracking --------------------------------------------------
  useEffect(() => {
    const init = initialSnapshotRef.current;
    const dirty =
      title !== init.title ||
      salaryDisplay !== init.salaryDisplay ||
      isHot !== init.isHot ||
      isUrgent !== init.isUrgent ||
      // hrp-ui-v1-job-card-stamps-brand (T1B / RQ-11): 2 flag mới tham gia dirty check.
      isHighReward !== init.isHighReward ||
      isExpiringSoon !== init.isExpiringSoon ||
      JSON.stringify(descriptionJson) !== JSON.stringify(init.descriptionJson) ||
      JSON.stringify(requirementsJson) !== JSON.stringify(init.requirementsJson) ||
      JSON.stringify(benefitsJson) !== JSON.stringify(init.benefitsJson) ||
      JSON.stringify(applicationInstructionsJson) !==
        JSON.stringify(init.applicationInstructionsJson);
    setIsDirty(dirty);
  }, [
    title,
    salaryDisplay,
    isHot,
    isUrgent,
    // hrp-ui-v1-job-card-stamps-brand (T1B): 2 flag mới trong dependency array.
    isHighReward,
    isExpiringSoon,
    descriptionJson,
    requirementsJson,
    benefitsJson,
    applicationInstructionsJson,
  ]);

  // ----- Save (PATCH) ----------------------------------------------------
  const onSave = useCallback(async () => {
    if (!canMutate) {
      setErrorMessage('Tài khoản hiện tại không có quyền chỉnh sửa tin tuyển dụng.');
      setErrorRecoveryHref(null);
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    setErrorRecoveryHref(null);
    setInfoMessage(null);

    const body = {
      expectedRevision: revision,
      title: title.trim(),
      salaryDisplay: salaryDisplay.trim() === '' ? null : salaryDisplay,
      // hrp-p1-a0-1 (DEC-07): stamp flags gửi cùng draft update authority — server
      // service `updateDraftContent` đã có `assertBoolean` validator, không cần UI validator.
      isHot,
      isUrgent,
      // hrp-ui-v1-job-card-stamps-brand (T1B / RQ-11 / DEC-09): 2 flag mới gửi cùng body.
      isHighReward,
      isExpiringSoon,
      descriptionJson,
      requirementsJson,
      benefitsJson,
      applicationInstructionsJson,
      contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
    };

    try {
      const res = await fetch(`/api/admin/jobs/job-postings/${initial.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': makeIdempotencyKey(),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const summary = await readApiErrorSummary(res, initial.jobOpeningId ?? null);
        setErrorMessage(summary.label);
        setErrorRecoveryHref(summary.recoveryHref);
        return;
      }
      const json = (await res.json()) as { jobPosting: JobPostingDetailDto; replayed?: boolean };
      const updated = json.jobPosting;
      setRevision(updated.revision);
      setStatus(updated.status);
      setSavedAt(updated.updatedAt);
      // Update the snapshot baseline so `isDirty` flips false.
      initialSnapshotRef.current = {
        title: updated.title ?? '',
        salaryDisplay: updated.salaryDisplay ?? '',
        isHot: updated.isHot ?? false,
        isUrgent: updated.isUrgent ?? false,
        // hrp-ui-v1-job-card-stamps-brand (T1B): 2 flag mới copy từ response.
        isHighReward: updated.isHighReward ?? false,
        isExpiringSoon: updated.isExpiringSoon ?? false,
        descriptionJson: asRichDoc(updated.descriptionJson),
        requirementsJson: asRichDoc(updated.requirementsJson),
        benefitsJson: asRichDoc(updated.benefitsJson),
        applicationInstructionsJson: asRichDoc(updated.applicationInstructionsJson),
      };
      setTitle(initialSnapshotRef.current.title);
      setSalaryDisplay(initialSnapshotRef.current.salaryDisplay);
      setIsHot(initialSnapshotRef.current.isHot);
      setIsUrgent(initialSnapshotRef.current.isUrgent);
      // hrp-ui-v1-job-card-stamps-brand (T1B): set 2 flag mới về snapshot baseline.
      setIsHighReward(initialSnapshotRef.current.isHighReward);
      setIsExpiringSoon(initialSnapshotRef.current.isExpiringSoon);
      setDescriptionJson(initialSnapshotRef.current.descriptionJson);
      setRequirementsJson(initialSnapshotRef.current.requirementsJson);
      setBenefitsJson(initialSnapshotRef.current.benefitsJson);
      setApplicationInstructionsJson(initialSnapshotRef.current.applicationInstructionsJson);
      setInfoMessage(json.replayed ? 'Thay đổi đã được lưu trước đó.' : `Đã lưu bản nháp v${updated.revision}.`);
      setErrorRecoveryHref(null);
    } catch {
      setErrorMessage('Không thể kết nối máy chủ. Vui lòng thử lại.');
      setErrorRecoveryHref(null);
    } finally {
      setIsSaving(false);
    }
  }, [
    canMutate,
    revision,
    title,
    salaryDisplay,
    isHot,
    isUrgent,
    // hrp-ui-v1-job-card-stamps-brand (T1B): 2 flag mới trong dependency array.
    isHighReward,
    isExpiringSoon,
    descriptionJson,
    requirementsJson,
    benefitsJson,
    applicationInstructionsJson,
    initial.id,
  ]);

  // ----- Publish / unpublish / archive ----------------------------------
  const runStateMutation = useCallback(
    async (action: 'publish' | 'unpublish' | 'archive') => {
      if (!canMutate) {
        setErrorMessage('Tài khoản hiện tại không có quyền chỉnh sửa tin tuyển dụng.');
        setErrorRecoveryHref(null);
        return;
      }
      setIsSaving(true);
      setErrorMessage(null);
      setErrorRecoveryHref(null);
      setInfoMessage(null);
      try {
        const res = await fetch(`/api/admin/jobs/job-postings/${initial.id}/${action}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': makeIdempotencyKey(),
          },
          body: JSON.stringify({ expectedRevision: revision }),
        });
        if (!res.ok) {
          const summary = await readApiErrorSummary(res, initial.jobOpeningId ?? null);
          setErrorMessage(summary.label);
          setErrorRecoveryHref(summary.recoveryHref);
          return;
        }
        const json = (await res.json()) as { jobPosting: JobPostingDetailDto; replayed?: boolean };
        const updated = json.jobPosting;
        setRevision(updated.revision);
        setStatus(updated.status);
        setSavedAt(updated.updatedAt);
        setInfoMessage(
          json.replayed
            ? 'Trạng thái đã được cập nhật trước đó.'
            : `Đã ${labelOf(action)} → ${updated.status}.`,
        );
        setErrorRecoveryHref(null);
        // Trigger revalidation so the list page reflects the new state too.
        router.refresh();
      } catch {
        setErrorMessage('Không thể kết nối máy chủ. Vui lòng thử lại.');
        setErrorRecoveryHref(null);
      } finally {
        setIsSaving(false);
      }
    },
    [canMutate, revision, initial.id, router],
  );

  const canPublish = useMemo(() => {
    if (!canMutate) return false;
    if (status !== 'DRAFT') return false;
    if (title.trim().length === 0) return false;
    if (descriptionJson === null) return false;
    // hrp-t1a-postdeploy-runtime-correction-2 (round 2): the server
    // contract `JOB_OPENING_NOT_OPEN` (409) is preserved as-is — we
    // only gate the click on the client side so admin sees the bridge
    // (link + reason) instead of hitting a useless 409. Source of truth
    // for the OPENED state is `initial.opening?.status`; the server
    // still re-validates on every call.
    if (initial.opening === null) return false;
    if (initial.opening.status !== 'OPEN') return false;
    return true;
  }, [canMutate, status, title, descriptionJson, initial.opening]);

  // hrp-t1a-postdeploy-runtime-correction-2 (round 2): explain WHY
  // Publish is disabled so admin has an actionable next step.
  const publishBlockedReason = useMemo<string | null>(() => {
    if (!canMutate) {
      return 'Tài khoản hiện tại không có quyền đăng tin tuyển dụng.';
    }
    if (status !== 'DRAFT') {
      return `Chỉ có thể đăng tin khi tin đang ở trạng thái bản nháp. Trạng thái hiện tại: ${jobPostingStatusLabel(status)}.`;
    }
    if (title.trim().length === 0) {
      return 'Cần nhập tiêu đề tin tuyển dụng trước khi đăng.';
    }
    if (descriptionJson === null) {
      return 'Mô tả công việc (description) là bắt buộc trước khi publish.';
    }
    if (initial.opening === null) {
      return 'Tin tuyển dụng chưa được gắn với đợt tuyển dụng nào.';
    }
    if (initial.opening.status !== 'OPEN') {
      return `Đợt tuyển dụng liên kết đang ở trạng thái ${jobOpeningStatusLabel(initial.opening.status)}; cần mở đợt tuyển dụng trước khi đăng tin.`;
    }
    return null;
  }, [canMutate, status, title, descriptionJson, initial.opening]);

  return (
    <div className="flex flex-col gap-6">
      {/* Status banner */}
      <section
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
        style={{
          borderColor: 'var(--outline)',
          backgroundColor: 'var(--color-surface-container)',
          color: 'var(--on-surface-variant)',
        }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <span>
            Trạng thái: <strong style={{ color: 'var(--on-surface)' }}>{jobPostingStatusLabel(status)}</strong>
            {' · '}
            Lần chỉnh sửa: <strong style={{ color: 'var(--on-surface)' }}>v{revision}</strong>
            {savedAt && (
              <>
                {' · '}
                <span>Đã ghi lúc: {new Date(savedAt).toLocaleString('vi-VN')}</span>
              </>
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            disabled={!canMutate || isSaving || !isDirty || status !== 'DRAFT'}
            onClick={onSave}
            label={isSaving ? 'Đang lưu…' : 'Lưu bản nháp'}
            dataTestid="editor-save-button"
          />
          <ActionButton
            disabled={!canPublish || isSaving}
            onClick={() => runStateMutation('publish')}
            label="Đăng tin"
            ariaLabel="Đăng tin"
            primary
            dataTestid="publish-button"
          />
          <ActionButton
            disabled={!canMutate || isSaving || status !== 'PUBLISHED'}
            onClick={() => runStateMutation('unpublish')}
            label="Gỡ tin"
            ariaLabel="Gỡ tin"
          />
          <ActionButton
            disabled={!canMutate || isSaving || status === 'ARCHIVED'}
            onClick={() => runStateMutation('archive')}
            label="Lưu trữ"
            ariaLabel="Lưu trữ"
            danger
          />
        </div>
      </section>

      {/* hrp-t1a-postdeploy-runtime-correction-2 (round 2):
          Publish-gating UX. The server contract `JOB_OPENING_NOT_OPEN` (409)
          is preserved. We expose the disabled reason + a deep-link into the
          JobOpening so admin has an actionable next step instead of a dead
          end (was the bug Owner captured: nút Publish bật nhưng server 409
          fail-closed mà không có bridge). */}
      {!canPublish && publishBlockedReason && status === 'DRAFT' && (
        <section
          className="rounded border p-3 text-sm"
          style={{
            borderColor: 'var(--outline-variant)',
            backgroundColor: 'var(--color-surface-container)',
            color: 'var(--on-surface-variant)',
          }}
          data-testid="publish-blocked-banner"
          role="status"
          aria-live="polite"
        >
          <div className="font-medium" style={{ color: 'var(--on-surface)' }}>
            Chưa thể đăng tin
          </div>
          <p className="mt-1" data-testid="publish-blocked-reason">
            {publishBlockedReason}
          </p>
          {initial.opening !== null && initial.opening.status !== 'OPEN' && (
            <p className="mt-1">
              <a
                href={`/admin/job-openings/${initial.opening.id}`}
                className="text-sm font-medium underline"
                style={{ color: 'var(--color-primary-dark)' }}
                data-testid="publish-blocked-link"
              >
                Mở đợt tuyển dụng để tiếp tục
              </a>
            </p>
          )}
        </section>
      )}

      {errorMessage && (
        <div
          role="alert"
          data-testid="editor-safe-error"
          className="rounded border p-3 text-sm"
          style={{ borderColor: '#f5b5b5', backgroundColor: '#fdecec', color: '#8a1c1c' }}
        >
          {errorMessage}
          {errorRecoveryHref && (
            <>
              {' '}
              <Link
                href={errorRecoveryHref}
                className="underline"
                style={{ color: '#8a1c1c' }}
              >
                Mở đợt tuyển dụng →
              </Link>
            </>
          )}
        </div>
      )}
      {infoMessage && (
        <div
          role="status"
          className="rounded border p-3 text-sm"
          style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--color-surface)', color: 'var(--on-surface)' }}
        >
          {infoMessage}
        </div>
      )}

      {/* Title + salary + stamp toggles */}
      <section className="rounded-xl border p-4" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--color-surface)' }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldShell label="Tiêu đề tin tuyển dụng (bắt buộc khi đăng)">
            <input
              type="text"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canMutate || isSaving || status === 'ARCHIVED'}
              className="w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface-container-lowest)' }}
              placeholder="Ví dụ: Kỹ sư điện công trình — Hà Nội"
            />
          </FieldShell>
          <FieldShell label="Mức lương hiển thị (không bắt buộc)">
            <input
              type="text"
              value={salaryDisplay}
              maxLength={200}
              onChange={(e) => setSalaryDisplay(e.target.value)}
              disabled={!canMutate || isSaving || status === 'ARCHIVED'}
              className="w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface-container-lowest)' }}
              placeholder="Ví dụ: 25–35 triệu VNĐ hoặc Thoả thuận"
            />
          </FieldShell>
        </div>

        {/* hrp-p1-a0-1 (DEC-07): stamp toggles — 2 boolean độc lập "Hot" và "Tuyển gấp".
            Lưu cùng draft update authority (PATCH). DRAFT-only editing semantics theo
            lifecycle P1-A0; nếu muốn đổi stamp của PUBLISHED phải đi qua lifecycle canonical.
            C-04 (correction batch 1/1): disabled unless status === 'DRAFT'. Trước đây chỉ
            disable cho ARCHIVED — giờ PUBLISHED cũng bị disable để đảm bảo stamp chỉ edit
            được ở DRAFT. Đổi stamp của PUBLISHED phải unpublish trước.
            hrp-ui-v1-job-card-stamps-brand (T1B / RQ-11): 2 author-selected toggle canonical
            mới "Thưởng cao" + "Sắp hết hạn". Cùng semantics: author tự chọn, KHÔNG heuristic,
            DRAFT-only, lưu cùng PATCH idempotency hash. */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>
            Nhãn nổi bật:
          </span>
          <StampToggle
            label="Nổi bật"
            ariaLabel="Đánh dấu tin tuyển dụng là nổi bật"
            checked={isHot}
            disabled={!canMutate || isSaving || status !== 'DRAFT'}
            onChange={setIsHot}
            testId="stamp-toggle-hot"
          />
          <StampToggle
            label="Tuyển gấp"
            ariaLabel="Đánh dấu tin tuyển dụng là tuyển gấp"
            checked={isUrgent}
            disabled={!canMutate || isSaving || status !== 'DRAFT'}
            onChange={setIsUrgent}
            testId="stamp-toggle-urgent"
          />
          <StampToggle
            label="Thưởng cao"
            ariaLabel="Đánh dấu tin tuyển dụng có thưởng cao"
            checked={isHighReward}
            disabled={!canMutate || isSaving || status !== 'DRAFT'}
            onChange={setIsHighReward}
            testId="stamp-toggle-reward"
          />
          <StampToggle
            label="Sắp hết hạn"
            ariaLabel="Đánh dấu tin tuyển dụng sắp hết hạn"
            checked={isExpiringSoon}
            disabled={!canMutate || isSaving || status !== 'DRAFT'}
            onChange={setIsExpiringSoon}
            testId="stamp-toggle-expiring"
          />
          <span className="ml-auto text-xs italic" style={{ color: 'var(--on-surface-variant)' }}>
            Các nhãn nổi bật không tự động thay đổi. Chỉ chỉnh sửa được khi tin còn là bản nháp.
          </span>
        </div>
      </section>

      {/* hrp-t1c-jobposting-media-youtube (RQ-05..RQ-09, RQ-02..RQ-04):
          Gallery media + YouTube URL. Server đã load `initialMedia` qua
          `listJobPostingMedia` trong Server Component page để tránh waterfall.
          Mỗi card là client component độc lập — chỉ tự gọi API khi user
          thao tác. Editor shell chỉ nhận `onPatched` callback để sync
          `revision` (dùng cho dirty tracking nếu cần). */}
      <JobPostingMediaCard
        jobPostingId={initial.id}
        initialItems={initialMedia}
        canMutate={canMutate}
        isSaving={isSaving}
        status={status}
        onPatched={() => {
          // Bump revision để dirty tracking & next PATCH không trượt 409.
          setRevision((prev) => prev + 1);
        }}
        onError={(label) => {
          if (label) {
            setErrorMessage(label);
            setErrorRecoveryHref(null);
          } else {
            setErrorMessage(null);
            setErrorRecoveryHref(null);
          }
        }}
      />
      <JobPostingYouTubeCard
        jobPostingId={initial.id}
        initialVideoId={initial.youtubeVideoId ?? null}
        initialRevision={revision}
        canMutate={canMutate}
        isSaving={isSaving}
        status={status}
        onPatched={(updated) => {
          setRevision(updated.revision);
          setSavedAt(updated.updatedAt);
        }}
        onError={(label) => {
          if (label) {
            setErrorMessage(label);
            setErrorRecoveryHref(null);
          } else {
            setErrorMessage(null);
            setErrorRecoveryHref(null);
          }
        }}
      />

      {/* Rich content fields */}
      <RichFieldCard
        label={RICH_FIELD_LABELS.descriptionJson}
        placeholder={RICH_FIELD_PLACEHOLDERS.descriptionJson}
        value={descriptionJson}
        onChange={setDescriptionJson}
        requiredForPublish
      />
      <RichFieldCard
        label={RICH_FIELD_LABELS.requirementsJson}
        placeholder={RICH_FIELD_PLACEHOLDERS.requirementsJson}
        value={requirementsJson}
        onChange={setRequirementsJson}
      />
      <RichFieldCard
        label={RICH_FIELD_LABELS.benefitsJson}
        placeholder={RICH_FIELD_PLACEHOLDERS.benefitsJson}
        value={benefitsJson}
        onChange={setBenefitsJson}
      />
      <RichFieldCard
        label={RICH_FIELD_LABELS.applicationInstructionsJson}
        placeholder={RICH_FIELD_PLACEHOLDERS.applicationInstructionsJson}
        value={applicationInstructionsJson}
        onChange={setApplicationInstructionsJson}
      />
    </div>
  );
}

function labelOf(action: 'publish' | 'unpublish' | 'archive'): string {
  if (action === 'publish') return 'publish';
  if (action === 'unpublish') return 'unpublish';
  return 'archive';
}

function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * hrp-p1-a0-1 (DEC-07): toggle cho stamp boolean (`isHot` / `isUrgent`). UI controlled
 * (props-driven), gửi giá trị qua PATCH draft update cùng các field khác. Native
 * `<input type="checkbox">` để giữ accessibility (label click, keyboard, screen reader).
 */
function StampToggle({
  label,
  ariaLabel,
  checked,
  disabled,
  onChange,
  testId,
}: {
  label: string;
  ariaLabel: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  testId: string;
}) {
  return (
    <label
      className="inline-flex items-center gap-2"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={ariaLabel}
        data-testid={testId}
        className="h-4 w-4"
        style={{ accentColor: 'var(--color-primary)' }}
      />
      <span style={{ color: 'var(--on-surface)' }}>{label}</span>
    </label>
  );
}

function ActionButton({
  label,
  ariaLabel,
  onClick,
  disabled,
  primary,
  danger,
  dataTestid,
}: {
  /** Visible button text (operator-facing). Vietnamese per F11 binding §9. */
  label: string;
  /**
   * Canonical lifecycle operation name (English) for accessibility / screen
   * readers / programmatic API keys. T0 §2 #2 binding: the canonical name is
   * preserved; it MUST NOT be the primary operator-facing text.
   */
  ariaLabel?: string;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
  danger?: boolean;
  // hrp-t1a-postdeploy-runtime-correction-2 (round 2): optional test hook
  // for the Publish button. Other ActionButton call sites can keep their
  // existing rendered markup.
  dataTestid?: string;
}) {
  const bg = primary
    ? 'var(--color-primary-soft)'
    : danger
    ? '#fdecec'
    : 'var(--color-surface-container-lowest)';
  const fg = primary ? 'var(--color-primary-dark)' : danger ? '#8a1c1c' : 'var(--on-surface)';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={dataTestid}
      aria-label={ariaLabel}
      className="rounded border px-3 py-1 text-sm font-medium"
      style={{
        borderColor: primary ? 'var(--color-primary)' : danger ? '#f5b5b5' : 'var(--outline)',
        backgroundColor: bg,
        color: fg,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function RichFieldCard({
  label,
  placeholder,
  value,
  onChange,
  requiredForPublish,
}: {
  label: string;
  placeholder: string;
  value: JSONContent;
  onChange: (next: JSONContent) => void;
  requiredForPublish?: boolean;
}) {
  return (
    <section
      className="rounded-xl border"
      style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--color-surface)' }}
    >
      <header
        className="border-b px-4 py-3"
        style={{ borderColor: 'var(--outline-variant)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
          {label}
          {requiredForPublish && (
            <span className="ml-2 text-xs font-normal" style={{ color: '#8a1c1c' }}>
              (bắt buộc)
            </span>
          )}
        </h2>
      </header>
      <div className="p-4">
        <JobPostingRichTextEditor
          initialContent={value}
          placeholder={placeholder}
          onChange={(next) => onChange(next ?? { type: 'doc', content: [{ type: 'paragraph' }] })}
        />
      </div>
    </section>
  );
}
