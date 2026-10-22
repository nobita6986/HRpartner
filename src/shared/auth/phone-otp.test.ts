import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ETRUST_TEMPLATE_ID,
  PHONE_OTP_ENDPOINT,
  PHONE_OTP_ZALO_ENDPOINT,
  PHONE_OTP_ZALO_V5_ENDPOINT,
  getEtrustOtpTemplates,
  matchesPhoneOtpDigest,
  newPhoneOtp,
  phoneDigest,
  phoneOtpDigest,
  readEtrustOtpConfig,
  sendEtrustOtp,
  sendEtrustOtpWithDetails,
} from './phone-otp';

const config = { apiKey: 'synthetic-key', secretKey: 'synthetic-secret', oaid: 'synthetic-oaid', templateId: 'synthetic-template', brandname: 'synthetic-brand' };

afterEach(() => vi.unstubAllGlobals());

describe('phone OTP safety', () => {
  it('requires complete ETrust config, prioritizes overrides over env, defaults templateId to 654010, and generates six digits', () => {
    expect(readEtrustOtpConfig('', '', 'oaid', { ETRUST_TEMPLATE_ID: 'template', ETRUST_BRANDNAME: 'brand' })).toBeNull();
    expect(readEtrustOtpConfig('key', 'secret', '', { ETRUST_TEMPLATE_ID: 'template', ETRUST_BRANDNAME: 'brand' })).toBeNull();
    expect(readEtrustOtpConfig('key', 'secret', ' oaid ', {})).toEqual({
      apiKey: 'key',
      secretKey: 'secret',
      oaid: 'oaid',
      templateId: DEFAULT_ETRUST_TEMPLATE_ID,
      brandname: '',
    });
    expect(readEtrustOtpConfig('key', 'secret', ' oaid ', { ETRUST_TEMPLATE_ID: ' template ', ETRUST_BRANDNAME: ' brand ' })).toEqual({
      apiKey: 'key',
      secretKey: 'secret',
      oaid: 'oaid',
      templateId: 'template',
      brandname: 'brand',
    });
    expect(
      readEtrustOtpConfig(
        'key',
        'secret',
        ' oaid ',
        { ETRUST_TEMPLATE_ID: 'stale-env-template', ETRUST_BRANDNAME: 'stale-env-brand' },
        { templateId: DEFAULT_ETRUST_TEMPLATE_ID, brandname: '' },
      ),
    ).toEqual({
      apiKey: 'key',
      secretKey: 'secret',
      oaid: 'oaid',
      templateId: DEFAULT_ETRUST_TEMPLATE_ID,
      brandname: '',
    });
    expect(newPhoneOtp()).toMatch(/^\d{6}$/);
  });

  it('stores one-way, account-and-phone-bound digests and compares fixed-size values safely', () => {
    const digest = phoneOtpDigest('synthetic-secret', 'user-1', '0912345678', '001234');
    expect(matchesPhoneOtpDigest(digest, phoneOtpDigest('synthetic-secret', 'user-1', '0912345678', '001234'))).toBe(true);
    expect(matchesPhoneOtpDigest(digest, phoneOtpDigest('synthetic-secret', 'user-1', '0912345678', '001235'))).toBe(false);
    expect(phoneDigest('synthetic-secret', 'user-1', '0912345678')).not.toBe(phoneDigest('synthetic-secret', 'user-2', '0912345678'));
    expect(matchesPhoneOtpDigest('invalid', digest)).toBe(false);
  });

  it('sends Priority Zalo ZNS (SmsType 24) first via SendZaloMessage_V4_post_json with TempID 654010', async () => {
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
        SmsType: '24',
        SendingMode: '1',
        Sandbox: '0',
      });
      return new Response(JSON.stringify({ CodeResult: '100' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetch);
    await expect(sendEtrustOtp(zaloOnlyConfig, '0912345678', '001234')).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('falls back through V4 (no SmsType) -> V5 (TempData) -> MultiChannelMessage when brandname is configured, and returns detailed failure code when all fail', async () => {
    const seenUrls: string[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      seenUrls.push(url);
      const payload = JSON.parse(String(init?.body));
      if (seenUrls.length === 1) {
        expect(url).toBe(PHONE_OTP_ZALO_ENDPOINT);
        expect(payload.SmsType).toBe('24');
        return new Response(JSON.stringify({ CodeResult: '104', ErrorMessage: 'V4 SmsType 24 rejected' }), { status: 200 });
      }
      if (seenUrls.length === 2) {
        expect(url).toBe(PHONE_OTP_ZALO_ENDPOINT);
        expect(payload.SmsType).toBeUndefined();
        return new Response(JSON.stringify({ CodeResult: '104', ErrorMessage: 'V4 default rejected' }), { status: 200 });
      }
      if (seenUrls.length === 3) {
        expect(url).toBe(PHONE_OTP_ZALO_V5_ENDPOINT);
        expect(payload.TempData).toEqual([{ key: 'otp', value: '001234' }]);
        return new Response(JSON.stringify({ CodeResult: '105', ErrorMessage: 'V5 rejected' }), { status: 200 });
      }
      expect(url).toBe(PHONE_OTP_ENDPOINT);
      expect(payload.Data[0]).toEqual({ OAID: config.oaid, TempID: config.templateId, Params: ['001234'], SmsType: '24', SendingMode: '1' });
      expect(payload.Data[1].IsUnicode).toBe(1);
      return new Response(JSON.stringify({ CodeResult: '100' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetch);
    await expect(sendEtrustOtp(config, '0912345678', '001234')).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledTimes(4);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ CodeResult: '102', ErrorMessage: 'Price table not configured' }), { status: 200 })),
    );
    const failedResult = await sendEtrustOtpWithDetails({ ...config, brandname: '' }, '0912345678', '001234');
    expect(failedResult.ok).toBe(false);
    expect(failedResult.codeResult).toBe('102');
    expect(failedResult.errorMessage).toBe('Price table not configured');
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
