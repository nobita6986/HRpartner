/**
 * Y10.4/UI04g Owner directive 11/09/2026 09:08:
 * - Stamp style: rubber stamp như ảnh mẫu (thanh lệch + stars + textured) nhưng GIỮ TONE CAM HRP
 * - Mỗi card chỉ hiển thị 1 stamp (admin chọn khi tạo job)
 * - Stamp là field từ DB, không phải FE-derived mock
 *
 * Design: rubber stamp với hiệu ứng tilted, textured background, border dashed/rough
 */

import type { LucideIcon } from 'lucide-react';
import { Flame, Star, Gift, Sparkles } from 'lucide-react';

export type StampKey = 'tuyen-gap' | 'hot' | 'thuong-cao' | 'moi';

export interface StampDef {
  key: StampKey;
  label: string;
  /** Tailwind class cho background (orange/cam tones). */
  bgClass: string;
  /** Tailwind class cho text/icon color. */
  fgClass: string;
  /** Border color class. */
  borderClass: string;
  /** Outer ring/border style (dashed/rough). */
  ringClass: string;
  Icon: LucideIcon;
  /** ARIA friendly description. */
  ariaLabel: string;
}

/** Stamp registry — rubber stamp style với tone cam HRP. */
export const STAMPS: Record<StampKey, StampDef> = {
  'tuyen-gap': {
    key: 'tuyen-gap',
    label: 'TUYỂN GẤP',
    bgClass: 'bg-orange-500',
    fgClass: 'text-white',
    borderClass: 'border-orange-400',
    ringClass: 'ring-orange-600',
    Icon: Flame,
    ariaLabel: 'Tuyển gấp',
  },
  'hot': {
    key: 'hot',
    label: 'HOT',
    bgClass: 'bg-red-500',
    fgClass: 'text-white',
    borderClass: 'border-red-400',
    ringClass: 'ring-red-600',
    Icon: Star,
    ariaLabel: 'Việc làm hot',
  },
  'thuong-cao': {
    key: 'thuong-cao',
    label: 'THƯỞNG CAO',
    bgClass: 'bg-amber-500',
    fgClass: 'text-white',
    borderClass: 'border-amber-400',
    ringClass: 'ring-amber-600',
    Icon: Gift,
    ariaLabel: 'Thưởng cao',
  },
  'moi': {
    key: 'moi',
    label: 'MỚI',
    bgClass: 'bg-orange-400',
    fgClass: 'text-white',
    borderClass: 'border-orange-300',
    ringClass: 'ring-orange-500',
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
