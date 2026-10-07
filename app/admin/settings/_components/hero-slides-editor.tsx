'use client';

/**
 * hero-slides-editor.tsx — hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-05).
 *
 * Editor cho 5 slide của Hero carousel bên phải trang chủ
 * (`RecruitmentHighlight`). Mỗi slot mang `mediaId` (nullable, từ Media
 * Library) + `title` (≤ 120 ký tự) + `desc` (≤ 280 ký tự).
 *
 * Thin client: picker cho ảnh mirror `HeroImagePicker` UX — gọi
 * `/api/admin/media?folder=homepage`. KHÔNG inline-upload (giữ đồng nhất với
 * Hero image picker; admin upload ở `/admin/media`).
 *
 * Thứ tự 5 slot cứng: "Tiêu điểm 1" → "Tiêu điểm 5". Vòng này không cho
 * thêm/xoá/sắp xếp slide (chỉ sửa ảnh + nội dung).
 */
import * as React from 'react';
import { ImageIcon } from 'lucide-react';
import type { MediaItemDto } from '@/src/domains/media/media.types';
import {
  HERO_SLIDE_DESC_MAX,
  HERO_SLIDE_TITLE_MAX,
} from '@/src/domains/job-board/public-types';

export interface HeroSlideSlot {
  /** Internal media row id. */
  mediaId: string | null;
  /** Title ≤ 120 ký tự (validate server-side qua `HeroSlideSchema`). */
  title: string;
  /** Desc ≤ 280 ký tự (validate server-side qua `HeroSlideSchema`). */
  desc: string;
  /** Joined media cho UI preview (chỉ dùng client; không gửi server). */
  publicUrl: string | null;
  publicAlt: string;
}

export interface HeroSlidesEditorProps {
  /** 5 slot hiện tại (length cứng = 5). */
  value: HeroSlideSlot[];
  /** Callback khi slot thay đổi — slotIndex 0..4. */
  onChange: (slotIndex: number, next: HeroSlideSlot) => void;
  /** Disable khi DB chưa sẵn sàng. */
  disabled?: boolean;
}

const FOLDER = 'homepage';
const TAKE = 24;

