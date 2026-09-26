/**
 * stamp-badge.tsx — hrp-p1-a0-1 / DEC-05, DEC-06, T0 §1.4, §1.5.
 *
 * C-05 (correction batch 1/1): canonical renderer DUY NHẤT cho
 * `JobPosting.isHot`/`isUrgent` stamps dùng bởi:
 *   - homepage FeaturedJobCard (shared module — không dùng inline IIFE);
 *   - public listing `/viec-lam`;
 *   - public detail `/viec-lam/[slug]`.
 *
 * Trước đó ba bề mặt này tự dựng span + sort + IIFE inline:
 *   - `app/(jobs)/viec-lam/page.tsx`
 *   - `app/(jobs)/viec-lam/[slug]/page.tsx`
 *   - `app/(portal)/home/page.tsx`
 * → drift về class names, sort order, wrapper a11y. C-05 đóng lại bằng cách đẩy
 *   mọi implementation vào file này + `deriveStampsFromFlags` ở `stamp-defs.ts`.
 *
 * Quy tắc:
 *   - Không thêm package. Dùng React + Tailwind primitives đã có.
 *   - Animation: `job-stamp-attention` (CSS keyframe 0.7 ↔ 1.0 opacity, đã có ở
 *     `app/globals.css`) chỉ áp lên MỖI stamp wrapper — KHÔNG animate toàn card.
 *   - `prefers-reduced-motion`: `motion-reduce:animate-none motion-reduce:opacity-100`
 *     tắt animation và set opacity về 1.0 ngay.
 *   - ARIA-friendly: mỗi stamp có `aria-label` từ `def.ariaLabel`.
 *
 * Stamp visuals ở đây là dạng "flat pill chip" — phù hợp cho listing + detail.
 * Homepage `FeaturedJobCard` giữ `RubberStamp` riêng (Y10.6 con-dấu style với
 * rubber ink + grunge + offset) vì đó là art direction riêng của hero card, không
 * phải drift — C-05 chỉ cấm duplicate IIFE/span, không bắt buộc đồng nhất visual.
 * FeaturedJobCard dùng `deriveStampsFromFlags` từ `stamp-defs.ts` (cùng source)
 * để cả hai bề mặt sort và giải mã flags thống nhất.
 */

import type { ReactElement } from 'react';
import { STAMPS, deriveStampsFromFlags, type StampKey } from './stamp-defs';

export interface JobStampBadgeProps {
  /** Canonical boolean `JobPosting.isHot` — `true` ⇒ render `hot` stamp. */
  readonly isHot: boolean;
  /** Canonical boolean `JobPosting.isUrgent` — `true` ⇒ render `tuyen-gap` stamp. */
  readonly isUrgent: boolean;
  /**
   * Optional override of derived stamp set. Khi không truyền, các key được derive
   * từ `isHot`/`isUrgent`. Khi truyền, dùng nguyên mảng này (đã sort theo
   * STAMP_RANK nếu caller muốn). Hiện tại chỉ hai caller: listing/detail gọi với
   * isHot+isUrgent; homepage dùng derived set riêng qua FeaturedJobCard.
   */
  readonly stamps?: readonly StampKey[];
  /** Optional className cho wrapper ngoài (flex positioning). */
  readonly className?: string;
  /** Size variant: 'sm' (listing), 'md' (detail). Default 'sm'. */
  readonly size?: 'sm' | 'md';
}

/**
 * Canonical stamp renderer. Khi cả `isHot=false` và `isUrgent=false` (và không có
 * override `stamps`), trả về `null` — caller không phải check rỗng.
 *
 * Mỗi stamp là một `<span>` với class `.job-stamp-attention motion-reduce:*` để
 * CSS keyframe chỉ animate stamp đó (`globals.css`). Reduced-motion tự tắt
 * animation và set opacity = 1.
 */
export function JobStampBadge({
  isHot,
  isUrgent,
  stamps,
  className,
  size = 'sm',
}: JobStampBadgeProps): ReactElement | null {
  const keys: readonly StampKey[] = stamps ?? deriveStampsFromFlags(isHot, isUrgent);
  if (keys.length === 0) return null;
  const pxClass = size === 'md' ? 'px-2.5 py-1' : 'px-2 py-1';
  return (
    <div className={['flex items-start gap-1', className].filter(Boolean).join(' ')}>
      {keys.map((stampKey, idx) => {
        const def = STAMPS[stampKey];
        return (
          <span
            key={`stamp-${stampKey}-${idx}`}
            className={[
              'job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100',
              def.bgClass,
              def.fgClass,
              'inline-flex items-center gap-1 rounded-full',
              pxClass,
              size === 'md' ? 'text-xs font-semibold' : 'text-xs font-medium',
            ].join(' ')}
            data-testid="job-stamp"
            data-stamp-key={stampKey}
            data-stamp-index={idx}
            aria-label={def.ariaLabel}
          >
            {def.label}
          </span>
        );
      })}
    </div>
  );
}
