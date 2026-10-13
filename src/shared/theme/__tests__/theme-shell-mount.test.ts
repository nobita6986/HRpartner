/**
 * theme-shell-mount.test.ts — ThemeScope mount ở 2 public shell, không admin.
 *
 * Owned by T1B (`hrp-t1b-public-theme-picker-contrast`).
 * Baseline: `2b07d9de`. Spec: `v1.0`.
 *
 * Coverage:
 *   - (portal)/layout.tsx có ThemeScope wrap
 *   - (jobs)/viec-lam/layout.tsx có ThemeScope wrap
 *   - admin/layout.tsx KHÔNG có ThemeScope
 *   - <html> KHÔNG có data-theme (chỉ wrapper root <div>)
 *   - 3 site CTA chung class .hrp-btn-apply (không tạo 3 class riêng)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PORTAL_LAYOUT = readFileSync(
  resolve(process.cwd(), 'app/(portal)/layout.tsx'),
  'utf8',
);
const JOBS_LAYOUT = readFileSync(
  resolve(process.cwd(), 'app/(jobs)/viec-lam/layout.tsx'),
  'utf8',
);

function tryRead(p: string): string | null {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}
const ADMIN_LAYOUT = tryRead(resolve(process.cwd(), 'app/admin/layout.tsx'));
const APP_LAYOUT = tryRead(resolve(process.cwd(), 'app/layout.tsx')) ?? '';
const FEATURED = readFileSync(
  resolve(process.cwd(), 'src/domains/job-board/components/landing/featured-job-card.tsx'),
  'utf8',
);
const JOBS_PAGE = readFileSync(
  resolve(process.cwd(), 'app/(jobs)/viec-lam/page.tsx'),
  'utf8',
);
const DETAIL_CTA = readFileSync(
  resolve(process.cwd(), 'src/domains/job-board/components/detail-apply-cta.tsx'),
  'utf8',
);

describe('RQ-02: 2 public shell có ThemeScope wrap (AC-03, AC-04)', () => {
  it('AC-03: (portal)/layout.tsx import ThemeScope + render <ThemeScope>', () => {
    expect(PORTAL_LAYOUT).toMatch(/import\s*\{[^}]*ThemeScope[^}]*\}\s*from\s*['"]@\/src\/shared\/theme\/theme-scope['"]/);
    expect(PORTAL_LAYOUT).toMatch(/<ThemeScope>/);
  });

  it('AC-04: (jobs)/viec-lam/layout.tsx import ThemeScope + render <ThemeScope>', () => {
    expect(JOBS_LAYOUT).toMatch(/import\s*\{[^}]*ThemeScope[^}]*\}\s*from\s*['"]@\/src\/shared\/theme\/theme-scope['"]/);
    expect(JOBS_LAYOUT).toMatch(/<ThemeScope>/);
  });
});

describe('RQ-02: admin layout KHÔNG có ThemeScope (AC-06)', () => {
  it('AC-06: app/admin/layout.tsx KHÔNG import ThemeScope', () => {
    if (ADMIN_LAYOUT === null) {
      // nếu admin layout không tồn tại thì default pass (admin shell không mount)
      return;
    }
    expect(ADMIN_LAYOUT).not.toMatch(/theme-scope/);
  });
});

describe('RQ-02: <html> KHÔNG có data-theme (AC-07)', () => {
  it('AC-07: theme-scope.tsx không gắn data-theme lên documentElement', () => {
    const scopeSrc = readFileSync(
      resolve(process.cwd(), 'src/shared/theme/theme-scope.tsx'),
      'utf8',
    );
    expect(scopeSrc).not.toMatch(/document\.documentElement/);
    // <html> không có data-theme
    expect(APP_LAYOUT).not.toMatch(/<html[^>]*data-theme/);
  });
});

describe('RQ-05: 3 site CTA dùng chung .hrp-btn-apply (AC-18)', () => {
  it('AC-18: FeaturedJobCard dùng .hrp-btn-apply', () => {
    expect(FEATURED).toContain('hrp-btn-apply');
  });

  it('AC-18: JobCard /viec-lam dùng .hrp-btn-apply', () => {
    expect(JOBS_PAGE).toContain('hrp-btn-apply');
  });

  it('AC-18: DetailApplyCta dùng .hrp-btn-apply', () => {
    expect(DETAIL_CTA).toContain('hrp-btn-apply');
  });
});

describe('RQ-01: ThemePicker mount ở GlobalNavbar (AC-01)', () => {
  it('AC-01: GlobalNavbar import ThemePicker + render 2 lần (desktop + mobile)', () => {
    const navbar = readFileSync(
      resolve(process.cwd(), 'app/components/GlobalNavbar.tsx'),
      'utf8',
    );
    expect(navbar).toMatch(/import\s*\{[^}]*ThemePicker[^}]*\}\s*from\s*['"]@\/src\/shared\/theme\/theme-picker['"]/);
    const renderCount = (navbar.match(/<ThemePicker\s*\/>/g) ?? []).length;
    expect(renderCount).toBe(2);
  });
});
