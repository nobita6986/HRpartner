/**
 * theme-storage.test.ts — read/write/fallback cho localStorage theme key.
 *
 * Owned by T1B (`hrp-t1b-public-theme-picker-contrast`).
 * Baseline: `2b07d9de`. Spec: `v1.0`.
 *
 * Coverage:
 *   - Storage key đúng constant.
 *   - read/write/clear qua stub `window.localStorage`.
 *   - fallback khi value invalid / null / empty / number.
 *   - fallback khi storage throw.
 *
 * Implementation dùng `vi.stubGlobal` để giả lập `window` trong node env
 * (vitest.unit.config của repo không bật jsdom — không sửa config để tránh
 * blast radius).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  clearStoredTheme,
  readStoredTheme,
  writeStoredTheme,
} from '../theme-storage';
import { DEFAULT_THEME_KEY, THEMES } from '../theme-types';

interface StubStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

interface WindowWithStorage {
  localStorage: StubStorage;
}

function makeStub(): StubStorage {
  const data = new Map<string, string>();
  return {
    getItem(key) {
      return data.has(key) ? (data.get(key) as string) : null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

function stubWindow(): WindowWithStorage {
  const win: WindowWithStorage = { localStorage: makeStub() };
  vi.stubGlobal('window', win);
  return win;
}

describe('theme-storage — THEME_STORAGE_KEY', () => {
  it('storage key là "hrp.theme"', () => {
    expect(THEME_STORAGE_KEY).toBe('hrp.theme');
  });
});

describe('theme-storage — readStoredTheme', () => {
  let win: WindowWithStorage;
  beforeEach(() => {
    win = stubWindow();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('AC-03: trả về DEFAULT khi localStorage rỗng', () => {
    expect(readStoredTheme()).toBe(DEFAULT_THEME_KEY);
  });

  it('AC-03: trả về key hợp lệ khi có trong localStorage', () => {
    for (const t of THEMES) {
      win.localStorage.setItem(THEME_STORAGE_KEY, t.key);
      expect(readStoredTheme()).toBe(t.key);
    }
  });

  it('AC-03: fallback DEFAULT khi value không hợp lệ (stale / typo)', () => {
    win.localStorage.setItem(THEME_STORAGE_KEY, 'theme-cũ-đã-xoá');
    expect(readStoredTheme()).toBe(DEFAULT_THEME_KEY);
    win.localStorage.setItem(THEME_STORAGE_KEY, '');
    expect(readStoredTheme()).toBe(DEFAULT_THEME_KEY);
    win.localStorage.setItem(THEME_STORAGE_KEY, '123');
    expect(readStoredTheme()).toBe(DEFAULT_THEME_KEY);
  });

  it('AC-03: KHÔNG crash khi localStorage throw (private mode)', () => {
    const spy = vi.spyOn(win.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(readStoredTheme()).toBe(DEFAULT_THEME_KEY);
    spy.mockRestore();
  });
});

describe('theme-storage — writeStoredTheme', () => {
  let win: WindowWithStorage;
  beforeEach(() => {
    win = stubWindow();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('AC-03: ghi key thành công → localStorage có giá trị', () => {
    for (const t of THEMES) {
      expect(writeStoredTheme(t.key)).toBe(true);
      expect(win.localStorage.getItem(THEME_STORAGE_KEY)).toBe(t.key);
    }
  });

  it('AC-03: trả về false khi localStorage throw (quota / private mode)', () => {
    const spy = vi.spyOn(win.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(writeStoredTheme('ocean-trust')).toBe(false);
    spy.mockRestore();
  });
});

describe('theme-storage — clearStoredTheme', () => {
  let win: WindowWithStorage;
  beforeEach(() => {
    win = stubWindow();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clearStoredTheme xoá key', () => {
    win.localStorage.setItem(THEME_STORAGE_KEY, 'violet-future');
    expect(clearStoredTheme()).toBe(true);
    expect(win.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('clearStoredTheme trả về false khi storage throw', () => {
    const spy = vi.spyOn(win.localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(clearStoredTheme()).toBe(false);
    spy.mockRestore();
  });
});
