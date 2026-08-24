/**
 * apply-helpers unit tests — MP-2 STEP-02 (pure, no DB).
 */
import { describe, it, expect } from 'vitest';
import {
  normalizePhone,
  sha256Hex,
  computeIdempotencyKeyHash,
  computeApplyPayloadHash,
  generateTrackingCode,
  validateCvMetadata,
  CvValidationError,
  mapApplySqlState,
  MAX_CV_BYTES,
  type CanonicalApplyPayload,
} from './apply-helpers';

describe('normalizePhone', () => {
  it('collapses VN formats to trunk-0 national form', () => {
    expect(normalizePhone('0909123456')).toBe('0909123456');
    expect(normalizePhone('0909 123 456')).toBe('0909123456');
    expect(normalizePhone('0909-123-456')).toBe('0909123456');
    expect(normalizePhone('+84909123456')).toBe('0909123456');
    expect(normalizePhone('0084909123456')).toBe('0909123456');
    expect(normalizePhone('84909123456')).toBe('0909123456');
    expect(normalizePhone('(0909).123.456')).toBe('0909123456');
  });
  it('handles empty/nullish', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone(null)).toBe('');
    expect(normalizePhone(undefined)).toBe('');
  });
});

describe('hashing', () => {
  it('sha256Hex is deterministic 64-hex', () => {
    const h = sha256Hex('abc');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex('abc')).toBe(h);
    expect(sha256Hex('abd')).not.toBe(h);
  });
  it('idempotency key hash never equals the raw key and is stable', () => {
    const h = computeIdempotencyKeyHash('client-key-123');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain('client-key-123');
    expect(computeIdempotencyKeyHash('client-key-123')).toBe(h);
  });
  it('payload hash is field-order stable and change-sensitive', () => {
    const base: CanonicalApplyPayload = {
      slug: 'acme', slotId: 's1', fullName: '  Nguyen Van A  ', normalizedPhone: '0909123456',
      cccdNumber: '123', dateOfBirth: '1990-01-01', gender: 'M', experience: 'x',
      cvFileName: 'cv.pdf', cvMimeType: 'application/pdf', cvSizeBytes: 1000,
    };
    const trimmed: CanonicalApplyPayload = { ...base, fullName: 'Nguyen Van A' };
    expect(computeApplyPayloadHash(base)).toBe(computeApplyPayloadHash(trimmed));
    const changed: CanonicalApplyPayload = { ...base, normalizedPhone: '0909000000' };
    expect(computeApplyPayloadHash(base)).not.toBe(computeApplyPayloadHash(changed));
  });
});

describe('generateTrackingCode', () => {
  it('is high-entropy, prefixed, non-sequential and unique across many calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const code = generateTrackingCode();
      expect(code).toMatch(/^APP-[0-9A-HJKMNP-TV-Z-]+$/); // Crockford, no I/L/O/U
      expect(seen.has(code)).toBe(false);
      seen.add(code);
    }
  });
});

describe('validateCvMetadata', () => {
  it('returns nulls when no CV provided', () => {
    expect(validateCvMetadata(null)).toEqual({ cvFileName: null, cvMimeType: null, cvSizeBytes: null });
    expect(validateCvMetadata({})).toEqual({ cvFileName: null, cvMimeType: null, cvSizeBytes: null });
  });
  it('accepts PDF/JPEG/PNG within size', () => {
    expect(validateCvMetadata({ fileName: 'cv.pdf', mimeType: 'application/pdf', sizeBytes: 1000 }))
      .toEqual({ cvFileName: 'cv.pdf', cvMimeType: 'application/pdf', cvSizeBytes: 1000 });
    expect(validateCvMetadata({ fileName: 'a.png', mimeType: 'image/PNG', sizeBytes: 2 }).cvMimeType).toBe('image/png');
  });
  it('rejects disallowed MIME', () => {
    expect(() => validateCvMetadata({ fileName: 'x.exe', mimeType: 'application/x-msdownload', sizeBytes: 1 }))
      .toThrow(CvValidationError);
    expect(() => validateCvMetadata({ fileName: 'x.html', mimeType: 'text/html', sizeBytes: 1 }))
      .toThrow(CvValidationError);
  });
  it('rejects oversize and bad size', () => {
    expect(() => validateCvMetadata({ mimeType: 'application/pdf', sizeBytes: MAX_CV_BYTES + 1 })).toThrow(/CV_TOO_LARGE|exceeds/);
    expect(() => validateCvMetadata({ mimeType: 'application/pdf', sizeBytes: 0 })).toThrow(CvValidationError);
  });
});

describe('mapApplySqlState', () => {
  it('maps defined SQLSTATEs to HTTP', () => {
    expect(mapApplySqlState('P0002')).toEqual({ status: 400, error: 'INVALID_INPUT' });
    expect(mapApplySqlState('P0010')).toEqual({ status: 409, error: 'IDEMPOTENCY_PAYLOAD_MISMATCH' });
    expect(mapApplySqlState('P0011')).toEqual({ status: 404, error: 'JOB_NOT_AVAILABLE' });
    expect(mapApplySqlState('P0012')).toEqual({ status: 409, error: 'DUPLICATE_APPLICATION' });
  });
  it('returns null for unknown states', () => {
    expect(mapApplySqlState('23505')).toBeNull();
    expect(mapApplySqlState(undefined)).toBeNull();
  });
});
