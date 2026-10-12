/**
 * Phase B / UI2 — Admin settings form composition fence.
 *
 * Lightweight source analysis on the Admin settings form to lock in:
 *   - News section toggle block is rendered.
 *   - Sticky announcement block is rendered.
 *   - All required testids are present for downstream Playwright coverage.
 *   - No `<marquee>` and no `dangerouslySetInnerHTML` are introduced.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FORM = 'app/admin/settings/admin-settings-form.tsx';

function readText(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), 'utf8').replace(/\r\n/g, '\n');
}

function strip(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*\*.*$/gm, '');
}

describe('admin-settings-form.tsx — Phase B / UI2 wiring', () => {
  const code = readText(FORM);
  const stripped = strip(code);

  it('imports UI2 types from public-content-controls/types', () => {
    expect(code).toMatch(
      /from\s+['"]@\/src\/domains\/job-board\/public-content-controls\/types['"]/,
    );
  });

  it('imports normalizeCtaUrl + InvalidCtaUrlError', () => {
    expect(code).toMatch(/InvalidCtaUrlError/);
    expect(code).toMatch(/normalizeCtaUrl/);
  });

  it('renders the news section toggle block with the correct testid', () => {
    expect(code).toContain('data-testid="ui2-news-section-block"');
    expect(code).toContain('data-testid="news-section-toggle"');
  });

  it('renders the sticky announcement block with all required fields and testids', () => {
    expect(code).toContain('data-testid="ui2-sticky-announcement-block"');
    expect(code).toContain('data-testid="sticky-enabled-toggle"');
    expect(code).toContain('data-testid="sticky-message-input"');
    expect(code).toContain('data-testid="sticky-cta-label-input"');
    expect(code).toContain('data-testid="sticky-cta-url-input"');
    expect(code).toContain('data-testid="sticky-text-color-select"');
    expect(code).toContain('data-testid="sticky-font-select"');
    expect(code).toContain('data-testid="sticky-emphasis-select"');
    expect(code).toContain('data-testid="sticky-animation-select"');
    expect(code).toContain('data-testid="sticky-dismissible-toggle"');
    expect(code).toContain('data-testid="sticky-background-opacity-input"');
    expect(code).toContain('data-testid="sticky-marquee-duration-input"');
    expect(code).toContain('data-testid="sticky-publish-button"');
  });

  it('places both appearance controls inside the sticky settings fieldset', () => {
    const stickyStart = code.indexOf('data-testid="ui2-sticky-announcement-block"');
    const fieldsetStart = code.indexOf('<fieldset', stickyStart);
    const fieldsetEnd = code.indexOf('</fieldset>', fieldsetStart);

    for (const testId of [
      'data-testid="sticky-background-opacity-input"',
      'data-testid="sticky-marquee-duration-input"',
    ]) {
      const fieldIndex = code.indexOf(testId);
      expect(fieldIndex).toBeGreaterThan(fieldsetStart);
      expect(fieldIndex).toBeLessThan(fieldsetEnd);
    }
  });

  it('limits marquee duration to 5–60 seconds and disables it outside MARQUEE', () => {
    expect(code).toContain('min={5}');
    expect(code).toContain('max={60}');
    expect(code).toContain("disabled={stickyAnimation !== 'MARQUEE'}");
    expect(code).toContain('giá trị nhỏ hơn chạy nhanh hơn');
  });

  it('does not introduce dangerouslySetInnerHTML or unsafe HTML', () => {
    expect(stripped).not.toMatch(/dangerouslySetInnerHTML/);
    expect(stripped).not.toMatch(/<script\b/i);
    expect(stripped).not.toMatch(/<marquee\b/i);
  });

  it('exposes a publish handler that bumps contentRevision', () => {
    expect(code).toMatch(/function\s+handlePublish\s*\(/);
    expect(code).toMatch(/nextContentRevision\(/);
  });
});