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
import { useRouter } from 'next/navigation';
import type { JSONContent } from '@tiptap/core';

import { JobPostingRichTextEditor } from '@/src/shared/ui/editor/JobPostingRichTextEditor';
import {
  JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
} from '@/src/shared/content/job-posting-rich-text';
import type { JobPostingDetailDto } from '@/src/domains/staffing/job-posting-list.service';
import type { JobPostingLifecycleStatus } from '@/src/domains/staffing/job-posting-authoring.service';

interface JobPostingEditorShellProps {
  initial: JobPostingDetailDto;
  /** Mutation roles gate (server already enforces; this is just UI affordance). */
  canMutate: boolean;
}

type RichFieldKey = 'descriptionJson' | 'requirementsJson' | 'benefitsJson' | 'applicationInstructionsJson';

const RICH_FIELD_LABELS: Record<RichFieldKey, string> = {
  descriptionJson: 'Mô tả công việc (bắt buộc khi publish)',
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

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body?.message ?? body?.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export function JobPostingEditorShell({ initial, canMutate }: JobPostingEditorShellProps) {
  const router = useRouter();

  // ----- Local form state ------------------------------------------------
  const [title, setTitle] = useState<string>(initial.title ?? '');
  const [salaryDisplay, setSalaryDisplay] = useState<string>(initial.salaryDisplay ?? '');
  // hrp-p1-a0-1 (DEC-07): stamp toggles "Hot" + "Tuyển gấp" — lưu cùng draft update authority
  // (PATCH `/api/admin/jobs/job-postings/[id]`), optimistic revision giữ nguyên pattern.
  const [isHot, setIsHot] = useState<boolean>(initial.isHot ?? false);
  const [isUrgent, setIsUrgent] = useState<boolean>(initial.isUrgent ?? false);
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
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const initialSnapshotRef = useRef<{
    title: string;
    salaryDisplay: string;
    isHot: boolean;
    isUrgent: boolean;
    descriptionJson: JSONContent;
    requirementsJson: JSONContent;
    benefitsJson: JSONContent;
    applicationInstructionsJson: JSONContent;
  }>({
    title: initial.title ?? '',
    salaryDisplay: initial.salaryDisplay ?? '',
    isHot: initial.isHot ?? false,
    isUrgent: initial.isUrgent ?? false,
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
    descriptionJson,
    requirementsJson,
    benefitsJson,
    applicationInstructionsJson,
  ]);

  // ----- Save (PATCH) ----------------------------------------------------
  const onSave = useCallback(async () => {
    if (!canMutate) {
      setErrorMessage('Role hiện tại không có quyền ghi JobPosting.');
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    setInfoMessage(null);

    const body = {
      expectedRevision: revision,
      title: title.trim(),
      salaryDisplay: salaryDisplay.trim() === '' ? null : salaryDisplay,
      // hrp-p1-a0-1 (DEC-07): stamp flags gửi cùng draft update authority — server
      // service `updateDraftContent` đã có `assertBoolean` validator, không cần UI validator.
      isHot,
      isUrgent,
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
        setErrorMessage(await readErrorMessage(res));
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
        descriptionJson: asRichDoc(updated.descriptionJson),
        requirementsJson: asRichDoc(updated.requirementsJson),
        benefitsJson: asRichDoc(updated.benefitsJson),
        applicationInstructionsJson: asRichDoc(updated.applicationInstructionsJson),
      };
      setTitle(initialSnapshotRef.current.title);
      setSalaryDisplay(initialSnapshotRef.current.salaryDisplay);
      setIsHot(initialSnapshotRef.current.isHot);
      setIsUrgent(initialSnapshotRef.current.isUrgent);
      setDescriptionJson(initialSnapshotRef.current.descriptionJson);
      setRequirementsJson(initialSnapshotRef.current.requirementsJson);
      setBenefitsJson(initialSnapshotRef.current.benefitsJson);
      setApplicationInstructionsJson(initialSnapshotRef.current.applicationInstructionsJson);
      setInfoMessage(json.replayed ? 'Đã ghi (idempotent replay).' : `Đã lưu bản nháp v${updated.revision}.`);
    } catch (e) {
      setErrorMessage(`Network error: ${(e as Error).message}`);
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
        setErrorMessage('Role hiện tại không có quyền mutate JobPosting.');
        return;
      }
      setIsSaving(true);
      setErrorMessage(null);
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
          setErrorMessage(await readErrorMessage(res));
          return;
        }
        const json = (await res.json()) as { jobPosting: JobPostingDetailDto; replayed?: boolean };
        const updated = json.jobPosting;
        setRevision(updated.revision);
        setStatus(updated.status);
        setSavedAt(updated.updatedAt);
        setInfoMessage(
          json.replayed
            ? `Trạng thái đã cập nhật (idempotent replay).`
            : `Đã ${labelOf(action)} → ${updated.status}.`,
        );
        // Trigger revalidation so the list page reflects the new state too.
        router.refresh();
      } catch (e) {
        setErrorMessage(`Network error: ${(e as Error).message}`);
      } finally {
        setIsSaving(false);
      }
    },
    [canMutate, revision, initial.id, router],
  );

  const canPublish = useMemo(() => {
    return (
      canMutate &&
      status === 'DRAFT' &&
      title.trim().length > 0 &&
      descriptionJson !== null
    );
  }, [canMutate, status, title, descriptionJson]);

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
            Trạng thái: <strong style={{ color: 'var(--on-surface)' }}>{status}</strong>
            {' · '}
            Revision: <strong style={{ color: 'var(--on-surface)' }}>v{revision}</strong>
            {' · '}
            Schema: <strong style={{ color: 'var(--on-surface)' }}>
              v{JOB_POSTING_RICH_TEXT_SCHEMA_VERSION}
            </strong>
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
          />
          <ActionButton
            disabled={!canPublish || isSaving}
            onClick={() => runStateMutation('publish')}
            label="Publish"
            primary
          />
          <ActionButton
            disabled={!canMutate || isSaving || status !== 'PUBLISHED'}
            onClick={() => runStateMutation('unpublish')}
            label="Unpublish"
          />
          <ActionButton
            disabled={!canMutate || isSaving || status === 'ARCHIVED'}
            onClick={() => runStateMutation('archive')}
            label="Archive"
            danger
          />
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="rounded border p-3 text-sm"
          style={{ borderColor: '#f5b5b5', backgroundColor: '#fdecec', color: '#8a1c1c' }}
        >
          {errorMessage}
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
          <FieldShell label="Tiêu đề JobPosting (bắt buộc khi publish)">
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
          <FieldShell label="Hiển thị lương (free-form, tuỳ chọn)">
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
            Disabled khi status = ARCHIVED. */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>
            Stamp:
          </span>
          <StampToggle
            label="Hot"
            ariaLabel="Đánh dấu JobPosting là Hot"
            checked={isHot}
            disabled={!canMutate || isSaving || status === 'ARCHIVED'}
            onChange={setIsHot}
            testId="stamp-toggle-hot"
          />
          <StampToggle
            label="Tuyển gấp"
            ariaLabel="Đánh dấu JobPosting là Tuyển gấp"
            checked={isUrgent}
            disabled={!canMutate || isSaving || status === 'ARCHIVED'}
            onChange={setIsUrgent}
            testId="stamp-toggle-urgent"
          />
          <span className="ml-auto text-xs italic" style={{ color: 'var(--on-surface-variant)' }}>
            Public render stamp theo `isHot` + `isUrgent` (canonical boolean), không heuristic.
          </span>
        </div>
      </section>

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
  onClick,
  disabled,
  primary,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
  danger?: boolean;
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
