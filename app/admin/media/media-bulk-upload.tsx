'use client';

/**
 * media-bulk-upload.tsx — hrp-t1c-media-global-pool-bulk-upload-hotfix (RQ-15).
 *
 * Bulk upload queue cho Media Library. Tối đa 20 file/batch; bounded
 * concurrency 3; per-item status (Chờ tải / Đang tải / Thành công / Thất bại);
 * tiến độ tổng; retry chỉ ERROR; cleanup URL.createObjectURL.
 *
 * Server vẫn authority cho alt: helper `deriveMediaAlt(file.name)` chạy 1
 * lần trên client để preview (UI read-only), nhưng server cũng derive từ
 * filename trên `confirm` route. Hai lần derive cho cùng input → cùng alt
 * (deterministic).
 */

import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import {
  MEDIA_ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  type MediaItemDto,
  type MediaStatusEnum,
} from '@/src/domains/media/media.types';
import { deriveMediaAlt } from '@/src/domains/media/media-alt';

const DEFAULT_MAX_FILES = 20;
const DEFAULT_MAX_CONCURRENCY = 3;

type BatchItemStatus = 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'ERROR';

export interface BatchItem {
  id: string; // crypto.randomUUID()
  file: File;
  previewUrl: string;
  alt: string; // deriveMediaAlt(file.name)
  status: BatchItemStatus;
  error?: string;
  mediaItem?: MediaItemDto;
}

export interface MediaBulkUploadProps {
  /** Callback khi 1 item upload + confirm thành công (UI update). */
  onUploaded: (item: MediaItemDto) => void;
  /** Callback đóng modal. Optional — khi undefined, render inline (không backdrop). */
  onClose?: () => void;
  /** Status mặc định cho Media record. */
  defaultStatus?: MediaStatusEnum;
  /** Giới hạn số file mỗi batch. Mặc định 20. */
  maxFiles?: number;
  /** Giới hạn kích thước mỗi file. Mặc định MAX_UPLOAD_BYTES. */
  maxBytes?: number;
  /** MIME allowlist. Mặc định MEDIA_ALLOWED_MIME_TYPES. */
  allowedMime?: readonly string[];
  /** Tự động pick (gọi onPickFirst) item thành công đầu tiên. */
  autoPickFirst?: boolean;
  /** Callback khi item SUCCESS đầu tiên xuất hiện (dùng cho auto-pick). */
  onPickFirst?: (mediaId: string) => void;
  /** Ẩn controls status (picker dùng cùng 1 status với library). Mặc định false. */
  hideStatusSelect?: boolean;
  /** Ẩn nút đóng (caller tự quản lý close). Mặc định false. */
  hideCloseButton?: boolean;
  /** Label tuỳ biến cho nút primary. */
  primaryActionLabel?: string;
  /** TestID root. */
  'data-testid'?: string;
}

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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'upload';
}

function readErrorLabel(res: Response, fallback: string): Promise<string> {
  return res
    .json()
    .then((body) => {
      const m = (body as { message?: string; error?: string } | null)?.message;
      if (m && m.length < 200) return m;
      return fallback;
    })
    .catch(() => fallback);
}

