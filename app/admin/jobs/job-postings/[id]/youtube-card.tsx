'use client';

/**
 * JobPostingYouTubeCard — hrp-t1c-jobposting-media-youtube (RQ-02, RQ-03, RQ-04, DEC-02, DEC-04).
 *
 * Card YouTube cho JobPosting editor shell:
 *   - Input URL YouTube hoặc raw 11-char ID
 *   - Client-side preview videoId qua `extractYouTubeVideoId` (UI affordance, không thay thế server check)
 *   - Lưu qua PATCH `/api/admin/jobs/job-postings/[id]` cùng `expectedRevision` —
 *     server vẫn là authority validate + canonical hoá (assertYouTubeVideoId → extractYouTubeVideoId).
 *   - Empty string hoặc "xóa video" → gửi `null` để clear.
 *
 * Không cho phép iframe/HTML tùy ý (input type=url + URL/ID validation).
 * Không autoplay (chỉ hiện URL preview, embed thực sự ở public render).
 */
import { useCallback, useMemo, useState } from 'react';

import { extractYouTubeVideoId } from '@/src/domains/media/youtube';
import type { JobPostingDetailDto } from '@/src/domains/staffing/job-posting-list.service';

export interface JobPostingYouTubeCardProps {
  jobPostingId: string;
  initialVideoId: string | null;
  initialRevision: number;
  canMutate: boolean;
  isSaving: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  /** Notify parent shell that this card produced a successful save. */
  onPatched: (next: JobPostingDetailDto) => void;
  /** Allow parent shell to surface a top-level error when the card returns one. */
  onError?: (label: string) => void;
}

const YOUTUBE_HELP_URL = 'https://support.google.com/youtube/answer/6375114';

