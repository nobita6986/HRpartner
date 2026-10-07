import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'app/admin/settings/admin-settings-form.tsx'), 'utf8');
const PAGE_SOURCE = readFileSync(join(process.cwd(), 'app/admin/settings/page.tsx'), 'utf8');

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
