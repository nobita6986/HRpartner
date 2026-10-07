'use client';

/**
 * hero-image-picker.tsx — hrp-t2-public-site-hotfix (T2 / STEP-07) +
 *                        hrp-t1c-media-global-pool-bulk-upload-hotfix (RQ-12).
 *
 * Picker cho Admin chọn ảnh nền Hero trang chủ từ Media Library. UI thin
 * client: gọi `/api/admin/media?take=24` (KHÔNG folder param — kho media là
 * dùng chung sau hrp-t1c hotfix), hiển thị grid thumbnail, cho chọn 1 ảnh.
 *
 * KHÔNG inline-upload — Admin upload ảnh mới qua trang `/admin/media` đã
 * có sẵn (hỗ trợ bulk upload từ hrp-t1c), sau đó quay lại Settings → Giao
 * diện chọn ảnh.
 */
import * as React from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import type { MediaItemDto } from '@/src/domains/media/media.types';

export interface HeroImagePickerProps {
  /** Ảnh hiện đang chọn (null = chưa có). */
  selected: { id: string; url: string; alt: string; caption: string | null } | null;
  /** Callback khi admin chọn 1 ảnh. */
  onSelect: (media: { id: string; url: string; alt: string; caption: string | null } | null) => void;
  /** Disable khi DB chưa sẵn sàng. */
  disabled?: boolean;
}

const TAKE = 24;

export function HeroImagePicker({ selected, onSelect, disabled }: HeroImagePickerProps) {
  const [items, setItems] = React.useState<MediaItemDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOnce = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // hrp-t1c-media-global-pool-bulk-upload-hotfix: bỏ folder param — kho chung
      const res = await fetch(`/api/admin/media?take=${TAKE}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { items: MediaItemDto[] };
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách ảnh.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (disabled) return;
    void fetchOnce();
  }, [disabled, fetchOnce]);

  return (
    <div data-testid="hero-image-picker" className="flex flex-col gap-3">
      <div
        className="flex items-center gap-3 rounded-lg border p-3"
        style={{
          background: selected ? 'var(--surface-container-lowest)' : 'var(--surface-container-lowest)',
          borderColor: 'var(--outline-variant)',
        }}
      >
        <div
          className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-md border bg-white"
          style={{ borderColor: 'var(--outline-variant)' }}
        >
          {selected ? (
            // Media URL is admin-controlled; alt comes from Media row.
            <img
              src={selected.url}
              alt={selected.alt || 'Ảnh nền trang chủ'}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon
              aria-hidden="true"
              className="h-6 w-6 opacity-50"
              style={{ color: 'var(--color-on-surface-variant)' }}
            />
          )}
        </div>
        <div className="flex-1">
          <p style={{ color: 'var(--on-surface)' }} className="text-sm font-medium">
            {selected ? selected.alt || 'Ảnh nền hiện tại' : 'Chưa chọn ảnh nền'}
          </p>
          {selected?.caption ? (
            <p style={{ color: 'var(--on-surface-variant)' }} className="mt-0.5 text-xs">
              {selected.caption}
            </p>
          ) : null}
        </div>
        {selected ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            disabled={disabled}
            data-testid="hero-image-clear"
            className="hrp-focus inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-40"
            style={{
              background: 'var(--surface-container)',
              color: 'var(--on-surface)',
              borderColor: 'var(--outline-variant)',
            }}
          >
            <X aria-hidden="true" className="h-3 w-3" />
            Bỏ chọn
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" style={{ color: 'var(--error)' }} className="text-xs font-medium">
          {error}. Đảm bảo ảnh đã được upload ở
          <a className="ml-1 underline" href="/admin/media">
            Quản lý Media
          </a>
          .
        </p>
      ) : null}

      {loading ? (
        <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs">
          Đang tải Media Library…
        </p>
      ) : items.length === 0 && !error ? (
        <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs">
          Chưa có ảnh nào trong Thư viện Media. Upload ảnh ở
          <a className="ml-1 underline" href="/admin/media">
            Quản lý Media
          </a>
          rồi quay lại.
        </p>
      ) : (
        <ul
          data-testid="hero-image-grid"
          className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6"
        >
          {items.map((item) => {
            const isSelected = item.id === selected?.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() =>
                    onSelect({
                      id: item.id,
                      url: item.url,
                      alt: item.alt,
                      caption: item.caption,
                    })
                  }
                  disabled={disabled}
                  data-testid={`hero-image-option-${item.id}`}
                  aria-pressed={isSelected}
                  className="hrp-focus block w-full overflow-hidden rounded-md border-2 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: isSelected ? 'var(--color-primary)' : 'var(--outline-variant)',
                    aspectRatio: '4 / 3',
                  }}
                >
                  {/* Media URL is admin-controlled. */}
                  <img
                    src={item.url}
                    alt={item.alt || item.filename}
                    className="h-full w-full object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}