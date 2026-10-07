import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'app/admin/settings/admin-settings-form.tsx'), 'utf8');
const PAGE_SOURCE = readFileSync(join(process.cwd(), 'app/admin/settings/page.tsx'), 'utf8');
const SLIDES_COMPONENT = readFileSync(
  join(process.cwd(), 'app/admin/settings/_components/hero-slides-editor.tsx'),
  'utf8',
);

describe('/admin/settings terminology', () => {
  it('keeps canonical sticky values while rendering Vietnamese labels', () => {
    expect(SOURCE).toContain('STICKY_ANIMATION_LABELS[a]');
    expect(SOURCE).toContain('STICKY_TEXT_COLOR_LABELS[c]');
    expect(SOURCE).toContain('STICKY_FONT_LABELS[f]');
    expect(SOURCE).toContain('STICKY_EMPHASIS_LABELS[em]');
    expect(SOURCE).toContain("value={stickyAnimation}");
    expect(SOURCE).toContain("value={stickyTextColor}");
    expect(SOURCE).toContain("value={stickyFont}");
    expect(SOURCE).toContain("value={stickyEmphasis}");
    expect(SOURCE).toContain("BLINK: 'Nhấp nháy'");
    expect(SOURCE).toContain("MARQUEE: 'Chạy chữ'");
    expect(SOURCE).toContain("EXTRA_BOLD: 'Rất đậm'");
  });

  // hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-10):
  // Fence — editor block có mặt, 5 slot giữ cứng (không cho phép add/remove).
  it('renders the 5-slot Hero slides editor block', () => {
    expect(SOURCE).toContain('data-testid="ui2-hero-slides-block"');
    expect(SOURCE).toContain('data-testid="hero-slides-reset-button"');
    expect(SLIDES_COMPONENT).toContain('data-testid="hero-slides-editor"');
    expect(SLIDES_COMPONENT).toContain('SLOT {idx + 1}/5');
    expect(SLIDES_COMPONENT).toContain('HERO_SLIDE_TITLE_MAX');
    expect(SLIDES_COMPONENT).toContain('HERO_SLIDE_DESC_MAX');
  });

  it('does not leave known English settings labels or helper copy', () => {
    for (const untranslated of [
      'Homepage Settings',
      'Singleton',
      'App Push',
      'API Keys',
      'Audit Log',
      'Error Log',
      'PUBLIC CONTENT',
      'STICKY BAR',
      'Plain text',
      'Relative path',
      'bump contentRevision',
    ]) {
      expect(SOURCE).not.toContain(untranslated);
    }
    expect(PAGE_SOURCE).not.toContain('migration HomepageSettings');
    expect(PAGE_SOURCE).toContain('cơ sở dữ liệu chưa được cập nhật cấu trúc cần thiết');
  });
});
