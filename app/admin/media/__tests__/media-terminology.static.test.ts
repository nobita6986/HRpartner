import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'app/admin/media/media-library-client.tsx'), 'utf8');
const UI_SOURCE = SOURCE
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('/admin/media terminology', () => {
  it('uses the Media domain dictionary for folder and status values', () => {
    expect(SOURCE).toContain("from '@/src/domains/media/media-ui'");
    expect(SOURCE).toContain('mediaFolderLabel(');
    expect(SOURCE).toContain('mediaStatusLabel(');
    expect(UI_SOURCE).not.toMatch(/>\s*(PUBLIC|INTERNAL|Folder|Status)\s*</);
    expect(UI_SOURCE).toContain('<option value="PUBLIC">{mediaStatusLabel(\'PUBLIC\')}</option>');
    expect(UI_SOURCE).toContain('<option value="INTERNAL">{mediaStatusLabel(\'INTERNAL\')}</option>');
  });

  it('reuses shared form and action labels', () => {
    expect(SOURCE).toContain("from '@/src/shared/i18n/form-dictionary'");
    expect(SOURCE).toContain("from '@/src/shared/i18n/action-dictionary'");
    expect(SOURCE).toContain("formLabel('status')");
    expect(SOURCE).toContain("actionLabel('save')");
  });

  it('does not leave known untranslated operator copy', () => {
    for (const untranslated of [
      'Job Postings',
      'Homepage',
      'Caption (optional)',
      'Alt text là bắt buộc khi status',
      'Upload mới',
    ]) {
      expect(UI_SOURCE).not.toContain(untranslated);
    }
  });
});
