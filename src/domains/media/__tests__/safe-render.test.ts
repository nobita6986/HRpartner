/**
 * safe-render.test.ts — AV4 safe HTML render allowlist tests
 *
 * Coverage:
 * - Tags in allowlist pass through
 * - Forbidden tags (script, style, iframe, etc.) stripped
 * - href schemes: javascript:/data:/vbscript: stripped
 * - target=_blank auto-rel=noopener noreferrer
 */
import { describe, expect, it } from 'vitest';
import {
  sanitizeHtml,
  stripHtml,
  SAFE_RENDER_TAGS,
  SAFE_RENDER_FORBIDDEN_TAGS,
} from '../safe-render';

describe('sanitizeHtml — basic tag allowlist', () => {
  it('passes allowed tags through', () => {
    const html = '<p>hello <strong>world</strong></p>';
    const out = sanitizeHtml(html);
    expect(out).toContain('<p>');
    expect(out).toContain('<strong>');
  });

  it('strips script tags', () => {
    const html = '<p>safe</p><script>alert(1)</script>';
    const out = sanitizeHtml(html);
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
  });

  it('strips iframe tags', () => {
    const html = '<p>safe</p><iframe src="https://evil.com"></iframe>';
    const out = sanitizeHtml(html);
    expect(out).not.toContain('<iframe');
  });

  it('strips style tags', () => {
    const html = '<p>safe</p><style>body{display:none}</style>';
    const out = sanitizeHtml(html);
    expect(out).not.toContain('<style');
    expect(out).not.toContain('display:none');
  });
});

describe('sanitizeHtml — href schemes', () => {
  it('strips javascript: href', () => {
    const html = '<a href="javascript:alert(1)">click</a>';
    const out = sanitizeHtml(html);
    expect(out).not.toContain('javascript:');
  });

  it('strips data: href', () => {
    const html = '<a href="data:text/html,<script>alert(1)</script>">click</a>';
    const out = sanitizeHtml(html);
    expect(out).not.toContain('data:');
  });

  it('strips vbscript: href', () => {
    const html = '<a href="vbscript:msgbox(1)">click</a>';
    const out = sanitizeHtml(html);
    expect(out).not.toContain('vbscript:');
  });

  it('keeps https: href', () => {
    const html = '<a href="https://example.com">click</a>';
    const out = sanitizeHtml(html);
    expect(out).toContain('href="https://example.com"');
  });

  it('keeps mailto: href', () => {
    const html = '<a href="mailto:hi@example.com">mail</a>';
    const out = sanitizeHtml(html);
    expect(out).toContain('mailto:');
  });
});

describe('sanitizeHtml — anchor target safety', () => {
  it('adds rel=noopener noreferrer to target=_blank', () => {
    const html = '<a href="https://example.com" target="_blank">click</a>';
    const out = sanitizeHtml(html);
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('preserves existing rel and adds noopener/noreferrer', () => {
    const html = '<a href="https://example.com" target="_blank" rel="canonical">click</a>';
    const out = sanitizeHtml(html);
    expect(out).toMatch(/rel="[^"]*noopener[^"]*"/);
    expect(out).toMatch(/rel="[^"]*noreferrer[^"]*"/);
  });

  it('skips target without _blank', () => {
    const html = '<a href="https://example.com">click</a>';
    const out = sanitizeHtml(html);
    expect(out).not.toContain('rel=');
  });
});

describe('sanitizeHtml — options', () => {
  it('skips auto-rel when enforceSafeAnchorTarget = false', () => {
    const html = '<a href="https://example.com" target="_blank">click</a>';
    const out = sanitizeHtml(html, { enforceSafeAnchorTarget: false });
    expect(out).not.toContain('rel=');
  });
});

describe('stripHtml', () => {
  it('returns only text', () => {
    const html = '<p>hello <strong>world</strong></p>';
    expect(stripHtml(html)).toBe('hello world');
  });
});

describe('exports', () => {
  it('SAFE_RENDER_TAGS includes p, h1..h6, ul, li, a, img, table', () => {
    expect(SAFE_RENDER_TAGS).toContain('p');
    expect(SAFE_RENDER_TAGS).toContain('h1');
    expect(SAFE_RENDER_TAGS).toContain('h6');
    expect(SAFE_RENDER_TAGS).toContain('a');
    expect(SAFE_RENDER_TAGS).toContain('img');
    expect(SAFE_RENDER_TAGS).toContain('table');
  });

  it('SAFE_RENDER_FORBIDDEN_TAGS includes script/style/iframe', () => {
    expect(SAFE_RENDER_FORBIDDEN_TAGS).toContain('script');
    expect(SAFE_RENDER_FORBIDDEN_TAGS).toContain('style');
    expect(SAFE_RENDER_FORBIDDEN_TAGS).toContain('iframe');
  });
});