export function HeroSlidesEditor({ value, onChange, disabled }: HeroSlidesEditorProps) {
  const [items, setItems] = React.useState<MediaItemDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pickerOpenFor, setPickerOpenFor] = React.useState<number | null>(null);

  const fetchOnce = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/media?folder=${FOLDER}&take=${TAKE}`, {
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
    <div data-testid="hero-slides-editor" className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border p-2 text-xs"
          style={{
            background: 'var(--error-container)',
            color: 'var(--on-error-container)',
            borderColor: 'var(--error)',
          }}
        >
          {error}
        </div>
      )}

      {value.map((slot, idx) => {
        const titleError = slot.title.length > HERO_SLIDE_TITLE_MAX ? `Tối đa ${HERO_SLIDE_TITLE_MAX} ký tự.` : null;
        const descError = slot.desc.length > HERO_SLIDE_DESC_MAX ? `Tối đa ${HERO_SLIDE_DESC_MAX} ký tự.` : null;
        const slotPickerOpen = pickerOpenFor === idx;
        return (
          <div
            key={`slide-${idx}`}
            className="rounded-lg border p-3"
            style={{
              background: 'var(--surface-container-lowest)',
              borderColor: 'var(--outline-variant)',
            }}
            data-testid={`hero-slide-slot-${idx}`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4
                style={{ color: 'var(--on-surface)' }}
                className="text-sm font-semibold"
              >
                Tiêu điểm {idx + 1}
              </h4>
              <span
                style={{
                  background: 'var(--secondary-container)',
                  color: 'var(--on-secondary-container)',
                }}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              >
                SLOT {idx + 1}/5
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex w-full flex-col gap-2 sm:w-40">
                <div
                  className="flex h-24 w-full items-center justify-center overflow-hidden rounded-md border bg-white"
                  style={{ borderColor: 'var(--outline-variant)' }}
                >
                  {slot.publicUrl ? (
                    <img
                      src={slot.publicUrl}
                      alt={slot.publicAlt || `Slide ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon
                      className="h-6 w-6"
                      style={{ color: 'var(--on-surface-variant)' }}
                      aria-hidden
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpenFor(slotPickerOpen ? null : idx)}
                  disabled={disabled}
                  className="hrp-focus inline-flex items-center justify-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-40"
                  style={{
                    borderColor: 'var(--outline-variant)',
                    color: 'var(--on-surface)',
                    background: 'var(--surface-container)',
                  }}
                  data-testid={`hero-slide-pick-${idx}`}
                >
                  {slotPickerOpen ? 'Đóng thư viện' : slot.mediaId ? 'Đổi ảnh' : 'Chọn ảnh'}
                </button>
                {slot.mediaId !== null && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange(idx, {
                        mediaId: null,
                        title: slot.title,
                        desc: slot.desc,
                        publicUrl: null,
                        publicAlt: '',
                      })
                    }
                    disabled={disabled}
                    className="hrp-focus text-[11px] underline disabled:opacity-40"
                    style={{ color: 'var(--on-surface-variant)' }}
                    data-testid={`hero-slide-clear-${idx}`}
                  >
                    Bỏ chọn ảnh
                  </button>
                )}
              </div>

              <div className="flex w-full flex-col gap-2">
                <div>
                  <label
                    htmlFor={`hero-slide-title-${idx}`}
                    className="mb-1 block text-xs font-medium"
                    style={{ color: 'var(--on-surface)' }}
                  >
                    Tiêu đề
                  </label>
                  <input
                    id={`hero-slide-title-${idx}`}
                    type="text"
                    value={slot.title}
                    maxLength={HERO_SLIDE_TITLE_MAX}
                    onChange={(e) =>
                      onChange(idx, {
                        ...slot,
                        title: e.target.value,
                      })
                    }
                    disabled={disabled}
                    aria-invalid={titleError !== null}
                    aria-describedby={`hero-slide-title-${idx}-help hero-slide-title-${idx}-error`}
                    className="hrp-focus w-full rounded-md border bg-white px-2 py-1 text-sm min-h-9"
                    style={{
                      borderColor: titleError ? 'var(--error)' : 'var(--outline-variant)',
                      color: 'var(--on-surface)',
                    }}
                    data-testid={`hero-slide-title-input-${idx}`}
                  />
                  <p
                    id={`hero-slide-title-${idx}-help`}
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="mt-0.5 text-[11px]"
                  >
                    {slot.title.length}/{HERO_SLIDE_TITLE_MAX} ký tự.
                  </p>
                  {titleError && (
                    <p
                      id={`hero-slide-title-${idx}-error`}
                      role="alert"
                      style={{ color: 'var(--error)' }}
                      className="mt-0.5 text-[11px] font-medium"
                    >
                      {titleError}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor={`hero-slide-desc-${idx}`}
                    className="mb-1 block text-xs font-medium"
                    style={{ color: 'var(--on-surface)' }}
                  >
                    Mô tả ngắn
                  </label>
                  <textarea
                    id={`hero-slide-desc-${idx}`}
                    rows={2}
                    value={slot.desc}
                    maxLength={HERO_SLIDE_DESC_MAX}
                    onChange={(e) =>
                      onChange(idx, {
                        ...slot,
                        desc: e.target.value,
                      })
                    }
                    disabled={disabled}
                    aria-invalid={descError !== null}
                    aria-describedby={`hero-slide-desc-${idx}-help hero-slide-desc-${idx}-error`}
                    className="hrp-focus w-full rounded-md border bg-white px-2 py-1 text-sm"
                    style={{
                      borderColor: descError ? 'var(--error)' : 'var(--outline-variant)',
                      color: 'var(--on-surface)',
                    }}
                    data-testid={`hero-slide-desc-input-${idx}`}
                  />
                  <p
                    id={`hero-slide-desc-${idx}-help`}
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="mt-0.5 text-[11px]"
                  >
                    {slot.desc.length}/{HERO_SLIDE_DESC_MAX} ký tự.
                  </p>
                  {descError && (
                    <p
                      id={`hero-slide-desc-${idx}-error`}
                      role="alert"
                      style={{ color: 'var(--error)' }}
                      className="mt-0.5 text-[11px] font-medium"
                    >
                      {descError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {slotPickerOpen && (
              <div
                className="mt-3 rounded-md border p-3"
                style={{
                  background: 'var(--surface-container)',
                  borderColor: 'var(--outline-variant)',
                }}
                data-testid={`hero-slide-picker-${idx}`}
              >
                <p
                  style={{ color: 'var(--on-surface-variant)' }}
                  className="mb-2 text-[11px]"
                >
                  {loading
                    ? 'Đang tải thư viện Media…'
                    : `Chọn 1 ảnh từ Thư viện Media (folder ${FOLDER}).`}
                </p>
                {items.length === 0 && !loading ? (
                  <p
                    style={{ color: 'var(--on-surface-variant)' }}
                    className="text-[11px]"
                  >
                    Chưa có ảnh. Upload tại /admin/media rồi quay lại.
                  </p>
                ) : (
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {items.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(idx, {
                              mediaId: m.id,
                              title: slot.title,
                              desc: slot.desc,
                              publicUrl: m.url,
                              publicAlt: m.alt,
                            });
                            setPickerOpenFor(null);
                          }}
                          disabled={disabled}
                          className="hrp-focus block w-full overflow-hidden rounded-md border"
                          style={{ borderColor: 'var(--outline-variant)' }}
                          data-testid={`hero-slide-pick-option-${idx}-${m.id}`}
                        >
                          <img
                            src={m.url}
                            alt={m.alt || 'Ảnh trong thư viện'}
                            className="aspect-square w-full object-cover"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}