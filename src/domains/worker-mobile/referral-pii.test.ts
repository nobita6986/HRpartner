import { afterEach, describe, expect, it } from 'vitest';
import { decryptReferralValue, encryptReferralValue, referralPhoneLookupHash } from './referral-pii';

const original = process.env.HRP_PII_ENCRYPTION_KEY;
const key = '0123456789abcdef'.repeat(4);

afterEach(() => {
  if (original === undefined) delete process.env.HRP_PII_ENCRYPTION_KEY;
  else process.env.HRP_PII_ENCRYPTION_KEY = original;
});

describe('referral PII protection', () => {
  it('encrypts with authenticated AES-GCM and decrypts the original value', () => {
    process.env.HRP_PII_ENCRYPTION_KEY = key;
    const encrypted = encryptReferralValue('Nguyễn Văn A');
    expect(encrypted).not.toContain('Nguyễn Văn A');
    expect(decryptReferralValue(encrypted)).toBe('Nguyễn Văn A');
  });

  it('uses a keyed, stable lookup hash and refuses an absent key', () => {
    process.env.HRP_PII_ENCRYPTION_KEY = key;
    expect(referralPhoneLookupHash('0912345678')).toBe(referralPhoneLookupHash('0912345678'));
    expect(referralPhoneLookupHash('0912345678')).not.toBe(referralPhoneLookupHash('0912345679'));
    delete process.env.HRP_PII_ENCRYPTION_KEY;
    expect(() => encryptReferralValue('secret')).toThrow('HRP_PII_ENCRYPTION_KEY');
  });
});
