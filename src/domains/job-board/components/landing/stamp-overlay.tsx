/**
 * stamp-overlay.tsx — hrp-ui-v1-public-card-truth-correction (T1A / DEC-01, DEC-02, RQ-01..RQ-04).
 *
 * Canonical shared stamp visual DUY NHẤT cho mọi bề mặt công khai:
 *   - homepage `<FeaturedJobCard>` (trước là local `RubberStamp` ở `featured-job-card.tsx`)
 *   - public listing `/viec-lam` (trước là `<JobStampBadge>` flat pill)
 *   - public detail `/viec-lam/[slug]` (trước là `<JobStampBadge>` flat pill)
 *
 * Visual canonical = mẫu homepage cũ: 3D, tilted, ink-effect, tràn qua viền card. Trước đó
 * `app/(jobs)/viec-lam/page.tsx` và `app/(jobs)/viec-lam/[slug]/page.tsx` dùng flat pill
 * (`JobStampBadge`) — đó là RC-01 visual drift.
 *
 * Canonical flag derivation sống ở `stamp-defs.ts::deriveStampsFromFlags(isHot, isUrgent,
 * isHighReward, isExpiringSoon)` (T1B freeze). Component này CHỈ gọi helper đó; không heuristic
 * từ salary / postedAt / hash / deadline / urgency. KHÔNG có `stamps?` override prop trên
 * surface công khai — đó là RC-02 root cause (override mảng 2 flag `[]` nuốt 4 boolean).
 *
 * Mỗi stamp wrapper giữ `data-testid="job-stamp"`, `data-stamp-key`, `data-stamp-index`,
 * `aria-label` từ `STAMPS[stampKey].ariaLabel`, và className
 * `job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100` để CSS keyframe
 * `job-stamp-blink` (0.7↔1.0, đã có ở `app/globals.css`) chỉ animate stamp đó — KHÔNG animate
 * toàn card. `prefers-reduced-motion` tắt animation và set opacity = 1.0 ngay.
 *
 * Stamp position là `absolute` với offset `top: -8 + idx*8 px`, `left: -8 + idx*18 px` để
 * stamp sau lệch xuống+phải, không chồng lên nhau. `pointer-events-none` để không chặn card
 * CTA. `transform: rotate(${def.rotateDeg}deg) scale(0.7)` giữ tilted rubber-stamp style.
 *
 * Caller chịu trách nhiệm đặt outer container `position: relative` (cả 3 public card surfaces
 * đã được cập nhật ở T1A hotfix) và KHÔNG `overflow-hidden`. Mobile 375px an toàn: stamp
 * leftmost bắt đầu ở -8px, rightmost ở -8 + 3*18 = 46px, chiều rộng sau scale(0.7) ≈ 45px
 * ⇒ tổng ≈ 91px từ edge, trong card width mobile (≥ 280px).
 */

import type { ReactElement } from 'react';
import { STAMPS, deriveStampsFromFlags, type StampKey } from './stamp-defs';

export interface JobStampOverlayProps {
  /** Canonical boolean `JobPosting.isHot` — `true` ⇒ render `hot` stamp. */
  readonly isHot: boolean;
  /** Canonical boolean `JobPosting.isUrgent` — `true` ⇒ render `tuyen-gap` stamp. */
  readonly isUrgent: boolean;
  /** Canonical boolean `JobPosting.isHighReward` — `true` ⇒ render `thuong-cao` stamp. */
  readonly isHighReward: boolean;
  /** Canonical boolean `JobPosting.isExpiringSoon` — `true` ⇒ render `sap-het-han` stamp. */
  readonly isExpiringSoon: boolean;
  /** Size variant: 'sm' (listing / homepage), 'md' (detail). Default 'sm'. */
  readonly size?: 'sm' | 'md';
  /**
   * Optional className cho wrapper ngoài (e.g. position tùy biến theo card). KHÔNG nên dùng
   * để override visual stamp — visual canonical cố định ở đây để không drift giữa 3 bề mặt.
   */
  readonly className?: string;
}

/**
 * Render MỘT stamp 3D tilted. Trích từ homepage `RubberStamp` của T1B (DEC-01).
 * Wrapper là per-stamp để CSS keyframe chỉ animate phần tử này.
 */
