'use client';

/**
 * MediaPicker — hrp-t1c-jobposting-media-youtube (RQ-06, DEC-05).
 *
 * Drawer picker cho media library: search + select ảnh PUBLIC từ thư viện media
 * hiện có, hoặc upload ảnh mới (qua canonical `/api/admin/media/upload-url` +
 * `/api/admin/media/confirm` API — KHÔNG build uploader/storage thứ hai).
 *
 * Auth: caller đã gate qua JobPosting editor (`canMutate`). Picker tự gate
 * `BLOB_READ_WRITE_TOKEN` qua response 503 của upload-url.
 *
 * Sau khi select: gọi `onPick(mediaId)` và đóng drawer. Caller chịu trách nhiệm
 * POST `/api/admin/jobs/job-postings/[id]/media/assign` với idempotency key.
 *
 * Out of scope:
 * - Multi-select (P2: chỉ pick 1 media mỗi lần).
 * - Drag-reorder trong library (reorder assignment là ở gallery card).
 * - Image transformation (DEC-02).
 */
import * as React from 'react';
import { Loader2, Search, Upload, X } from 'lucide-react';
import { SlideOutDrawer } from '@/src/shared/ui/sheet/slide-out-drawer';
import {
  MEDIA_ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  type MediaItemDto,
  type MediaStatusEnum,
} from '@/src/domains/media/media.types';
import { mediaFolderLabel } from '@/src/domains/media/media-ui';

export interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (mediaId: string) => void;
  /** Optional: giới hạn folder mặc định. Mặc định: tất cả. */
  defaultFolder?: string;
}

interface UploadPreview {
  file: File;
  alt: string;
  previewUrl: string;
}

interface UploadResponse {
  blobUrl: string;
  pathname: string;
  size: number;
  mimeType: string;
}

interface ConfirmResponse {
  item: MediaItemDto;
}

interface ListResponse {
  items: MediaItemDto[];
  total: number;
  take: number;
  skip: number;
}

const PAGE_SIZE = 12;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
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

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'upload';
}

