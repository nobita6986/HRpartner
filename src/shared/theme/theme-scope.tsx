/**
 * theme-scope.tsx — client component gắn `data-theme={key}` lên root wrapper.
 *
 * Owned by T1B (`hrp-t1b-public-theme-picker-contrast`).
 * Baseline: `2b07d9de`. Spec: `v1.0`.
 *
 * Contract (T1C DEC-04, DEC-06):
 *   - Gắn `data-theme` lên root `<div>` của 2 public shell (caller quyết định wrap depth).
 *   - KHÔNG gắn lên `<html>` — vẫn dùng default ở admin route và tránh layout shift.
 *   - SSR: render với `data-theme="hrp"` (default).
 *   - Mount: useEffect đọc localStorage và update state; flash 1 lần được chấp nhận
 *     theo DEC-06 (chấp nhận trade-off đơn giản hoá).
 *   - Theo dõi `storage` event từ window để đồng bộ giữa 2 shell khi user thay đổi theme
 *     ở tab/window khác (cùng origin).
 *   - Click handler: KHÔNG cần — ThemePicker tự gọi `writeStoredTheme` rồi dispatch event.
 *
 * Vì sao KHÔNG dùng inline script:
 *   - DEC-06 cấm inline script chặn render.
 *   - Flash 1 lần (render với default rồi update) là acceptable cho surface public portal.
 *
 * Children: render bình thường, không inject provider. ThemePicker đọc trực tiếp từ
 * DOM attribute `[data-theme]` ở ancestor gần nhất, hoặc qua DOM API.
 */
'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_THEME_KEY, isThemeKey, type ThemeKey } from './theme-types';
import { readStoredTheme, THEME_STORAGE_KEY } from './theme-storage';

export interface ThemeScopeProps {
  children: React.ReactNode;
  /** Test-only escape hatch. Khi true, scope render với `defaultTheme` và không đọc storage. */
  __testDefaultKey?: ThemeKey;
}

export function ThemeScope({
  children,
  __testDefaultKey,
}: ThemeScopeProps): React.ReactElement {
  // SSR + initial mount: dùng default (hoặc test override).
  const [themeKey, setThemeKey] = useState<ThemeKey>(
    __testDefaultKey ?? DEFAULT_THEME_KEY,
  );

  // Mount: đọc localStorage và subscribe storage event để đồng bộ.
  useEffect(() => {
    if (__testDefaultKey !== undefined) return;
    setThemeKey(readStoredTheme());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      // Same-tab updates: ThemePicker sẽ dispatch custom event hoặc rely on
      // local re-render. Cross-tab updates: this listener catches.
      if (e.newValue === null) {
        setThemeKey(DEFAULT_THEME_KEY);
        return;
      }
      setThemeKey(isThemeKey(e.newValue) ? e.newValue : DEFAULT_THEME_KEY);
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [__testDefaultKey]);

  return (
    <div data-theme={themeKey} className="contents">
      {children}
    </div>
  );
}

export default ThemeScope;
