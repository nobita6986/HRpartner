'use client';

/**
 * MediaPicker — hrp-t1c-media-global-pool-bulk-upload-hotfix (RQ-12, AC-3, AC-4).
 *
 * Drawer picker cho media library: search + select ảnh PUBLIC từ kho media dùng chung,
 * hoặc upload ảnh mới (bulk, auto alt, qua canonical `/api/admin/media/upload-url` +
 * `/api/admin/media/confirm` API — KHÔNG build uploader/storage thứ hai).
 *
 * Changes vs. hrp-t1c-jobposting-media-youtube:
 * - Bỏ hoàn toàn `<select>` folder — picker đọc chung toàn bộ kho Media.
 * - Bỏ ô nhập alt text — server là authority sinh alt từ `deriveMediaAlt(filename)`.
 * - Tab "Tải lên" dùng MediaBulkUpload (multiple files, bounded concurrency 3,
 *   partial success, retry failed only, cleanup object URL).
 * - Card bỏ label folder; chỉ hiển thị alt/filename.
 * - Sau upload, auto-pick media đầu tiên thành công và đóng drawer (UX đơn giản).
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
import { Loader2, Search, X } from 'lucide-react';
import { SlideOutDrawer } from '@/src/shared/ui/sheet/slide-out-drawer';
import {
  MEDIA_ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  type MediaItemDto,
  type MediaStatusEnum,
} from '@/src/domains/media/media.types';
import { mediaStatusLabel } from '@/src/domains/media/media-ui';
import { MediaBulkUpload } from '@/app/admin/media/media-bulk-upload';

export interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (mediaId: string) => void;
  /**
   * hrp-t1c-media-global-pool-bulk-upload-hotfix: prop giữ để backward-compat
   * (caller cũ vẫn truyền `defaultFolder="job-postings"`) — nhưng KHÔNG dùng nữa.
   * Kho media là chung, không filter theo folder.
   * @deprecated Xóa prop này ở P2 refactor.
   */
  defaultFolder?: string;
}

interface ListResponse {
  items: MediaItemDto[];
  total: number;
  take: number;
  skip: number;
}

const PAGE_SIZE = 12;

export function MediaPicker({
  open,
  onClose,
  onPick,
  defaultFolder: _defaultFolder,
}: MediaPickerProps) {
  const [items, setItems] = React.useState<MediaItemDto[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(1);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<MediaStatusEnum | ''>('PUBLIC');

  const [tab, setTab] = React.useState<'library' | 'upload'>('library');

  const searchRef = React.useRef<HTMLInputElement | null>(null);

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
  }, [open, search, statusFilter]);

  async function fetchPage(opts: { page: number; signal?: AbortSignal }) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('take', String(PAGE_SIZE));
      params.set('skip', String((opts.page - 1) * PAGE_SIZE));
      if (search.trim()) params.set('search', search.trim());
      // hrp-t1c-media-global-pool-bulk-upload-hotfix: KHÔNG truyền `folder` query
      // → picker luôn đọc chung toàn bộ kho Media (RQ-12, AC-12).
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
      description="Kho Media dùng chung — chọn ảnh PUBLIC hoặc tải lên ảnh mới để gán cho tin tuyển dụng."
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
                <option value="">{mediaStatusLabel('PUBLIC')} & {mediaStatusLabel('INTERNAL')}</option>
                <option value="PUBLIC">{mediaStatusLabel('PUBLIC')}</option>
                <option value="INTERNAL">{mediaStatusLabel('INTERNAL')}</option>
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
                      {/* hrp-t1c-media-global-pool-bulk-upload-hotfix: bỏ label folder
                          (RQ-12) — kho media là chung, không phân loại nghiệp vụ. */}
                      <div
                        className="truncate text-[10px]"
                        style={{ color: 'var(--on-surface-variant)' }}
                      >
                        {item.filename}
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
              <span>Tổng {total} mục</span>
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
              Tải ảnh mới lên kho Media dùng chung (tối đa {formatBytes(MAX_UPLOAD_BYTES)}; chỉ
              chấp nhận{' '}{MEDIA_ALLOWED_MIME_TYPES.join(', ')}; tối đa 20 ảnh/lần). Văn bản thay
              thế (alt) sẽ được hệ thống tự sinh từ tên tệp.
            </p>
            <MediaBulkUpload
              data-testid="media-picker-bulk-upload"
              maxFiles={20}
              maxBytes={MAX_UPLOAD_BYTES}
              allowedMime={MEDIA_ALLOWED_MIME_TYPES}
              autoPickFirst
              onPickFirst={(mediaId) => {
                onPick(mediaId);
                onClose();
              }}
              onUploaded={(created) => {
                // Sau upload thành công, refresh danh sách library.
                setItems((prev) => {
                  if (prev.some((p) => p.id === created.id)) return prev;
                  return [created, ...prev];
                });
                setTotal((prev) => prev + 1);
              }}
            />
          </div>
        )}
      </div>
    </SlideOutDrawer>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
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