export function MediaPicker({ open, onClose, onPick, defaultFolder }: MediaPickerProps) {
  const [items, setItems] = React.useState<MediaItemDto[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(1);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState<string>('');
  const [folder, setFolder] = React.useState<string>(defaultFolder ?? '');
  const [statusFilter, setStatusFilter] = React.useState<MediaStatusEnum | ''>('PUBLIC');

  const [tab, setTab] = React.useState<'library' | 'upload'>('library');
  const [upload, setUpload] = React.useState<UploadPreview | null>(null);
  const [uploadAlt, setUploadAlt] = React.useState<string>('');
  const [uploading, setUploading] = React.useState<boolean>(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  // Cleanup object URL on unmount
  React.useEffect(() => {
    return () => {
      if (upload) URL.revokeObjectURL(upload.previewUrl);
    };
  }, []);

  // Debounce search → query server
  React.useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      void fetchPage({ page: 1, signal: controller.signal });
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [open, search, folder, statusFilter]);

  async function fetchPage(opts: { page: number; signal?: AbortSignal }) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('take', String(PAGE_SIZE));
      params.set('skip', String((opts.page - 1) * PAGE_SIZE));
      if (search.trim()) params.set('search', search.trim());
      if (folder) params.set('folder', folder);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/media?${params.toString()}`, {
        signal: opts.signal ?? null,
        headers: { 'Cache-Control': 'no-store' },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        throw new Error(
          body?.message && body.message.length < 200
            ? body.message
            : `Tải media thất bại (${res.status}).`,
        );
      }
      const json = (await res.json()) as ListResponse;
      // Picker chỉ chấp nhận PUBLIC — server đã filter ở `status` param.
      setItems(json.items);
      setTotal(json.total);
      setPage(opts.page);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Tải media thất bại.');
    } finally {
      setLoading(false);
    }
  }

  function resetUpload() {
    if (upload) URL.revokeObjectURL(upload.previewUrl);
    setUpload(null);
    setUploadAlt('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      resetUpload();
      return;
    }
    const mimeType = file.type;
    if (!MEDIA_ALLOWED_MIME_TYPES.includes(mimeType as (typeof MEDIA_ALLOWED_MIME_TYPES)[number])) {
      setUploadError(`Định dạng ${mimeType || 'không rõ'} không được phép. Chỉ chấp nhận: ${MEDIA_ALLOWED_MIME_TYPES.join(', ')}.`);
      return;
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      setUploadError(`Kích thước ${formatBytes(file.size)} ngoài khoảng cho phép (tối đa ${formatBytes(MAX_UPLOAD_BYTES)}).`);
      return;
    }
    setUploadError(null);
    setUpload({
      file,
      alt: '',
      previewUrl: URL.createObjectURL(file),
    });
    setUploadAlt('');
  }

  async function onUpload() {
    if (!upload) return;
    if (uploadAlt.trim().length === 0) {
      setUploadError('Vui lòng nhập alt (mô tả ảnh) trước khi tải lên.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      // 1. upload-url (multipart file)
      const formData = new FormData();
      formData.append('file', upload.file, sanitizeFilename(upload.file.name));
      if (folder) formData.append('folder', folder);
      const uploadRes = await fetch('/api/admin/media/upload-url', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) {
        const body = (await uploadRes.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        if (uploadRes.status === 503) {
          throw new Error(
            'Media upload chưa được cấu hình (BLOB_READ_WRITE_TOKEN). Liên hệ quản trị viên.',
          );
        }
        throw new Error(
          body?.message && body.message.length < 200
            ? body.message
            : `Upload thất bại (${uploadRes.status}).`,
        );
      }
      const uploadData = (await uploadRes.json()) as UploadResponse;

      // 2. confirm (tạo Media record)
      const confirmRes = await fetch('/api/admin/media/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': makeIdempotencyKey(),
        },
        body: JSON.stringify({
          blobUrl: uploadData.blobUrl,
          alt: uploadAlt.trim(),
          folder: folder || 'uncategorized',
          status: 'PUBLIC',
          mimeType: uploadData.mimeType,
          size: uploadData.size,
        }),
      });
      if (!confirmRes.ok) {
        const body = (await confirmRes.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        throw new Error(
          body?.message && body.message.length < 200
            ? body.message
            : `Tạo media record thất bại (${confirmRes.status}).`,
        );
      }
      const confirmData = (await confirmRes.json()) as ConfirmResponse;
      const newItem = confirmData.item;
      // Prepend the newly-created item so the operator can immediately use it.
      setItems((prev) => [newItem, ...prev]);
      setTotal((prev) => prev + 1);
      setTab('library');
      resetUpload();
      // Auto-pick: upload rồi attach luôn.
      onPick(newItem.id);
      onClose();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload thất bại.');
    } finally {
      setUploading(false);
    }
  }

  function onPickItem(item: MediaItemDto) {
    if (item.status !== 'PUBLIC') {
      setError('Chỉ chấp nhận media ở trạng thái Công khai.');
      return;
    }
    onPick(item.id);
    onClose();
  }

  return (
    <SlideOutDrawer
      open={open}
      onClose={onClose}
      title="Chọn ảnh từ thư viện Media"
      description="Chọn ảnh PUBLIC hoặc tải lên ảnh mới để gán cho tin tuyển dụng."
      width="xl"
    >
      <div className="flex h-full flex-col gap-3">
        <div className="flex gap-2 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
          <TabButton
            active={tab === 'library'}
            onClick={() => setTab('library')}
            testId="media-picker-tab-library"
            label="Thư viện"
          />
          <TabButton
            active={tab === 'upload'}
            onClick={() => setTab('upload')}
            testId="media-picker-tab-upload"
            label="Tải lên"
          />
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded p-1 text-sm"
            aria-label="Đóng"
            data-testid="media-picker-close"
            style={{ color: 'var(--on-surface)' }}
          >
            <X size={18} />
          </button>
        </div>

        {tab === 'library' && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--on-surface-variant)' }}
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo alt / caption / tên tệp"
                  data-testid="media-picker-search"
                  aria-label="Tìm kiếm media"
                  className="w-full rounded border py-1 pl-7 pr-2 text-sm"
                  style={{
                    borderColor: 'var(--outline)',
                    backgroundColor: 'var(--surface-container-lowest)',
                  }}
                />
              </div>
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                data-testid="media-picker-folder"
                aria-label="Lọc theo thư mục"
                className="rounded border px-2 py-1 text-sm"
                style={{
                  borderColor: 'var(--outline)',
                  backgroundColor: 'var(--surface-container-lowest)',
                }}
              >
                <option value="">Tất cả thư mục</option>
                {['uncategorized', 'job-postings', 'homepage', 'news', 'banners'].map((f) => (
                  <option key={f} value={f}>
                    {mediaFolderLabel(f)}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value === 'PUBLIC' || e.target.value === 'INTERNAL'
                      ? e.target.value
                      : '',
                  )
                }
                data-testid="media-picker-status"
                aria-label="Lọc theo trạng thái"
                className="rounded border px-2 py-1 text-sm"
                style={{
                  borderColor: 'var(--outline)',
                  backgroundColor: 'var(--surface-container-lowest)',
                }}
              >
                <option value="PUBLIC">Công khai</option>
                <option value="INTERNAL">Nội bộ</option>
              </select>
            </div>

            {error && (
              <div
                role="alert"
                data-testid="media-picker-error"
                className="rounded border p-2 text-xs"
                style={{
                  borderColor: '#f5b5b5',
                  backgroundColor: '#fdecec',
                  color: '#8a1c1c',
                }}
              >
                {error}
              </div>
            )}

            {loading ? (
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: 'var(--on-surface-variant)' }}
                data-testid="media-picker-loading"
              >
                <Loader2 size={14} className="animate-spin" /> Đang tải…
              </div>
            ) : items.length === 0 ? (
              <div
                className="rounded border p-4 text-sm"
                style={{
                  borderColor: 'var(--outline-variant)',
                  backgroundColor: 'var(--color-surface-container)',
                  color: 'var(--on-surface-variant)',
                }}
                data-testid="media-picker-empty"
              >
                Không tìm thấy media phù hợp. Thử đổi bộ lọc hoặc chuyển sang tab Tải lên.
              </div>
            ) : (
              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                data-testid="media-picker-grid"
              >
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onPickItem(item)}
                    data-testid="media-picker-item"
                    data-media-id={item.id}
                    data-status={item.status}
                    className="group flex flex-col items-stretch overflow-hidden rounded border text-left text-xs"
                    style={{
                      borderColor: 'var(--outline-variant)',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  >
                    <div
                      className="flex h-24 w-full items-center justify-center"
                      style={{ backgroundColor: 'var(--surface-container-lowest)' }}
                    >
                      {item.url ? (
                        <img
                          src={item.url}
                          alt={item.alt}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span style={{ color: 'var(--on-surface-variant)' }}>(không có ảnh)</span>
                      )}
                    </div>
                    <div className="px-2 py-1">
                      <div
                        className="truncate font-medium"
                        style={{ color: 'var(--on-surface)' }}
                      >
                        {item.alt || '(không có alt)'}
                      </div>
                      <div
                        className="truncate text-[10px]"
                        style={{ color: 'var(--on-surface-variant)' }}
                      >
                        {mediaFolderLabel(item.folder)} · {item.filename}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div
              className="flex items-center justify-between text-xs"
              style={{ color: 'var(--on-surface-variant)' }}
              data-testid="media-picker-pager"
            >
              <span>
                Tổng {total} mục
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void fetchPage({ page: Math.max(1, page - 1) })}
                  disabled={page <= 1 || loading}
                  data-testid="media-picker-prev"
                  className="rounded border px-2 py-1 disabled:opacity-50"
                  style={{
                    borderColor: 'var(--outline)',
                    color: 'var(--on-surface)',
                  }}
                >
                  Trang trước
                </button>
                <span data-testid="media-picker-page">Trang {page}</span>
                <button
                  type="button"
                  onClick={() => void fetchPage({ page: page + 1 })}
                  disabled={page * PAGE_SIZE >= total || loading}
                  data-testid="media-picker-next"
                  className="rounded border px-2 py-1 disabled:opacity-50"
                  style={{
                    borderColor: 'var(--outline)',
                    color: 'var(--on-surface)',
                  }}
                >
                  Trang sau
                </button>
              </div>
            </div>
          </>
        )}

        {tab === 'upload' && (
          <div className="flex flex-col gap-3" data-testid="media-picker-upload">
            <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
              Tải ảnh mới lên thư viện (tối đa {formatBytes(MAX_UPLOAD_BYTES)}; chỉ chấp nhận
              {' '}{MEDIA_ALLOWED_MIME_TYPES.join(', ')}). Sau khi tải, ảnh sẽ được gán luôn cho
              tin tuyển dụng này.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={MEDIA_ALLOWED_MIME_TYPES.join(',')}
              onChange={onFileChange}
              data-testid="media-picker-file-input"
              aria-label="Chọn tệp ảnh"
              className="text-sm"
            />
            {upload && (
              <div
                className="flex flex-col gap-2 rounded border p-2"
                style={{
                  borderColor: 'var(--outline-variant)',
                  backgroundColor: 'var(--color-surface-container)',
                }}
              >
                <div
                  className="flex h-32 items-center justify-center overflow-hidden rounded"
                  style={{ backgroundColor: 'var(--surface-container-lowest)' }}
                >
                  <img
                    src={upload.previewUrl}
                    alt={upload.file.name}
                    className="max-h-32 max-w-full object-contain"
                  />
                </div>
                <div className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                  {upload.file.name} · {formatBytes(upload.file.size)} · {upload.file.type}
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    Mô tả ảnh (alt) — bắt buộc khi ở trạng thái Công khai
                  </span>
                  <input
                    type="text"
                    value={uploadAlt}
                    onChange={(e) => setUploadAlt(e.target.value)}
                    maxLength={200}
                    data-testid="media-picker-upload-alt"
                    aria-label="Mô tả ảnh"
                    className="w-full rounded border px-2 py-1 text-sm"
                    style={{
                      borderColor: 'var(--outline)',
                      backgroundColor: 'var(--surface-container-lowest)',
                    }}
                    placeholder="Ví dụ: Ảnh văn phòng công ty — quầy lễ tân"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void onUpload()}
                    disabled={uploading || uploadAlt.trim().length === 0}
                    data-testid="media-picker-upload-confirm"
                    className="inline-flex items-center gap-1 rounded border px-3 py-1 text-sm font-medium disabled:opacity-50"
                    style={{
                      borderColor: 'var(--color-primary)',
                      backgroundColor: 'var(--color-primary-soft)',
                      color: 'var(--color-primary-dark)',
                    }}
                  >
                    <Upload size={14} />
                    {uploading ? 'Đang tải lên…' : 'Tải lên & gán'}
                  </button>
                  <button
                    type="button"
                    onClick={resetUpload}
                    disabled={uploading}
                    data-testid="media-picker-upload-cancel"
                    className="rounded border px-3 py-1 text-sm"
                    style={{
                      borderColor: 'var(--outline)',
                      color: 'var(--on-surface)',
                    }}
                  >
                    Chọn ảnh khác
                  </button>
                </div>
              </div>
            )}
            {uploadError && (
              <div
                role="alert"
                data-testid="media-picker-upload-error"
                className="rounded border p-2 text-xs"
                style={{
                  borderColor: '#f5b5b5',
                  backgroundColor: '#fdecec',
                  color: '#8a1c1c',
                }}
              >
                {uploadError}
              </div>
            )}
          </div>
        )}
      </div>
    </SlideOutDrawer>
  );
}

function TabButton({
  active,
  onClick,
  label,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      className="border-b-2 px-3 py-2 text-sm font-medium"
      style={{
        borderColor: active ? 'var(--color-primary)' : 'transparent',
        color: active ? 'var(--color-primary-dark)' : 'var(--on-surface-variant)',
      }}
    >
      {label}
    </button>
  );
}
