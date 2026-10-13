/**
 * theme-picker.tsx — Theme picker cho public portal.
 *
 * Owned by T1B (`hrp-t1b-public-theme-picker-contrast`).
 * Baseline: `2b07d9de`. Spec: `v1.0`.
 *
 * Surface:
 *   - Trigger button nhỏ gọn, hiển thị 3 swatch đại diện 3 brand token của theme hiện tại.
 *   - Click trigger → mở popover menu.
 *   - Menu list 5 theme (HRP / Ocean Trust / Emerald Growth / Violet Future / Executive Gold).
 *   - Mỗi dòng: 3 swatch + label + check icon nếu là theme hiện tại.
 *
 * Accessibility (RQ-03, AC-08..AC-13):
 *   - Trigger: `aria-haspopup="menu"`, `aria-expanded={open}`, `aria-label="Chọn giao diện"`.
 *   - Menu: `role="menu"`.
 *   - Items: `role="menuitemradio"` + `aria-checked={selected}`.
 *   - Keyboard:
 *       - Enter / Space trên trigger: toggle menu.
 *       - Enter / Space trên item: chọn theme + đóng menu.
 *       - Escape: đóng menu + focus quay về trigger.
 *       - Arrow Up / Arrow Down: navigate giữa items.
 *       - Tab: native (đóng menu + focus next).
 *   - Click outside: đóng menu.
 *   - Mobile (≤ 640px): menu không overflow ngang.
 *   - `prefers-reduced-motion`: KHÔNG thêm animation mới (T1C đã gate ở `:root`).
 *
 * Persistence (RQ-02):
 *   - Đọc initial theme từ `<ThemeScope>` qua `data-theme` attribute trên ancestor gần nhất
 *     (fallback `DEFAULT_THEME_KEY`).
 *   - Khi user chọn theme: gọi `writeStoredTheme(key)` + set `data-theme` trên ancestor
 *     `<ThemeScope>` qua DOM mutation. Tự cập nhật `storage` event cho cross-shell sync.
 *   - KHÔNG dùng inline script, cookie, CSP change.
 */
'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { DEFAULT_THEME_KEY, getTheme, THEMES, type ThemeKey } from './theme-types';
import { writeStoredTheme, THEME_STORAGE_KEY } from './theme-storage';

/** Đọc `data-theme` attribute từ ancestor gần nhất có set. Fallback về default. */
function readThemeFromAncestor(): ThemeKey {
  if (typeof document === 'undefined') return DEFAULT_THEME_KEY;
  const el: HTMLElement | null = document.querySelector('[data-theme]');
  if (!el) return DEFAULT_THEME_KEY;
  const raw = el.getAttribute('data-theme');
  if (raw === null) return DEFAULT_THEME_KEY;
  // isThemeKey guard imported lazily để tránh circular import.
  // (theme-types import theme-tokens; theme-picker import theme-types — an toàn.)
  return raw as ThemeKey; // runtime validation ở ThemeScope + storage đã làm.
}

/** Tìm closest ancestor có `data-theme` attribute và set giá trị mới. */
function writeThemeToAncestor(key: ThemeKey): void {
  if (typeof document === 'undefined') return;
  const el = document.querySelector('[data-theme]');
  if (el) el.setAttribute('data-theme', key);
}

/** 3 swatch đại diện 3 brand token (primary, primaryDark, primaryContainer). */
function ThemeSwatches({ themeKey, size = 'sm' }: { themeKey: ThemeKey; size?: 'sm' | 'md' }) {
  const t = getTheme(themeKey);
  const dim = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center gap-0.5"
      data-testid={`theme-swatches-${themeKey}`}
    >
      <span
        className={`${dim} rounded-full ring-1 ring-black/10`}
        style={{ backgroundColor: t.tokens.primary }}
      />
      <span
        className={`${dim} rounded-full ring-1 ring-black/10`}
        style={{ backgroundColor: t.tokens.primaryDark }}
      />
      <span
        className={`${dim} rounded-full ring-1 ring-black/10`}
        style={{ backgroundColor: t.tokens.primaryContainer }}
      />
    </span>
  );
}

