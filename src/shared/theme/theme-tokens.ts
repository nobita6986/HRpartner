/**
 * Theme contract — 5 palette definitions (hex v1, T0 approved).
 *
 * Owned by T1C (`hrp-t1c-theme-foundation`).
 * Baseline: `aa86902f`. Spec: `v1.2`.
 *
 * Each `ThemeDefinition` entry has all 8 tokens (AC-02). The `hrp` entry is
 * idempotent with `:root` aliases in `app/globals.css:189-211` so that
 * `data-theme="hrp"` and unset (default) both produce identical output.
 *
 * Source of truth for hex values: `docs/tasks/hrp-t1c-theme-foundation/DECISION_REQUEST.md`
 * §3.3 (T0 closed DEC-01).
 *
 * Probe `docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs` verifies:
 *   - C1..C6 (palette-blocker, T1C scope): 5/5 pass
 *   - C7 (T1B-owned white-on-P 4.5:1): HRP/Emerald/Executive FAIL → T1B will
 *     migrate 6 theme-sensitive sites to `primaryDark` (which gives 6.468..12.438)
 */

import type { ThemeDefinition } from './theme-types';

/**
 * HR Partner — default theme. Idempotent with `:root` aliases.
 * Hex matches `app/globals.css:7-178` `@theme` block.
 */
const HRP_THEME: ThemeDefinition = {
  key: 'hrp',
  label: 'HR Partner',
  description: 'Bảng màu cam đào đặc trưng của HR Partner. Tươi, thân thiện, dễ tiếp cận.',
  tokens: {
    primary: '#f26522',
    primaryDark: '#a63b00',
    primaryContainer: '#fde6d8',
    primarySoft: '#fff0e5',
    surface: '#faf9f7',
    onPrimary: '#ffffff',
    onPrimarySoft: '#1f2937',
    onPrimaryContainer: '#1f2937',
  },
};

/** Ocean Trust — navy/blue. Phù hợp ngành tài chính, ngân hàng, B2B. */
const OCEAN_TRUST_THEME: ThemeDefinition = {
  key: 'ocean-trust',
  label: 'Ocean Trust',
  description: 'Bảng màu xanh dương đậm, tạo cảm giác tin cậy, chuyên nghiệp, vững vàng.',
  tokens: {
    primary: '#1e6f8f',
    primaryDark: '#0d4a63',
    primaryContainer: '#d6ebf5',
    primarySoft: '#e8f3f8',
    surface: '#f4f9fc',
    onPrimary: '#ffffff',
    onPrimarySoft: '#0d1f2d',
    onPrimaryContainer: '#0d1f2d',
  },
};

/** Emerald Growth — green. Phù hợp startup tăng trưởng, ESG, sản phẩm thiên nhiên. */
const EMERALD_GROWTH_THEME: ThemeDefinition = {
  key: 'emerald-growth',
  label: 'Emerald Growth',
  description: 'Bảng màu xanh lá tươi, truyền tải năng lượng tăng trưởng, bền vững.',
  tokens: {
    primary: '#1f8a5a',
    primaryDark: '#0d5a39',
    primaryContainer: '#d2ebde',
    primarySoft: '#e3f3ea',
    surface: '#f3faf6',
    onPrimary: '#ffffff',
    onPrimarySoft: '#0a2017',
    onPrimaryContainer: '#0a2017',
  },
};

/** Violet Future — purple. Phù hợp sản phẩm sáng tạo, công nghệ mới. */
const VIOLET_FUTURE_THEME: ThemeDefinition = {
  key: 'violet-future',
  label: 'Violet Future',
  description: 'Bảng màu tím, hiện đại, khác biệt, hướng tới tương lai.',
  tokens: {
    primary: '#6a3fb5',
    primaryDark: '#3f1f7a',
    primaryContainer: '#e1d5f4',
    primarySoft: '#ede4f8',
    surface: '#f7f3fc',
    onPrimary: '#ffffff',
    onPrimarySoft: '#1c0f3a',
    onPrimaryContainer: '#1c0f3a',
  },
};

/** Executive Gold — gold/olive. Phù hợp ngành cao cấp, executive search. */
const EXECUTIVE_GOLD_THEME: ThemeDefinition = {
  key: 'executive-gold',
  label: 'Executive Gold',
  description: 'Bảng màu vàng olive sang trọng, phù hợp phân khúc cao cấp.',
  tokens: {
    primary: '#9a7a17',
    primaryDark: '#5d4a08',
    primaryContainer: '#f0e6c0',
    primarySoft: '#f7f0d9',
    surface: '#fbf9f0',
    onPrimary: '#ffffff',
    onPrimarySoft: '#221e04',
    onPrimaryContainer: '#221e04',
  },
};

/** The 5 theme definitions, in DECISION_REQUEST §3.3 order.
 *  Frozen as readonly array via `Object.freeze` in `theme-types.ts`. */
export const THEMES: readonly ThemeDefinition[] = Object.freeze([
  HRP_THEME,
  OCEAN_TRUST_THEME,
  EMERALD_GROWTH_THEME,
  VIOLET_FUTURE_THEME,
  EXECUTIVE_GOLD_THEME,
]);
