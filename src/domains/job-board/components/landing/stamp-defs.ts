/**
 * Y10.7/UI04j r6: grunge ink texture NHẸ (80% opacity) + CHỈ phần trong stamp.
 * - Giảm opacity radial gradient từ 0.35 → 0.28, 0.18 → 0.14, v.v.
 * - Dùng radial-gradient mask để texture chỉ tập trung ở TÂM stamp,
 *   rìa stamp giữ nguyên màu mực đặc — không phải toàn bộ con dấu.
 */

import type { LucideIcon } from 'lucide-react';
import { Flame, Star, Gift, Sparkles } from 'lucide-react';

export type StampKey = 'tuyen-gap' | 'hot' | 'thuong-cao' | 'moi';

export interface StampDef {
  key: StampKey;
  label: string;
  /** Tailwind class cho ink-fill (gradient trong lòng stamp). */
  bgClass: string;
  /** Tailwind class cho text/icon color. */
  fgClass: string;
  /** Border dashed color class. */
  borderClass: string;
  /** Outer ring/shadow color class. */
  ringClass: string;
  /** Rotation độ (tilted để giống đóng dấu tay). */
  rotateDeg: number;
  Icon: LucideIcon;
  /** ARIA friendly description. */
  ariaLabel: string;
}

/** Stamp registry — rubber stamp style với tone cam HRP, đồng bộ shape tròn. */
export const STAMPS: Record<StampKey, StampDef> = {
  'tuyen-gap': {
    key: 'tuyen-gap',
    label: 'TUYỂN GẤP',
    bgClass: 'bg-orange-500',
    fgClass: 'text-white',
    borderClass: 'border-orange-300',
    ringClass: 'ring-orange-500',
    rotateDeg: 12,
    Icon: Flame,
    ariaLabel: 'Tuyển gấp',
  },
  'hot': {
    key: 'hot',
    label: 'HOT',
    bgClass: 'bg-red-500',
    fgClass: 'text-white',
    borderClass: 'border-red-300',
    ringClass: 'ring-red-500',
    rotateDeg: -14,
    Icon: Star,
    ariaLabel: 'Việc làm hot',
  },
  'thuong-cao': {
    key: 'thuong-cao',
    label: 'THƯỞNG CAO',
    bgClass: 'bg-amber-500',
    fgClass: 'text-white',
    borderClass: 'border-amber-300',
    ringClass: 'ring-amber-500',
    rotateDeg: 10,
    Icon: Gift,
    ariaLabel: 'Thưởng cao',
  },
  'moi': {
    key: 'moi',
    label: 'MỚI',
    bgClass: 'bg-orange-400',
    fgClass: 'text-white',
    borderClass: 'border-orange-200',
    ringClass: 'ring-orange-400',
    rotateDeg: -10,
    Icon: Sparkles,
    ariaLabel: 'Việc làm mới',
  },
};

export const STAMP_KEYS: StampKey[] = ['tuyen-gap', 'hot', 'thuong-cao', 'moi'];

/** Render order: stamp quan trọng nhất ở trên cùng. */
export const STAMP_RANK: Record<StampKey, number> = {
  'tuyen-gap': 0,
  'hot': 1,
  'thuong-cao': 2,
  'moi': 3,
};
