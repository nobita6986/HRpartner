/**
 * public-content-controls/url-safety.test.ts — strict CTA URL validator.
 *
 * Mirrors `chat-links.test.ts` posture. Pure-function tests; no DOM, no DB.
 */

import { describe, expect, it } from 'vitest';
import {
  InvalidCtaUrlError,
  isExternalUrl,
  normalizeCtaUrl,
  resolveCtaHref,
} from './url-safety';

describe('normalizeCtaUrl', () => {
  it('returns null for null / undefined / empty / whitespace', () => {
    expect(normalizeCtaUrl(null)).toBeNull();
    expect(normalizeCtaUrl(undefined)).toBeNull();
    expect(normalizeCtaUrl('')).toBeNull();
    expect(normalizeCtaUrl('   ')).toBeNull();
  });

  it('accepts internal relative pathnames starting with /', () => {
    expect(normalizeCtaUrl('/contact')).toBe('/contact');
    expect(normalizeCtaUrl('/viec-lam?area=hcm&shift=day')).toBe(
      '/viec-lam?area=hcm&shift=day',
    );
    expect(normalizeCtaUrl('/#hero')).toBe('/#hero');
  });

  it('rejects protocol-relative URLs starting with //', () => {
    expect(() => normalizeCtaUrl('//evil.com/path')).toThrow(InvalidCtaUrlError);
  });

  it('rejects http://', () => {
    expect(() => normalizeCtaUrl('http://example.com/path')).toThrow(
      InvalidCtaUrlError,
    );
  });

  it('rejects javascript: / data: / vbscript: / file:', () => {
    expect(() => normalizeCtaUrl('javascript:alert(1)')).toThrow(
      InvalidCtaUrlError,
    );
    expect(() => normalizeCtaUrl('JaVaScRiPt:alert(1)')).toThrow(
      InvalidCtaUrlError,
    );
    expect(() => normalizeCtaUrl('data:text/html,<script>1</script>')).toThrow(
      InvalidCtaUrlError,
    );
    expect(() => normalizeCtaUrl('vbscript:msgbox(1)')).toThrow(
      InvalidCtaUrlError,
    );
    expect(() => normalizeCtaUrl('file:///etc/passwd')).toThrow(
      InvalidCtaUrlError,
    );
  });

  it('rejects URLs with embedded credentials', () => {
    expect(() => normalizeCtaUrl('https://user:pw@host/')).toThrow(
      InvalidCtaUrlError,
    );
  });

  it('rejects URLs longer than 2048 chars', () => {
    const long = 'https://example.com/' + 'a'.repeat(2100);
    expect(() => normalizeCtaUrl(long)).toThrow(InvalidCtaUrlError);
  });

  it('rejects control characters in pathnames', () => {
    expect(() => normalizeCtaUrl('/path\u0000name')).toThrow(InvalidCtaUrlError);
    expect(() => normalizeCtaUrl('/path\nname')).toThrow(InvalidCtaUrlError);
  });

  it('accepts https absolute URLs without credentials', () => {
    expect(normalizeCtaUrl('https://hrpartner.vn/contact')).toBe(
      'https://hrpartner.vn/contact',
    );
    expect(
      normalizeCtaUrl('https://hrpartner.vn/path?ref=jobs&utm=sticker'),
    ).toBe('https://hrpartner.vn/path?ref=jobs&utm=sticker');
  });

  it('rejects malformed URLs', () => {
    expect(() => normalizeCtaUrl('not a url')).toThrow(InvalidCtaUrlError);
    expect(() => normalizeCtaUrl('://no-scheme')).toThrow(InvalidCtaUrlError);
  });

  it('InvalidCtaUrlError carries a stable code', () => {
    try {
      normalizeCtaUrl('javascript:alert(1)');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidCtaUrlError);
      expect((error as InvalidCtaUrlError).code).toBe('INVALID_CTA_URL');
    }
  });
});

describe('resolveCtaHref', () => {
  it('returns the canonical string for accepted inputs', () => {
    expect(resolveCtaHref('/contact')).toBe('/contact');
    expect(resolveCtaHref('https://hrpartner.vn/contact')).toBe(
      'https://hrpartner.vn/contact',
    );
  });

  it('returns null for any rejected input (defense-in-depth)', () => {
    expect(resolveCtaHref('javascript:alert(1)')).toBeNull();
    expect(resolveCtaHref('data:text/html,foo')).toBeNull();
    expect(resolveCtaHref('http://insecure.example/')).toBeNull();
    expect(resolveCtaHref('https://user:pw@host/')).toBeNull();
    expect(resolveCtaHref('//evil.com')).toBeNull();
    expect(resolveCtaHref('not a url')).toBeNull();
  });

  it('returns null for null / undefined / empty', () => {
    expect(resolveCtaHref(null)).toBeNull();
    expect(resolveCtaHref(undefined)).toBeNull();
    expect(resolveCtaHref('')).toBeNull();
  });
});

describe('isExternalUrl', () => {
  it('returns true for absolute https URLs', () => {
    expect(isExternalUrl('https://hrpartner.vn/contact')).toBe(true);
  });

  it('returns false for relative pathnames', () => {
    expect(isExternalUrl('/contact')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isExternalUrl(null)).toBe(false);
  });
});
