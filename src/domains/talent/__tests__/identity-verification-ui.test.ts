/**
 * identity-verification-ui.test.ts — domain-owned dictionary for LaborProfile
 * identity verification (T1B Wave 1 Foundation).
 */

import { describe, expect, it } from 'vitest';

import {
  IDENTITY_VERIFICATION_LABELS,
  identityVerificationLabel,
  identityVerificationTone,
} from '@/src/domains/talent/identity-verification-ui';

describe('domains/talent/identity-verification-ui', () => {
  it('T0 §2 #16 binding spot checks', () => {
    expect(identityVerificationLabel('VERIFIED')).toBe('Đã xác minh');
    expect(identityVerificationLabel('PENDING')).toBe('Đang chờ xác minh');
    expect(identityVerificationLabel('REJECTED')).toBe('Bị từ chối');
  });

  it('KEEP_CANONICAL_IDENTIFIER fallback for unknown values', () => {
    expect(identityVerificationLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    expect(identityVerificationLabel(null)).toBe('');
    expect(identityVerificationLabel(undefined)).toBe('');
  });

  it('tone derivation', () => {
    expect(identityVerificationTone('VERIFIED')).toBe('SUCCESS');
    expect(identityVerificationTone('PENDING')).toBe('WARN');
    expect(identityVerificationTone('REJECTED')).toBe('NEUTRAL');
    expect(identityVerificationTone('UNKNOWN')).toBe('NEUTRAL');
    expect(identityVerificationTone(null)).toBe('NEUTRAL');
  });

  it('every key has a non-empty Vietnamese label', () => {
    for (const [code, label] of Object.entries(IDENTITY_VERIFICATION_LABELS)) {
      expect(label.length, `label for ${code}`).toBeGreaterThan(0);
    }
  });
});