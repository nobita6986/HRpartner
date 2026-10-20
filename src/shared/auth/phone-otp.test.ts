import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchesPhoneOtpDigest, newPhoneOtp, phoneDigest, phoneOtpDigest, readEtrustOtpConfig, sendEtrustOtp } from './phone-otp';

const config = { apiKey: 'synthetic-key', secretKey: 'synthetic-secret', oaid: 'synthetic-oaid', templateId: 'synthetic-template', brandname: 'synthetic-brand' };

afterEach(() => vi.unstubAllGlobals());

describe('phone OTP safety', () => {
  it('requires complete ETrust config and generates six digits including leading zeroes', () => {
    expect(readEtrustOtpConfig('', '', { ETRUST_OAID: 'oaid' })).toBeNull();
    expect(newPhoneOtp()).toMatch(/^\d{6}$/);
  });

  it('stores one-way, account-and-phone-bound digests and compares fixed-size values safely', () => {
    const digest = phoneOtpDigest('synthetic-secret', 'user-1', '0912345678', '001234');
    expect(matchesPhoneOtpDigest(digest, phoneOtpDigest('synthetic-secret', 'user-1', '0912345678', '001234'))).toBe(true);
    expect(matchesPhoneOtpDigest(digest, phoneOtpDigest('synthetic-secret', 'user-1', '0912345678', '001235'))).toBe(false);
    expect(phoneDigest('synthetic-secret', 'user-1', '0912345678')).not.toBe(phoneDigest('synthetic-secret', 'user-2', '0912345678'));
    expect(matchesPhoneOtpDigest('invalid', digest)).toBe(false);
  });

  it('sends Zalo then SMS fallback and accepts only the documented provider success code', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body));
      expect(payload.ApiKey).toBe(config.apiKey);
      expect(payload.Data[0]).toEqual({ OAID: config.oaid, TempID: config.templateId, Params: ['001234'] });
      expect(payload.Data[1].IsUnicode).toBe(1);
      return new Response(JSON.stringify({ CodeResult: '100' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetch);
    await expect(sendEtrustOtp(config, '0912345678', '001234')).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledOnce();

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ CodeResult: '500' }), { status: 200 })));
    await expect(sendEtrustOtp(config, '0912345678', '001234')).resolves.toBe(false);
  });
});
