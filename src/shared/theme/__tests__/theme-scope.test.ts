/**
 * theme-scope.test.ts — static + SSR test cho ThemeScope component.
 *
 * Owned by T1B (`hrp-t1b-public-theme-picker-contrast`).
 * Baseline: `2b07d9de`. Spec: `v1.0`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { ThemeScope, type ThemeScopeProps } from '../theme-scope';

const SCOPE_FILE = resolve(process.cwd(), 'src/shared/theme/theme-scope.tsx');
const src = readFileSync(SCOPE_FILE, 'utf8');

describe('theme-scope — file structure (RQ-02, AC-03..07)', () => {
  it('AC-07: gắn data-theme lên root <div>, KHÔNG lên <html>', () => {
    // Có <div data-theme={themeKey} ...>
    expect(src).toMatch(/<div\s+data-theme=\{themeKey\}/);
    // KHÔNG có useEffect/document.documentElement
    expect(src).not.toMatch(/document\.documentElement/);
  });

  it('AC-03: render SSR với DEFAULT_THEME_KEY', () => {
    expect(src).toMatch(/useState<ThemeKey>\(\s*__testDefaultKey \?\? DEFAULT_THEME_KEY/);
  });

  it('AC-04: subscribe storage event để đồng bộ cross-tab', () => {
    expect(src).toMatch(/addEventListener\(['"]storage['"]/);
    expect(src).toMatch(/THEME_STORAGE_KEY/);
  });

  it('storage: invalid value hoặc null → fallback default', () => {
    expect(src).toMatch(/e\.newValue === null/);
    expect(src).toMatch(/isThemeKey\(e\.newValue\)/);
  });
});

describe('theme-scope — SSR render', () => {
  it('SSR: render với default → data-theme="hrp"', () => {
    const html = renderToString(
      React.createElement(
        ThemeScope as unknown as React.FC<ThemeScopeProps>,
        null,
        React.createElement('span', null, 'child'),
      ),
    );
    expect(html).toContain('data-theme="hrp"');
    expect(html).toContain('<span>child</span>');
  });

  it('SSR: render với __testDefaultKey="ocean-trust"', () => {
    const html = renderToString(
      React.createElement(
        ThemeScope as unknown as React.FC<ThemeScopeProps>,
        { __testDefaultKey: 'ocean-trust', children: 'children-content' } as unknown as ThemeScopeProps,
      ),
    );
    expect(html).toContain('data-theme="ocean-trust"');
  });
});