function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function JobPostingYouTubeCard({
  jobPostingId,
  initialVideoId,
  initialRevision,
  canMutate,
  isSaving,
  status,
  onPatched,
  onError,
}: JobPostingYouTubeCardProps) {
  const [draft, setDraft] = useState<string>(initialVideoId ?? '');
  const [revision, setRevision] = useState<number>(initialRevision);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardInfo, setCardInfo] = useState<string | null>(null);
  const [localSaving, setLocalSaving] = useState<boolean>(false);

  // Live preview: chỉ echo videoId khi shape hợp lệ.
  const previewVideoId = useMemo<string | null>(() => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return null;
    return extractYouTubeVideoId(trimmed);
  }, [draft]);

  // Card-level dirty: chỉ true khi input thay đổi so với server snapshot.
  const isDirty = useMemo<boolean>(() => {
    const serverId = initialVideoId ?? '';
    return draft.trim() !== serverId;
  }, [draft, initialVideoId]);

  const disabledReason = useMemo<string | null>(() => {
    if (!canMutate) return 'Tài khoản hiện tại không có quyền chỉnh sửa video YouTube.';
    if (status === 'ARCHIVED') return 'Tin tuyển dụng đã được lưu trữ; không chỉnh sửa được.';
    if (status === 'PUBLISHED') {
      return 'Tin tuyển dụng đang được đăng; gỡ tin trước khi sửa video YouTube.';
    }
    if (localSaving || isSaving) return 'Đang lưu…';
    return null;
  }, [canMutate, status, localSaving, isSaving]);

  const inputDisabled = disabledReason !== null;

  const onSave = useCallback(async () => {
    setCardError(null);
    setCardInfo(null);
    if (onError) onError('');

    const trimmed = draft.trim();
    let payload: { youtubeVideoId: string | null } | null = null;
    if (trimmed.length === 0) {
      payload = { youtubeVideoId: null };
    } else {
      const videoId = extractYouTubeVideoId(trimmed);
      if (!videoId) {
        setCardError(
          'URL YouTube không hợp lệ. Chỉ chấp nhận youtube.com / youtu.be hoặc mã 11 ký tự.',
        );
        return;
      }
      // Server vẫn là authority — nếu đã pass `extractYouTubeVideoId` ở client thì gần như chắc chắn pass server.
      payload = { youtubeVideoId: videoId };
    }

    if (!payload) return;
    setLocalSaving(true);
    try {
      const res = await fetch(`/api/admin/jobs/job-postings/${jobPostingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': makeIdempotencyKey(),
        },
        body: JSON.stringify({
          expectedRevision: revision,
          youtubeVideoId: payload.youtubeVideoId,
        }),
      });
      if (!res.ok) {
        // Pass the safe-mapped label up to the parent shell if it wants; otherwise keep local.
        const body = (await res.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        const label =
          body?.message && body.message.length < 200
            ? body.message
            : 'Không thể lưu video YouTube. Vui lòng thử lại.';
        setCardError(label);
        if (onError) onError(label);
        return;
      }
      const json = (await res.json()) as {
        jobPosting: JobPostingDetailDto;
        replayed?: boolean;
      };
      const updated = json.jobPosting;
      setRevision(updated.revision);
      setDraft(updated.youtubeVideoId ?? '');
      setCardInfo(
        json.replayed
          ? 'Video đã được lưu trước đó.'
          : `Đã lưu video (phiên bản v${updated.revision}).`,
      );
      onPatched(updated);
    } catch {
      const label = 'Không thể kết nối máy chủ. Vui lòng thử lại.';
      setCardError(label);
      if (onError) onError(label);
    } finally {
      setLocalSaving(false);
    }
  }, [draft, jobPostingId, onError, onPatched, revision]);

  const onClear = useCallback(() => {
    setCardError(null);
    setCardInfo(null);
    setDraft('');
  }, []);

  return (
    <section
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--color-surface)' }}
      data-testid="youtube-card"
      data-source="REAL"
      data-job-posting-id={jobPostingId}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--on-surface)' }}
          data-testid="youtube-card-title"
        >
          Video YouTube giới thiệu
        </h2>
        <span
          className="text-xs"
          style={{ color: 'var(--on-surface-variant)' }}
          data-testid="youtube-card-status"
        >
          {initialVideoId ? 'Đã gắn video' : 'Chưa có video'}
        </span>
      </header>

      <p className="mb-3 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
        Dán URL YouTube (youtube.com / youtu.be) hoặc mã 11 ký tự. Máy chủ sẽ chuẩn hoá và chỉ lưu mã video.
        Chỉ nhúng ở trang công khai; không nhập iframe/HTML.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
          URL hoặc mã video
        </span>
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={inputDisabled}
          maxLength={2048}
          placeholder="https://www.youtube.com/watch?v=... hoặc dQw4w9WgXcQ"
          data-testid="youtube-card-input"
          aria-label="Nhập URL YouTube hoặc mã 11 ký tự"
          className="w-full rounded border px-2 py-1 text-sm"
          style={{
            borderColor: 'var(--outline)',
            backgroundColor: 'var(--surface-container-lowest)',
          }}
        />
      </label>

      <div
        className="mt-2 text-xs"
        style={{ color: 'var(--on-surface-variant)' }}
        data-testid="youtube-card-preview-status"
      >
        {draft.trim().length === 0
          ? 'Bỏ trống → sẽ xoá video khỏi tin tuyển dụng khi lưu.'
          : previewVideoId
            ? `Hợp lệ — mã video ${previewVideoId}.`
            : 'Chưa hợp lệ. Chỉ chấp nhận URL youtube.com / youtu.be hoặc mã 11 ký tự [A-Za-z0-9_-].'}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={inputDisabled || !isDirty}
          data-testid="youtube-card-save"
          aria-label="Lưu video YouTube"
          className="rounded border px-3 py-1 text-sm font-medium"
          style={{
            borderColor: 'var(--color-primary)',
            backgroundColor: 'var(--color-primary-soft)',
            color: 'var(--color-primary-dark)',
            opacity: inputDisabled || !isDirty ? 0.5 : 1,
            cursor: inputDisabled || !isDirty ? 'not-allowed' : 'pointer',
          }}
        >
          {localSaving || isSaving ? 'Đang lưu…' : 'Lưu video'}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={inputDisabled || (draft.trim().length === 0 && !cardError && !cardInfo)}
          data-testid="youtube-card-clear"
          aria-label="Xoá nội dung ô nhập"
          className="rounded border px-3 py-1 text-sm font-medium"
          style={{
            borderColor: 'var(--outline)',
            backgroundColor: 'var(--color-surface-container-lowest)',
            color: 'var(--on-surface)',
          }}
        >
          Xoá ô nhập
        </button>
        {disabledReason && (
          <span
            className="text-xs italic"
            style={{ color: 'var(--on-surface-variant)' }}
            data-testid="youtube-card-disabled-reason"
          >
            {disabledReason}
          </span>
        )}
        <a
          href={YOUTUBE_HELP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs underline"
          style={{ color: 'var(--color-primary-dark)' }}
          data-testid="youtube-card-help"
        >
          Cách lấy URL
        </a>
      </div>

      {cardError && (
        <div
          role="alert"
          data-testid="youtube-card-error"
          className="mt-3 rounded border p-2 text-xs"
          style={{
            borderColor: '#f5b5b5',
            backgroundColor: '#fdecec',
            color: '#8a1c1c',
          }}
        >
          {cardError}
        </div>
      )}
      {cardInfo && !cardError && (
        <div
          role="status"
          data-testid="youtube-card-info"
          className="mt-3 rounded border p-2 text-xs"
          style={{
            borderColor: 'var(--outline)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--on-surface)',
          }}
        >
          {cardInfo}
        </div>
      )}
    </section>
  );
}
