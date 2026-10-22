import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

export const PHONE_OTP_ENDPOINT = 'https://api-tinnhan.etrust.vn/MainService.svc/json/MultiChannelMessage/';
export const PHONE_OTP_ZALO_ENDPOINT = 'https://api-tinnhan.etrust.vn/MainService.svc/json/SendZaloMessage_V4_post_json/';
export const PHONE_OTP_TEMPLATE_ENDPOINT = 'https://api-tinnhan.etrust.vn/MainService.svc/json/GetTemplate/';
export const DEFAULT_ETRUST_TEMPLATE_ID = '654010';
export const PHONE_OTP_TTL_MS = 5 * 60 * 1000;
export const PHONE_OTP_COOLDOWN_SECONDS = 60;
export const PHONE_OTP_SEND_WINDOW_MS = 60 * 60 * 1000;
export const PHONE_OTP_MAX_SENDS_PER_WINDOW = 5;
export const PHONE_OTP_MAX_ATTEMPTS = 5;

export interface EtrustOtpConfig {
  apiKey: string;
  secretKey: string;
  oaid: string;
  templateId: string;
  brandname: string;
}

export function readEtrustOtpConfig(apiKey: string, secretKey: string, oaid: string, env: Record<string, string | undefined> = process.env): EtrustOtpConfig | null {
  const templateId = env.ETRUST_TEMPLATE_ID?.trim() || DEFAULT_ETRUST_TEMPLATE_ID;
  const brandname = env.ETRUST_BRANDNAME?.trim() || '';
  if (![apiKey, secretKey, oaid, templateId].every((value) => value?.trim())) return null;
  return { apiKey: apiKey.trim(), secretKey: secretKey.trim(), oaid: oaid.trim(), templateId, brandname };
}

export function newPhoneOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function phoneOtpDigest(secret: string, userId: string, phone: string, code: string): string {
  return createHmac('sha256', secret).update(`hrp-phone-otp:v1:${userId}:${phone}:${code}`).digest('hex');
}

export function phoneDigest(secret: string, userId: string, phone: string): string {
  return createHmac('sha256', secret).update(`hrp-phone:v1:${userId}:${phone}`).digest('hex');
}

export function matchesPhoneOtpDigest(expected: string, actual: string): boolean {
  const expectedBytes = Buffer.from(expected, 'hex');
  const actualBytes = Buffer.from(actual, 'hex');
  return expectedBytes.length === 32 && actualBytes.length === 32 && timingSafeEqual(expectedBytes, actualBytes);
}

async function postEtrustJson(endpoint: string, payload: Record<string, unknown>): Promise<boolean> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return false;
  try {
    const result: unknown = await response.json();
    const ok = typeof result === 'object' && result !== null && 'CodeResult' in result && String((result as { CodeResult?: unknown }).CodeResult) === '100';
    if (!ok && typeof result === 'object' && result !== null) {
      const codeResult = 'CodeResult' in result ? String((result as { CodeResult?: unknown }).CodeResult ?? '') : '';
      const errorMessage = 'ErrorMessage' in result ? String((result as { ErrorMessage?: unknown }).ErrorMessage ?? '') : '';
      console.error('[phone-otp] provider rejected request:', { codeResult, errorMessage });
    }
    return ok;
  } catch {
    return false;
  }
}

export async function sendEtrustOtp(config: EtrustOtpConfig, phone: string, code: string): Promise<boolean> {
  if (config.brandname?.trim()) {
    return postEtrustJson(PHONE_OTP_ENDPOINT, {
      ApiKey: config.apiKey,
      SecretKey: config.secretKey,
      Phone: phone,
      Channels: ['zalo', 'sms'],
      Data: [
        { OAID: config.oaid, TempID: config.templateId, Params: [code] },
        { Content: `Ma xac thuc HRP: ${code}. Ma co hieu luc trong 5 phut.`, IsUnicode: 1, SmsType: 2, Brandname: config.brandname, RequestId: randomUUID() },
      ],
    });
  }

  return postEtrustJson(PHONE_OTP_ZALO_ENDPOINT, {
    ApiKey: config.apiKey,
    SecretKey: config.secretKey,
    Phone: phone,
    OAID: config.oaid,
    TempID: config.templateId,
    Params: [code],
    Sandbox: '0',
    RequestId: randomUUID(),
  });
}

export async function getEtrustOtpTemplates(apiKey: string, secretKey: string, oaid: string): Promise<{ normal: unknown; priority: unknown }> {
  const get = async (smsType: '24' | '25') => {
    const response = await fetch(PHONE_OTP_TEMPLATE_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ApiKey: apiKey, SecretKey: secretKey, OAId: oaid, SmsType: smsType }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error('ETrust template lookup failed');
    return response.json() as Promise<unknown>;
  };
  const [normal, priority] = await Promise.all([get('25'), get('24')]);
  return { normal, priority };
}
