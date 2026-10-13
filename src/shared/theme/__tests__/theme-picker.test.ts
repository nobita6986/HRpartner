/**
 * theme-picker.test.ts — static + runtime smoke test cho ThemePicker.
 *
 * Owned by T1B (`hrp-t1b-public-theme-picker-contrast`).
 * Baseline: `2b07d9de`. Spec: `v1.0`.
 *
 * Coverage:
 *   - Structural: file chứa ARIA attrs, role, keyboard handlers, click outside.
 *   - Runtime smoke: render component với __testInitialKey, verify trigger + menu open.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { ThemePicker, type ThemePickerProps } from '../theme-picker';
import { THEMES } from '../theme-types';

const PICKER_FILE = resolve(process.cwd(), 'src/shared/theme/theme-picker.tsx');
const src = readFileSync(PICKER_FILE, 'utf8');

describe('theme-picker — file structure (RQ-01, RQ-03, AC-08..13)', () => {
  it('AC-08: trigger có aria-haspopup="menu"', () => {
    expect(src).toMatch(/aria-haspopup=["']menu["']/);
  });

  it('AC-08: trigger có aria-expanded state', () => {
    expect(src).toMatch(/aria-expanded=\{open\}/);
  });

  it('AC-08: trigger có aria-label="Chọn giao diện"', () => {
    expect(src).toMatch(/aria-label=["']Chọn giao diện["']/);
  });

  it('AC-11: menu có role="menu"', () => {
    expect(src).toMatch(/role=["']menu["']/);
  });

  it('AC-11: items dùng role="menuitemradio" với aria-checked', () => {
    expect(src).toMatch(/role=["']menuitemradio["']/);
    expect(src).toMatch(/aria-checked=\{selected\}/);
  });

  it('AC-09: hỗ trợ Enter/Space toggle trên trigger', () => {
    expect(src).toMatch(/e\.key === ['"]Enter['"] \|\| e\.key === ['"] ['"]/);
  });

  it('AC-09: hỗ trợ Escape close trên menu', () => {
    expect(src).toMatch(/e\.key === ['"]Escape['"]/);
  });

  it('AC-09: hỗ trợ Arrow Up/Down navigate', () => {
    expect(src).toMatch(/e\.key === ['"]ArrowDown['"]/);
    expect(src).toMatch(/e\.key === ['"]ArrowUp['']/);
  });

  it('AC-10: focus quay về trigger khi đóng menu (requestAnimationFrame)', () => {
    expect(src).toMatch(/triggerRef\.current\.focus\(\)/);
  });

  it('AC-11: click outside đóng menu (mousedown listener)', () => {
    expect(src).toMatch(/document\.addEventListener\(['"]mousedown['"]/);
    expect(src).toMatch(/rootRef\.current\.contains\(e\.target\)/);
  });

  it('AC-02: render đủ 5 theme đúng thứ tự qua THEMES', () => {
    expect(src).toMatch(/THEMES\.map/);
    expect(THEMES).toHaveLength(5);
    expect(THEMES.map((t) => t.key)).toEqual([
      'hrp',
      'ocean-trust',
      'emerald-growth',
      'violet-future',
      'executive-gold',
    ]);
  });

  it('AC-13: mobile không overflow (max-w + overflow-y)', () => {
    expect(src).toMatch(/max-w-\[calc/);
    expect(src).toMatch(/overflow-y-auto/);
  });
});

describe('theme-picker — SSR render (smoke)', () => {
  it('SSR: render trigger với __testInitialKey, không mở menu', () => {
    const html = renderToString(
      React.createElement(ThemePicker as unknown as React.FC<ThemePickerProps>, { __testInitialKey: 'hrp' }),
    );
    expect(html).toContain('data-testid="theme-picker"');
    expect(html).toContain('data-testid="theme-picker-trigger"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Chọn giao diện"');
    // Menu không render khi SSR (state open=false ban đầu)
    expect(html).not.toContain('data-testid="theme-picker-menu"');
  });

  it('SSR: render trigger với __testInitialKey="ocean-trust" (chọn theme khác)', () => {
    const html = renderToString(
      React.createElement(ThemePicker as unknown as React.FC<ThemePickerProps>, { __testInitialKey: 'ocean-trust' }),
    );
    expect(html).toContain('data-testid="theme-picker"');
    expect(html).toContain('aria-expanded="false"');
  });
});
