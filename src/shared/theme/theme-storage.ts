/**
 * theme-storage.ts — localStorage read/write/fallback cho theme key.
 *
 * Owned by T1B (`hrp-t1b-public-theme-picker-contrast`).
 * Baseline: `2b07d9de`. Spec: `v1.0`.
 *
 * Contract (T1C DEC-03, DEC-06):
 *   - Storage key: `hrp.theme`.
 *   - Default: `hrp` (T1C `DEFAULT_THEME_KEY`).
 *   - Invalid / stale value hoặc storage unavailable → fallback `hrp`, KHÔNG crash.
 *   - Try/catch bao quanh `localStorage` (private mode / sandboxed context có thể throw).
 *   - SSR-safe: detect `typeof window === 'undefined'` và `typeof window.localStorage`.
 *   - KHÔNG dùng cookie, KHÔNG inline blocking script, KHÔNG thay đổi CSP.
 *
 * API:
 *   - `THEME_STORAGE_KEY = 'hrp.theme'`
 *   - `readStoredTheme(): ThemeKey` — trả về key hợp lệ từ localStorage, hoặc default.
 *   - `writeStoredTheme(key: ThemeKey): boolean` — ghi và trả về `true` nếu thành công.
 *   - `clearStoredTheme(): boolean` — xoá key (test helper).
 *
 * Tại sao KHÔNG dùng Zustand / context / cookie:
 *   - Theme là preference đơn giản, không cần state library.
 *   - 2 public shell đọc cùng key trực tiếp từ localStorage trong useEffect — đồng bộ
 *     mà không cần provider.
 *   - Cookie yêu cầu server round-trip và CSP, không phù hợp với public portal.
 */
import { DEFAULT_THEME_KEY, isThemeKey, type ThemeKey } from './theme-types';

/** localStorage key cho theme preference. Public constant để test truy cập được. */
export const THEME_STORAGE_KEY = 'hrp.theme';

/**
 * Đọc theme key từ localStorage. Trả về `DEFAULT_THEME_KEY` khi:
 *   - Không có `window` (SSR).
 *   - `localStorage` throw (private mode, sandboxed iframe).
 *   - Key không tồn tại.
 *   - Key tồn tại nhưng giá trị không phải `ThemeKey` hợp lệ (stale / typo / theme cũ đã xoá).
 *
 * @returns ThemeKey hợp lệ; KHÔNG throw.
 */
export function readStoredTheme(): ThemeKey {
  if (typeof window === 'undefined') return DEFAULT_THEME_KEY;
  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    return DEFAULT_THEME_KEY;
  }
  let raw: string | null;
  try {
    raw = storage.getItem(THEME_STORAGE_KEY);
  } catch {
    return DEFAULT_THEME_KEY;
  }
  if (raw === null) return DEFAULT_THEME_KEY;
  if (isThemeKey(raw)) return raw;
  // Stale value: theme key không còn trong THEMES (vd. theme cũ bị xoá). Fallback.
  return DEFAULT_THEME_KEY;
}

/**
 * Ghi theme key vào localStorage. Trả về `true` nếu thành công.
 *
 * @param key - ThemeKey hợp lệ (type guard đã chạy ở caller; hàm này không validate lại).
 * @returns `true` nếu ghi thành công, `false` nếu storage unavailable / throw.
 */
export function writeStoredTheme(key: ThemeKey): boolean {
  if (typeof window === 'undefined') return false;
  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    return false;
  }
  try {
    storage.setItem(THEME_STORAGE_KEY, key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Xoá theme key khỏi localStorage. Test helper — production không gọi trực tiếp
 * (theme picker chỉ ghi đè). Trả về `true` nếu thành công.
 */
export function clearStoredTheme(): boolean {
  if (typeof window === 'undefined') return false;
  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    return false;
  }
  try {
    storage.removeItem(THEME_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
