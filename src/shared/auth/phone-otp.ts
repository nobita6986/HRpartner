import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

export const PHONE_OTP_ENDPOINT = 'https://api-tinnhan.etrust.vn/MainService.svc/json/MultiChannelMessage/';
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

export function readEtrustOtpConfig(apiKey: string, secretKey: string, env: Record<string, string | undefined> = process.env): EtrustOtpConfig | null {
  const { ETRUST_OAID: oaid, ETRUST_TEMPLATE_ID: templateId, ETRUST_BRANDNAME: brandname } = env;
  if (![apiKey, secretKey, oaid, templateId, brandname].every((value) => value?.trim())) return null;
  return { apiKey: apiKey.trim(), secretKey: secretKey.trim(), oaid: oaid!.trim(), templateId: templateId!.trim(), brandname: brandname!.trim() };
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

export async function sendEtrustOtp(config: EtrustOtpConfig, phone: string, code: string): Promise<boolean> {
  const response = await fetch(PHONE_OTP_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ApiKey: config.apiKey,
      SecretKey: config.secretKey,
      Phone: phone,
      Channels: ['zalo', 'sms'],
      Data: [
        { OAID: config.oaid, TempID: config.templateId, Params: [code] },
        { Content: `Ma xac thuc HRP: ${code}. Ma co hieu luc trong 5 phut.`, IsUnicode: 1, SmsType: 2, Brandname: config.brandname, RequestId: randomUUID() },
      ],
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return false;
  try {
    const result: unknown = await response.json();
    return typeof result === 'object' && result !== null && 'CodeResult' in result && (result as { CodeResult?: unknown }).CodeResult === '100';
  } catch {
    return false;
  }
}
