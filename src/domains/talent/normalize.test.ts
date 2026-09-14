/**
 * normalize.test.ts — N1 intake writer (STEP-01).
 *
 * Unit test thuần cho normalizePhone + normalizeFullName (DEC-02).
 */

import { describe, it, expect } from 'vitest';
import { normalizePhone, normalizeFullName } from './normalize';

describe('normalizePhone (DEC-02)', () => {
  it('strips +84 prefix và spaces', () => {
    expect(normalizePhone('+84 987 654 321')).toBe('987654321');
  });

  it('strips leading 0 (mobile VN)', () => {
    expect(normalizePhone('0987654321')).toBe('987654321');
  });

  it('strips bare 84 country code', () => {
    expect(normalizePhone('84 987 654 321')).toBe('987654321');
  });

  it('giữ digits đã normalize', () => {
    expect(normalizePhone('987654321')).toBe('987654321');
  });

  it('trả empty khi input rỗng', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('   ')).toBe('');
  });

  it('trả empty khi input null/undefined (KHÔNG throw)', () => {
    expect(normalizePhone(null)).toBe('');
    expect(normalizePhone(undefined)).toBe('');
  });

  it('trả empty khi input không chứa digits', () => {
    expect(normalizePhone('abc')).toBe('');
  });
});

describe('normalizeFullName (DEC-02)', () => {
  it('lowercase + trim + collapse whitespace', () => {
    expect(normalizeFullName('  Nguyễn   Văn   A ')).toBe('nguyễn văn a');
  });

  it('giữ nguyên dấu tiếng Việt', () => {
    expect(normalizeFullName('Trần Thị Thảo')).toBe('trần thị thảo');
  });

  it('trả empty khi rỗng', () => {
    expect(normalizeFullName('')).toBe('');
    expect(normalizeFullName('   ')).toBe('');
  });

  it('trả empty khi null/undefined (KHÔNG throw)', () => {
    expect(normalizeFullName(null)).toBe('');
    expect(normalizeFullName(undefined)).toBe('');
  });
});
