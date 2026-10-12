/**
 * Unit tests for theme contract types & runtime guards.
 *
 * Owned by T1C (`hrp-t1c-theme-foundation`).
 * Spec: `v1.2`. Baseline: `aa86902f`.
 *
 * Covers AC-01, AC-02, AC-03.
 */

import { describe, it, expect } from 'vitest';
import {
  THEMES,
  DEFAULT_THEME_KEY,
  isThemeKey,
  getTheme,
  type ThemeKey,
} from '../theme-types';

describe('theme contract — types & runtime guards', () => {
  it('AC-01: THEMES.length === 5 với đúng 5 key (sorted)', () => {
    expect(THEMES).toHaveLength(5);
    const sortedKeys = (THEMES as readonly { key: ThemeKey }[]).map((t) => t.key).sort();
    expect(sortedKeys).toEqual([
      'emerald-growth',
      'executive-gold',
      'hrp',
      'ocean-trust',
      'violet-future',
    ]);
  });

  it('AC-01: 5 keys đúng thứ tự alphabet khi sort', () => {
    const keys = (THEMES as readonly { key: ThemeKey }[]).map((t) => t.key);
    // AC-01 chỉ yêu cầu 5 keys đúng, không yêu cầu thứ tự trong THEMES
    // (THEMES giữ theo DECISION_REQUEST §3.3 order). Tuy nhiên khi sort phải ra alphabet.
    expect([...keys].sort()).toEqual([
      'emerald-growth',
      'executive-gold',
      'hrp',
      'ocean-trust',
      'violet-future',
    ]);
  });

  it('AC-02: Mỗi palette có đủ 8 token, không undefined/null/rỗng', () => {
    for (const t of THEMES) {
      expect(t.tokens.primary).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.tokens.primaryDark).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.tokens.primaryContainer).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.tokens.primarySoft).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.tokens.surface).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.tokens.onPrimary).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.tokens.onPrimarySoft).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.tokens.onPrimaryContainer).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('AC-02: Mỗi palette có label, description non-empty', () => {
    for (const t of THEMES) {
      expect(t.label).toBeTruthy();
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.description).toBeTruthy();
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it('AC-03: isThemeKey("hrp") === true; isThemeKey("foo") === false', () => {
    expect(isThemeKey('hrp')).toBe(true);
    expect(isThemeKey('ocean-trust')).toBe(true);
    expect(isThemeKey('emerald-growth')).toBe(true);
    expect(isThemeKey('violet-future')).toBe(true);
    expect(isThemeKey('executive-gold')).toBe(true);
    expect(isThemeKey('foo')).toBe(false);
    expect(isThemeKey('')).toBe(false);
    expect(isThemeKey('OCEAN-TRUST')).toBe(false); // case-sensitive
  });

  it('AC-03: isThemeKey(null) === false; isThemeKey(undefined) === false', () => {
    expect(isThemeKey(null)).toBe(false);
    expect(isThemeKey(undefined)).toBe(false);
    expect(isThemeKey(42)).toBe(false);
    expect(isThemeKey({})).toBe(false);
    expect(isThemeKey([])).toBe(false);
    expect(isThemeKey(true)).toBe(false);
  });

  it('AC-03: getTheme("hrp").tokens.primary === "#f26522"', () => {
    expect(getTheme('hrp').tokens.primary).toBe('#f26522');
  });

  it('AC-03: getTheme("hrp").tokens.primaryDark === "#a63b00"', () => {
    expect(getTheme('hrp').tokens.primaryDark).toBe('#a63b00');
  });

  it('AC-03: getTheme("ocean-trust").tokens.primary === "#1e6f8f"', () => {
    expect(getTheme('ocean-trust').tokens.primary).toBe('#1e6f8f');
  });

  it('AC-03: getTheme("emerald-growth").tokens.primary === "#1f8a5a"', () => {
    expect(getTheme('emerald-growth').tokens.primary).toBe('#1f8a5a');
  });

  it('AC-03: getTheme("violet-future").tokens.primary === "#6a3fb5"', () => {
    expect(getTheme('violet-future').tokens.primary).toBe('#6a3fb5');
  });

  it('AC-03: getTheme("executive-gold").tokens.primary === "#9a7a17"', () => {
    expect(getTheme('executive-gold').tokens.primary).toBe('#9a7a17');
  });

  it('AC-03: getTheme("foo") falls back to getTheme("hrp")', () => {
    expect(getTheme('foo')).toEqual(getTheme('hrp'));
    expect(getTheme('foo').key).toBe('hrp');
  });

  it('AC-03: getTheme(null) / getTheme(undefined) falls back to default', () => {
    expect(getTheme(null).key).toBe('hrp');
    expect(getTheme(undefined).key).toBe('hrp');
    expect(getTheme('').key).toBe('hrp');
    expect(getTheme(42 as unknown as string).key).toBe('hrp');
  });

  it('AC-03: DEFAULT_THEME_KEY === "hrp"', () => {
    expect(DEFAULT_THEME_KEY).toBe('hrp');
  });
});
