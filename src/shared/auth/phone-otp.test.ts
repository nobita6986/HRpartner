import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ETRUST_TEMPLATE_ID,
  PHONE_OTP_ENDPOINT,
  PHONE_OTP_ZALO_ENDPOINT,
  getEtrustOtpTemplates,
  matchesPhoneOtpDigest,
  newPhoneOtp,
  phoneDigest,
  phoneOtpDigest,
  readEtrustOtpConfig,
  sendEtrustOtp,
} from './phone-otp';

const config = { apiKey: 'synthetic-key', secretKey: 'synthetic-secret', oaid: 'synthetic-oaid', templateId: 'synthetic-template', brandname: 'synthetic-brand' };

afterEach(() => vi.unstubAllGlobals());

describe('phone OTP safety', () => {
  it('requires complete ETrust config, defaults templateId to 654010 when env omitted, and generates six digits including leading zeroes', () => {
    expect(readEtrustOtpConfig('', '', 'oaid', { ETRUST_TEMPLATE_ID: 'template', ETRUST_BRANDNAME: 'brand' })).toBeNull();
    expect(readEtrustOtpConfig('key', 'secret', '', { ETRUST_TEMPLATE_ID: 'template', ETRUST_BRANDNAME: 'brand' })).toBeNull();
    expect(readEtrustOtpConfig('key', 'secret', ' oaid ', {})).toEqual({
      apiKey: 'key',
      secretKey: 'secret',
      oaid: 'oaid',
      templateId: DEFAULT_ETRUST_TEMPLATE_ID,
      brandname: '',
    });
    expect(readEtrustOtpConfig('key', 'secret', ' oaid ', { ETRUST_TEMPLATE_ID: ' template ', ETRUST_BRANDNAME: ' brand ' })).toEqual({ apiKey: 'key', secretKey: 'secret', oaid: 'oaid', templateId: 'template', brandname: 'brand' });
    expect(newPhoneOtp()).toMatch(/^\d{6}$/);
  });

  it('stores one-way, account-and-phone-bound digests and compares fixed-size values safely', () => {
    const digest = phoneOtpDigest('synthetic-secret', 'user-1', '0912345678', '001234');
    expect(matchesPhoneOtpDigest(digest, phoneOtpDigest('synthetic-secret', 'user-1', '0912345678', '001234'))).toBe(true);
    expect(matchesPhoneOtpDigest(digest, phoneOtpDigest('synthetic-secret', 'user-1', '0912345678', '001235'))).toBe(false);
    expect(phoneDigest('synthetic-secret', 'user-1', '0912345678')).not.toBe(phoneDigest('synthetic-secret', 'user-2', '0912345678'));
    expect(matchesPhoneOtpDigest('invalid', digest)).toBe(false);
  });

  it('sends Zalo ZNS directly via SendZaloMessage_V4_post_json with TempID 654010 when SMS brandname is not configured', async () => {
    const zaloOnlyConfig = {
      apiKey: 'synthetic-key',
      secretKey: 'synthetic-secret',
      oaid: 'synthetic-oaid',
      templateId: DEFAULT_ETRUST_TEMPLATE_ID,
      brandname: '',
    };
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(PHONE_OTP_ZALO_ENDPOINT);
      const payload = JSON.parse(String(init?.body));
      expect(payload).toMatchObject({
        ApiKey: zaloOnlyConfig.apiKey,
        SecretKey: zaloOnlyConfig.secretKey,
        Phone: '0912345678',
        OAID: zaloOnlyConfig.oaid,
        TempID: '654010',
        Params: ['001234'],
        Sandbox: '0',
      });
      return new Response(JSON.stringify({ CodeResult: '100' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetch);
    await expect(sendEtrustOtp(zaloOnlyConfig, '0912345678', '001234')).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('sends Zalo then SMS fallback when brandname is configured and accepts only the documented provider success code', async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(PHONE_OTP_ENDPOINT);
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

  it('queries active normal and priority templates without returning credentials', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body));
      expect(payload).toMatchObject({ ApiKey: config.apiKey, SecretKey: config.secretKey, OAId: config.oaid });
      return new Response(JSON.stringify({ templates: [{ TempID: `template-${payload.SmsType}` }] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetch);
    const result = await getEtrustOtpTemplates(config.apiKey, config.secretKey, config.oaid);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(result)).not.toContain(config.secretKey);
    expect(result).toEqual({ normal: { templates: [{ TempID: 'template-25' }] }, priority: { templates: [{ TempID: 'template-24' }] } });
  });
});