function Stamp3D({ stampKey, idx, size }: { stampKey: StampKey; idx: number; size: 'sm' | 'md' }): ReactElement {
  const def = STAMPS[stampKey];
  const Icon = def.Icon;
  // Tương đương công thức của T1B RubberStamp: idx 0 ở góc trên trái, idx 1+ lệch phải+xuống.
  const offsetX = idx * 18;
  const offsetY = idx * 8;
  const labelClass = size === 'md' ? 'text-xs font-black' : 'text-[10px] font-black';
  const iconSizeClass = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  const paddingClass = size === 'md' ? 'px-5 py-2.5' : 'px-4 py-2';
  return (
    <div
      className="job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100 pointer-events-none absolute z-30"
      data-testid="job-stamp"
      data-stamp-key={stampKey}
      data-stamp-index={idx}
      aria-label={def.ariaLabel}
      style={{
        top: `${-8 + offsetY}px`,
        left: `${-8 + offsetX}px`,
        transform: `rotate(${def.rotateDeg}deg) scale(0.7)`,
        transformOrigin: 'top left',
      }}
    >
      {/* Stamp body: hình tròn, không viền đen, chỉ có mực + shadow-2xl 3D. */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-full ${def.bgClass} ${paddingClass} shadow-2xl`}
        style={{
          // Y10.7/UI04j r6: Grunge ink texture NHẸ (80% opacity), CHỈ phần TÂM stamp.
          backgroundImage:
            `radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,0,0,0.22) 0%, transparent 100%),` +
            `radial-gradient(ellipse at 30% 35%, rgba(255,255,255,0.28) 0%, transparent 30%),` +
            `radial-gradient(ellipse at 70% 65%, rgba(0,0,0,0.14) 0%, transparent 28%),` +
            `radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.20) 0%, transparent 50%),` +
            `radial-gradient(ellipse at 20% 75%, rgba(255,255,255,0.22) 0%, transparent 25%),` +
            `radial-gradient(ellipse at 80% 25%, rgba(0,0,0,0.12) 0%, transparent 22%),` +
            `radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.18) 0%, transparent 30%)`,
          boxShadow: `0 8px 20px -4px ${def.ringClass.includes('amber') ? 'rgba(217,119,6,0.6)' : def.ringClass.includes('orange') ? 'rgba(249,115,22,0.6)' : 'rgba(239,68,68,0.6)'}, 0 4px 8px -2px rgba(0,0,0,0.3)`,
        }}
      >
        {/* Inner ring line — vòng tròn mực bên trong (kiểu con dấu). */}
        <div
          className={`absolute inset-1.5 rounded-full border-2 ${def.borderClass} opacity-60`}
          aria-hidden="true"
        />

        {/* Nội dung stamp. */}
        <div className={`relative flex flex-col items-center gap-0.5 ${def.fgClass}`}>
          <Icon className={`${iconSizeClass} shrink-0`} aria-hidden="true" />
          <span className={`${labelClass} uppercase tracking-widest leading-none whitespace-nowrap`}>
            {def.label}
          </span>
        </div>

        {/* Grunge dots nhỏ — hạt mực văng. */}
        <div className={`pointer-events-none absolute -right-0.5 top-1/3 h-1 w-1 rounded-full ${def.bgClass} opacity-30`} aria-hidden="true" />
        <div className={`pointer-events-none absolute -bottom-0.5 left-0 h-0.5 w-0.5 rounded-full ${def.bgClass} opacity-20`} aria-hidden="true" />
        <div className={`pointer-events-none absolute -left-0.5 bottom-1/4 h-0.5 w-1 rounded-full ${def.bgClass} opacity-15`} aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Canonical shared stamp renderer. Derive flags qua `deriveStampsFromFlags` (single source of
 * truth). Khi cả 4 flag = false, trả về `null` — caller không phải check rỗng.
 *
 * Không có `stamps?` override prop trên public surface. Nếu sau này cần service-layer override
 * cho legacy callers, một biến thể `JobStampOverlayFromKeys` riêng sẽ được dùng; bản thân này
 * là 4-flag-only để chặn RC-02 (partial override nuốt 4 boolean).
 */
export function JobStampOverlay({
  isHot,
  isUrgent,
  isHighReward,
  isExpiringSoon,
  size = 'sm',
  className,
}: JobStampOverlayProps): ReactElement | null {
  const keys = deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon);
  if (keys.length === 0) return null;
  return (
    <div className={className}>
      {keys.map((stampKey, idx) => (
        <Stamp3D key={`stamp-${stampKey}-${idx}`} stampKey={stampKey} idx={idx} size={size} />
      ))}
    </div>
  );
}