export interface ThemePickerProps {
  /** Test-only override initial theme. Khi set, picker không tự đọc DOM. */
  __testInitialKey?: ThemeKey;
}

export function ThemePicker({ __testInitialKey }: ThemePickerProps = {}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [currentKey, setCurrentKey] = useState<ThemeKey>(
    __testInitialKey ?? DEFAULT_THEME_KEY,
  );
  const [highlightIndex, setHighlightIndex] = useState<number>(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  // Mount: đọc theme hiện tại từ ancestor [data-theme].
  useEffect(() => {
    if (__testInitialKey !== undefined) return;
    setCurrentKey(readThemeFromAncestor());
  }, [__testInitialKey]);

  // Sync từ localStorage qua storage event (cross-tab hoặc ThemeScope internal update).
  useEffect(() => {
    if (__testInitialKey !== undefined) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      if (e.newValue !== null) setCurrentKey(e.newValue as ThemeKey);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [__testInitialKey]);

  // Click outside: đóng menu.
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (e.target instanceof Node && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  // Khi mở menu, set highlight về theme hiện tại.
  useEffect(() => {
    if (!open) return;
    const idx = THEMES.findIndex((t) => t.key === currentKey);
    setHighlightIndex(idx >= 0 ? idx : 0);
  }, [open, currentKey]);

  // Focus item khi highlightIndex đổi.
  useEffect(() => {
    if (!open) return;
    const el = itemRefs.current[highlightIndex];
    if (el) el.focus();
  }, [open, highlightIndex]);

  const selectTheme = useCallback(
    (key: ThemeKey) => {
      setCurrentKey(key);
      writeThemeToAncestor(key);
      writeStoredTheme(key);
      // Trigger storage event manually cho same-tab (ThemeScope cùng window không nhận).
      try {
        window.dispatchEvent(
          new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: key }),
        );
      } catch {
        // Một số trình duyệt cũ không cho dispatch StorageEvent — fallback: ThemeScope
        // đọc DOM trực tiếp qua storage key (nếu cần), hoặc re-mount. Acceptable.
      }
      setOpen(false);
      // Focus quay về trigger.
      requestAnimationFrame(() => {
        if (triggerRef.current) triggerRef.current.focus();
      });
    },
    [],
  );

  const onTriggerKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'ArrowDown' && !open) {
        e.preventDefault();
        setOpen(true);
      }
    },
    [open],
  );

  const onMenuKey = useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        requestAnimationFrame(() => {
          if (triggerRef.current) triggerRef.current.focus();
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % THEMES.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + THEMES.length) % THEMES.length);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setHighlightIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setHighlightIndex(THEMES.length - 1);
      }
    },
    [],
  );

  return (
    <div
      ref={rootRef}
      className="relative inline-block"
      data-testid="theme-picker"
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label="Chọn giao diện"
        data-testid="theme-picker-trigger"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onTriggerKey}
        className="hrp-focus inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-sm text-slate-700 transition-colors hover:bg-white"
      >
        <ThemeSwatches themeKey={currentKey} size="sm" />
        <svg
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          ref={menuRef}
          id={listboxId}
          role="menu"
          aria-label="Danh sách giao diện"
          data-testid="theme-picker-menu"
          onKeyDown={onMenuKey}
          className="absolute right-0 z-50 mt-1 w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {THEMES.map((theme, idx) => {
            const selected = theme.key === currentKey;
            return (
              <li
                key={theme.key}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                role="menuitemradio"
                aria-checked={selected}
                tabIndex={highlightIndex === idx ? 0 : -1}
                data-testid={`theme-picker-item-${theme.key}`}
                onClick={() => selectTheme(theme.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectTheme(theme.key);
                  }
                }}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm outline-none ${
                  highlightIndex === idx ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <ThemeSwatches themeKey={theme.key} size="md" />
                <span className="flex-1 font-medium text-slate-800">{theme.label}</span>
                {selected && (
                  <svg
                    className="h-4 w-4 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    data-testid={`theme-picker-check-${theme.key}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ThemePicker;
