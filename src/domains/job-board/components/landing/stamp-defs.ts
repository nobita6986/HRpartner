/**
 * UI04g Owner directive 11/09/2026 08:43:
 * "tạo ra các stamp như hiểu đóng dấu mộc lên góc trên bên phải các tag là:
 *  Tuyển gấp, Hot, Thưởng cao,... những tag này sẽ được lựa chọn khi tạo job trong UI"
 *
 * Stamp = tag đóng dấu mộc góc trên phải card (UI-only ở giai đoạn này).
 * Sau này: stamp là field trong admin form create job, persisted vào DB.
 *
 * Y10.4/UI04g: FE-derived mock distribution từ urgency + postedAt (page.tsx enrichJob).
 * Khi admin form ready → thay bằng server-provided stamps[].
 */

import type { LucideIcon } from 'lucide-react';
import { Flame, Sparkles, DollarSign, BadgePlus } from 'lucide-react';

export type StampKey = 'tuyen-gap' | 'hot' | 'thuong-cao' | 'moi';

export interface StampDef {
  key: StampKey;
  label: string;
  /** Tailwind class cho background (with /alpha 70-80%). */
  bgClass: string;
  /** Tailwind class cho text/icon color. */
  fgClass: string;
  /** Tailwind class cho border-l + border-b. */
  borderClass: string;
  Icon: LucideIcon;
  /** ARIA friendly description. */
  ariaLabel: string;
}

/** Stamp registry — thêm stamp mới bằng cách push vào đây. */
export const STAMPS: Record<StampKey, StampDef> = {
  'tuyen-gap': {
    key: 'tuyen-gap',
    label: 'Tuyển gấp',
    bgClass: 'bg-orange-500/75',
    fgClass: 'text-white',
    borderClass: 'border-orange-300/40',
    Icon: Flame,
    ariaLabel: 'Tuyển gấp',
  },
  'hot': {
    key: 'hot',
    label: 'Hot',
    bgClass: 'bg-red-500/75',
    fgClass: 'text-white',
    borderClass: 'border-red-300/40',
    Icon: Sparkles,
    ariaLabel: 'Việc làm hot',
  },
  'thuong-cao': {
    key: 'thuong-cao',
    label: 'Thưởng cao',
    bgClass: 'bg-emerald-500/75',
    fgClass: 'text-white',
    borderClass: 'border-emerald-300/40',
    Icon: DollarSign,
    ariaLabel: 'Thưởng cao',
  },
  'moi': {
    key: 'moi',
    label: 'Mới',
    bgClass: 'bg-blue-500/75',
    fgClass: 'text-white',
    borderClass: 'border-blue-300/40',
    Icon: BadgePlus,
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