export function MediaBulkUpload({
  onUploaded,
  onClose,
  defaultStatus = 'PUBLIC',
  maxFiles = DEFAULT_MAX_FILES,
  maxBytes = MAX_UPLOAD_BYTES,
  allowedMime = MEDIA_ALLOWED_MIME_TYPES,
  autoPickFirst = false,
  onPickFirst,
  hideStatusSelect = false,
  hideCloseButton = false,
  primaryActionLabel,
  'data-testid': dataTestId = 'media-bulk-upload-modal',
}: MediaBulkUploadProps) {
  const [items, setItems] = React.useState<BatchItem[]>([]);
  const [status, setStatus] = React.useState<MediaStatusEnum>(defaultStatus);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const autoPickedRef = React.useRef<boolean>(false);

  // Reset auto-pick khi mở lại
  React.useEffect(() => {
    autoPickedRef.current = false;
  }, [items.length === 0]);

  // Cleanup tất cả object URL khi unmount
  React.useEffect(() => {
    return () => {
      for (const item of items) {
        URL.revokeObjectURL(item.previewUrl);
      }
      abortRef.current?.abort();
    };
  }, []);

  function resetAll() {
    for (const item of items) {
      URL.revokeObjectURL(item.previewUrl);
    }
    abortRef.current?.abort();
    setItems([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      resetAll();
      return;
    }

    if (files.length > maxFiles) {
      setError(
        `Mỗi lượt tải tối đa ${maxFiles} ảnh. Bạn đã chọn ${files.length} ảnh.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Per-file validation; file lỗi → ERROR ngay, không block các file khác
    const next: BatchItem[] = [];
    for (const file of files) {
      const mimeType = file.type;
      if (!allowedMime.includes(mimeType)) {
        next.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: '',
          alt: deriveMediaAlt(file.name),
          status: 'ERROR',
          error: `Định dạng ${mimeType || 'không rõ'} không được phép.`,
        });
        continue;
      }
      if (file.size <= 0 || file.size > maxBytes) {
        next.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: '',
          alt: deriveMediaAlt(file.name),
          status: 'ERROR',
          error: `Kích thước ${formatBytes(file.size)} ngoài khoảng cho phép (tối đa ${formatBytes(maxBytes)}).`,
        });
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        alt: deriveMediaAlt(file.name),
        status: 'PENDING',
      });
    }
    setItems(next);
  }

  function setItemStatus(id: string, patch: Partial<BatchItem>) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }

  async function uploadOne(item: BatchItem, signal: AbortSignal): Promise<MediaItemDto> {
    // Step 1: upload-url (multipart file)
    const fd = new FormData();
    fd.append('file', item.file, sanitizeFilename(item.file.name));
    const uploadRes = await fetch('/api/admin/media/upload-url', {
      method: 'POST',
      body: fd,
      signal,
    });
    if (!uploadRes.ok) {
      const msg = await readErrorLabel(
        uploadRes,
        `Upload thất bại (${uploadRes.status}).`,
      );
      if (uploadRes.status === 503) {
        throw new Error(
          'Media upload chưa được cấu hình (BLOB_READ_WRITE_TOKEN). Liên hệ quản trị viên.',
        );
      }
      throw new Error(msg);
    }
    const uploadData = (await uploadRes.json()) as {
      blobUrl: string;
      pathname: string;
      size: number;
      mimeType: string;
    };

    // Step 2: confirm (tạo Media record; alt để trống → server authority)
    const confirmRes = await fetch('/api/admin/media/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': makeIdempotencyKey(),
      },
      body: JSON.stringify({
        blobUrl: uploadData.blobUrl,
        alt: '', // server derive
        status,
        mimeType: uploadData.mimeType,
        size: uploadData.size,
      }),
      signal,
    });
    if (!confirmRes.ok) {
      const msg = await readErrorLabel(
        confirmRes,
        `Tạo media record thất bại (${confirmRes.status}).`,
      );
      throw new Error(msg);
    }
    const confirmData = (await confirmRes.json()) as { item: MediaItemDto };
    return confirmData.item;
  }

  async function runQueue(targetItems: BatchItem[]) {
    const controller = new AbortController();
    abortRef.current = controller;
    const queue = targetItems.slice();
    let active = 0;

    await new Promise<void>((resolve) => {
      const launch = () => {
        while (active < DEFAULT_MAX_CONCURRENCY && queue.length > 0) {
          if (controller.signal.aborted) break;
          const next = queue.shift()!;
          // Skip item đã SUCCESS hoặc ERROR (validation fail) — chỉ retry sau này.
          if (next.status !== 'PENDING' && next.status !== 'ERROR') continue;
          active++;
          setItemStatus(next.id, { status: 'UPLOADING', error: undefined });
          uploadOne(next, controller.signal)
            .then((mediaItem) => {
              setItemStatus(next.id, { status: 'SUCCESS', mediaItem, error: undefined });
              onUploaded(mediaItem);
              // Auto-pick first SUCCESS cho picker dùng bulk upload
              if (autoPickFirst && !autoPickedRef.current && onPickFirst) {
                autoPickedRef.current = true;
                onPickFirst(mediaItem.id);
              }
            })
            .catch((err: unknown) => {
              if (err instanceof DOMException && err.name === 'AbortError') {
                // modal đã đóng / abort; không lỗi
                setItemStatus(next.id, { status: 'PENDING' });
                return;
              }
              const message = err instanceof Error ? err.message : 'Upload thất bại.';
              setItemStatus(next.id, { status: 'ERROR', error: message });
            })
            .finally(() => {
              active--;
              if (queue.length === 0 && active === 0) {
                resolve();
              } else {
                launch();
              }
            });
        }
        if (queue.length === 0 && active === 0) resolve();
      };
      launch();
    });
  }

  async function onStartUpload() {
    setError(null);
    if (items.length === 0) return;
    setBusy(true);
    try {
      await runQueue(items);
    } finally {
      setBusy(false);
    }
  }

  async function onRetryFailed() {
    if (busy) return;
    const failed = items.filter((i) => i.status === 'ERROR' && !i.error?.includes('Định dạng'));
    if (failed.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      await runQueue(failed.map((i) => ({ ...i, status: 'PENDING' as const, error: undefined })));
    } finally {
      setBusy(false);
    }
  }

  // progress: success count / total
  const totalCount = items.length;
  const successCount = items.filter((i) => i.status === 'SUCCESS').length;
  const errorCount = items.filter((i) => i.status === 'ERROR' && !!i.error).length;
  const inFlightCount = items.filter((i) => i.status === 'UPLOADING').length;
  const canStart =
    !busy && items.some((i) => i.status === 'PENDING') && errorCount === 0;
  const canRetry = !busy && errorCount > 0;

  // Inline mode (khi onClose undefined) — không có backdrop, host (picker) quản lý đóng
  const inlineMode = !onClose;
  const closeIfDefined = React.useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  const body = (
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border p-5 gap-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <header className="flex items-center justify-between flex-shrink-0">
        <h3 className="text-base font-semibold" style={{ color: 'var(--color-on-surface)' }}>
          {primaryActionLabel ? 'Tải lên' : 'Tải lên hàng loạt'}
        </h3>
        {!hideCloseButton && onClose && (
          <button
            type="button"
            onClick={() => {
              if (busy) return;
              closeIfDefined();
            }}
            disabled={busy}
            aria-label="Đóng"
            data-testid="media-bulk-upload-close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        )}
      </header>

        <p className="text-xs flex-shrink-0" style={{ color: 'var(--color-on-surface-variant)' }}>
          Chọn tối đa {maxFiles} ảnh mỗi lượt (JPEG/PNG/WebP/GIF; tối đa {formatBytes(maxBytes)}/
          ảnh). Alt sẽ được tự sinh từ tên tệp.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedMime.join(',')}
            multiple
            onChange={onFileChange}
            disabled={busy}
            data-testid="media-bulk-upload-file-input"
            aria-label="Chọn nhiều tệp ảnh"
            className="block w-full text-sm"
          />
          {!hideStatusSelect && (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MediaStatusEnum)}
              disabled={busy}
              data-testid="media-bulk-upload-status"
              aria-label="Trạng thái media"
              className="rounded border px-2 py-1.5 text-sm"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-outline-variant)',
                color: 'var(--color-on-surface)',
              }}
            >
              <option value="PUBLIC">Công khai</option>
              <option value="INTERNAL">Nội bộ</option>
            </select>
          )}
        </div>

        {error && (
          <div
            role="alert"
            data-testid="media-bulk-upload-error"
            className="rounded-lg border p-3 text-sm flex items-start gap-2 flex-shrink-0"
            style={{
              backgroundColor: 'var(--color-surface-container-high)',
              borderColor: 'var(--color-outline-variant)',
              color: 'var(--color-on-surface)',
            }}
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
            {error}
          </div>
        )}

        {/* Progress + item list */}
        {totalCount > 0 && (
          <div
            data-testid="media-bulk-upload-progress"
            className="text-xs font-medium flex-shrink-0"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            Đã tải {successCount}/{totalCount} ảnh
            {inFlightCount > 0 && ` (đang tải ${inFlightCount})`}
            {errorCount > 0 && ` · ${errorCount} lỗi`}
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto rounded border"
          style={{ borderColor: 'var(--color-outline-variant)' }}
          data-testid="media-bulk-upload-list"
        >
          {items.length === 0 ? (
            <p
              className="p-4 text-sm text-center"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              Chưa chọn ảnh nào.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--color-outline-variant)' }}>
              {items.map((item) => (
                <li
                  key={item.id}
                  data-testid="media-bulk-upload-item"
                  data-status={item.status}
                  className="flex items-center gap-3 p-2 text-xs"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center overflow-hidden rounded flex-shrink-0"
                    style={{ backgroundColor: 'var(--surface-container-lowest)' }}
                  >
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.alt}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span style={{ color: 'var(--color-on-surface-variant)' }}>?</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="truncate font-medium"
                      style={{ color: 'var(--color-on-surface)' }}
                      title={item.file.name}
                    >
                      {item.file.name}
                    </div>
                    <div
                      className="truncate"
                      style={{ color: 'var(--color-on-surface-variant)' }}
                    >
                      {formatBytes(item.file.size)} · {item.file.type}
                    </div>
                    {item.error && (
                      <div
                        role="alert"
                        className="truncate text-[11px] font-medium"
                        style={{ color: '#8a1c1c' }}
                      >
                        {item.error}
                      </div>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-1 flex-shrink-0"
                    data-testid={`media-bulk-upload-status-${item.status}`}
                  >
                    {item.status === 'PENDING' && (
                      <span style={{ color: 'var(--color-on-surface-variant)' }}>
                        Chờ tải
                      </span>
                    )}
                    {item.status === 'UPLOADING' && (
                      <span
                        className="flex items-center gap-1"
                        style={{ color: 'var(--color-on-surface-variant)' }}
                      >
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Đang tải
                      </span>
                    )}
                    {item.status === 'SUCCESS' && (
                      <span
                        className="flex items-center gap-1"
                        style={{ color: 'var(--color-primary-dark)' }}
                      >
                        <CheckCircle2 className="h-3 w-3" aria-hidden /> Thành công
                      </span>
                    )}
                    {item.status === 'ERROR' && (
                      <span className="flex items-center gap-1" style={{ color: '#8a1c1c' }}>
                        <AlertTriangle className="h-3 w-3" aria-hidden /> Thất bại
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              if (busy) return;
              resetAll();
            }}
            disabled={busy}
            data-testid="media-bulk-upload-reset"
            className="rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-surface-container-high)',
              color: 'var(--color-on-surface)',
            }}
          >
            Chọn lại
          </button>
          {canRetry && (
            <button
              type="button"
              onClick={() => void onRetryFailed()}
              disabled={busy}
              data-testid="media-bulk-upload-retry"
              className="inline-flex items-center gap-1 rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-surface-container-high)',
                color: 'var(--color-on-surface)',
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden /> Thử lại ({errorCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => void onStartUpload()}
            disabled={!canStart && !busy}
            data-testid="media-bulk-upload-start"
            className="inline-flex items-center gap-1 rounded px-3 py-2 text-sm font-semibold disabled:opacity-60"
            style={{
              backgroundColor: 'var(--color-primary-dark)',
              color: 'var(--color-on-primary)',
            }}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <UploadIcon className="h-4 w-4" aria-hidden />
            )}
            {busy ? 'Đang tải lên…' : (primaryActionLabel ?? `Tải lên (${items.filter((i) => i.status === 'PENDING').length})`)}
          </button>
        </footer>
    </div>
  );

  if (inlineMode) {
    return <div data-testid={dataTestId}>{body}</div>;
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={() => {
        if (busy) return; // không cho đóng modal khi đang upload
        closeIfDefined();
      }}
      data-testid={dataTestId}
    >
      {body}
    </div>
  );
}