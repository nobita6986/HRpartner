/**
 * Theme contract — types.
 *
 * Owned by T1C (`hrp-t1c-theme-foundation`).
 * Baseline: `aa86902f`. Spec: `v1.2`.
 *
 * Defines the public type surface for the theme system:
 *   - `ThemeKey`         — union of 5 keys
 *   - `ThemeTokens`      — 8 brand tokens (per palette)
 *   - `ThemeDefinition`  — { key, label, description, tokens }
 *   - `THEMES`           — readonly array of 5 entries (defined in theme-tokens.ts)
 *   - `DEFAULT_THEME_KEY`— `'hrp'`
 *   - `getTheme(key)`    — returns ThemeDefinition; falls back to default
 *   - `isThemeKey(value)`— type guard
 *
 * The 5 hex values are defined in `theme-tokens.ts` (split here to keep this
 * file pure types and runtime guards). The hex set is locked at v1 by T0
 * (DEC-01) and matches `app/globals.css:7-178` (the `@theme` block) for
 * the `hrp` entry (idempotent with `:root`).
 *
 * Decision references: see `docs/tasks/hrp-t1c-theme-foundation/DECISION_REQUEST.md`
 *   - DEC-01: 5 palettes + hex v1
 *   - DEC-02: key ASCII kebab-case; EN labels; VI guidance
 *   - DEC-03: default `hrp`; invalid/outdated key falls back to `hrp`
 *   - DEC-04: scope on root `<div>` of 2 public shells; NOT on `<html>`
 *   - DEC-05: keep status colors at default; do not theme-haze
 *   - DEC-06: localStorage + useEffect; no inline script
 *   - DEC-07: WCAG AA — text >= 4.5:1, large/UI >= 3:1 (7 pairs probed)
 */

/** Five brand palette keys. ASCII kebab-case per DEC-02. */
export type ThemeKey =
  | 'hrp'
  | 'ocean-trust'
  | 'emerald-growth'
  | 'violet-future'
  | 'executive-gold';

/** Eight brand tokens per palette. All values are 7-char hex (`#rrggbb`). */
export interface ThemeTokens {
  /** P — primary accent background (e.g. links, accent decorations). */
  primary: string;
  /** PD — heading, link active, focus ring, AND `primaryDark` background for
   *  theme-sensitive buttons (14px/13px semibold). See C7 in DECISION_REQUEST. */
  primaryDark: string;
  /** PC — soft container background (stamps, active borders). */
  primaryContainer: string;
  /** PS — very soft surface (avatar pills, role badges). */
  primarySoft: string;
  /** S — content surface background. Kept as-is from `:root` for `hrp`. */
  surface: string;
  /** oP — text color on `primary` / `primaryDark` background (typically white). */
  onPrimary: string;
  /** oPS — text color on `primarySoft` (typically dark). */
  onPrimarySoft: string;
  /** oPC — text color on `primaryContainer` (typically dark). */
  onPrimaryContainer: string;
}

/** A named theme: its identifier, display label, guidance text, and tokens. */
export interface ThemeDefinition {
  key: ThemeKey;
  label: string;
  description: string;
  tokens: ThemeTokens;
}

/** The 5 themes. Imported as a value from `theme-tokens.ts` to keep this
 *  file pure types at the type level (no circular import). Re-exported
 *  below for consumers. */
import { THEMES as THEMES_VALUES } from './theme-tokens';

/** Readonly array of all 5 theme definitions (order matches DECISION_REQUEST §3.3). */
export const THEMES: readonly ThemeDefinition[] = Object.freeze(THEMES_VALUES);

/** Default theme key. Used when localStorage is empty or value is invalid. */
export const DEFAULT_THEME_KEY: ThemeKey = 'hrp';

/** Type guard for a runtime value that may or may not be a valid `ThemeKey`. */
export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && (THEMES as readonly { key: ThemeKey }[]).some((t) => t.key === value);
}

/** Lookup a theme by key. Returns the matching definition, or the default
 *  (HR Partner) if the key is not one of the 5 known values. Never throws. */
export function getTheme(key: string | null | undefined): ThemeDefinition {
  if (typeof key === 'string') {
    const found = (THEMES as readonly ThemeDefinition[]).find((t) => t.key === key);
    if (found) return found;
  }
  // Fallback to default theme. THEMES is guaranteed to include 'hrp' by AC-01.
  const fallback = (THEMES as readonly ThemeDefinition[]).find((t) => t.key === DEFAULT_THEME_KEY);
  // Fallback is never undefined per AC-01; assert with non-null return.
  if (!fallback) {
    throw new Error('THEMES missing default theme ' + DEFAULT_THEME_KEY);
  }
  return fallback;
}
