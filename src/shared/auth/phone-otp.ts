import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

export const PHONE_OTP_ENDPOINT = 'https://api-tinnhan.etrust.vn/MainService.svc/json/MultiChannelMessage/';
export const PHONE_OTP_ZALO_ENDPOINT = 'https://api-tinnhan.etrust.vn/MainService.svc/json/SendZaloMessage_V4_post_json/';
export const PHONE_OTP_ZALO_V5_ENDPOINT = 'https://api-tinnhan.etrust.vn/MainService.svc/json/SendZaloMessage_V5_post/';
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

export interface EtrustCallResult {
  ok: boolean;
  codeResult: string;
  errorMessage: string;
  endpoint: string;
}

export function readEtrustOtpConfig(
  apiKey: string,
  secretKey: string,
  oaid: string,
  env: Record<string, string | undefined> = process.env,
  overrides?: { templateId?: string | null; brandname?: string | null },
): EtrustOtpConfig | null {
  const templateId =
    overrides?.templateId?.trim() ||
    env.ETRUST_TEMPLATE_ID?.trim() ||
    DEFAULT_ETRUST_TEMPLATE_ID;
  const brandname =
    overrides?.brandname !== undefined && overrides.brandname !== null
      ? overrides.brandname.trim()
      : (env.ETRUST_BRANDNAME?.trim() || '');
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

export async function postEtrustJson(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<EtrustCallResult> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return {
        ok: false,
        codeResult: `HTTP_${response.status}`,
        errorMessage: `HTTP status ${response.status}`,
        endpoint,
      };
    }
    const result: unknown = await response.json();
    if (typeof result === 'object' && result !== null) {
      const rec = result as Record<string, unknown>;
      const codeResult = String(rec.CodeResult ?? rec.CodeResponse ?? '').trim();
      const errorMessage = String(rec.ErrorMessage ?? rec.Message ?? '').trim();
      const ok = codeResult === '100' || codeResult === '106';
      return {
        ok,
        codeResult: codeResult || 'UNKNOWN',
        errorMessage,
        endpoint,
      };
    }
    return {
      ok: false,
      codeResult: 'INVALID_JSON',
      errorMessage: 'Unexpected response payload from ETrust',
      endpoint,
    };
  } catch (err) {
    return {
      ok: false,
      codeResult: 'NETWORK_ERROR',
      errorMessage: err instanceof Error ? err.message : 'Network error calling ETrust',
      endpoint,
    };
  }
}

export async function sendEtrustOtpWithDetails(
  config: EtrustOtpConfig,
  phone: string,
  code: string,
): Promise<EtrustCallResult> {
  const attempts: EtrustCallResult[] = [];

  // Bước 1: SendZaloMessage_V4_post_json với SmsType="24" (Priority ZNS — nhóm chứa TempID 654010)
  const step1 = await postEtrustJson(PHONE_OTP_ZALO_ENDPOINT, {
    ApiKey: config.apiKey,
    SecretKey: config.secretKey,
    Phone: phone,
    TempID: config.templateId,
    OAID: config.oaid,
    Params: [code],
    SmsType: '24',
    SendingMode: '1',
    Sandbox: '0',
    RequestId: randomUUID(),
  });
  if (step1.ok) return step1;
  attempts.push(step1);

  // Bước 2: SendZaloMessage_V4_post_json không truyền SmsType (phòng trường hợp template chuyển nhóm)
  const step2 = await postEtrustJson(PHONE_OTP_ZALO_ENDPOINT, {
    ApiKey: config.apiKey,
    SecretKey: config.secretKey,
    Phone: phone,
    TempID: config.templateId,
    OAID: config.oaid,
    Params: [code],
    SendingMode: '1',
    Sandbox: '0',
    RequestId: randomUUID(),
  });
  if (step2.ok) return step2;
  attempts.push(step2);

  // Bước 3: SendZaloMessage_V5_post với TempData [{ key: "otp", value: code }]
  const step3 = await postEtrustJson(PHONE_OTP_ZALO_V5_ENDPOINT, {
    ApiKey: config.apiKey,
    SecretKey: config.secretKey,
    Phone: phone,
    TempID: config.templateId,
    OAID: config.oaid,
    SendingMode: '1',
    Sandbox: '0',
    TempData: [{ key: 'otp', value: code }],
    RequestId: randomUUID(),
  });
  if (step3.ok) return step3;
  attempts.push(step3);

  // Bước 4: Nếu có cấu hình SMS Brandname -> fallback MultiChannelMessage với SmsType="24"
  if (config.brandname?.trim()) {
    const step4 = await postEtrustJson(PHONE_OTP_ENDPOINT, {
      ApiKey: config.apiKey,
      SecretKey: config.secretKey,
      Phone: phone,
      Channels: ['zalo', 'sms'],
      Data: [
        {
          OAID: config.oaid,
          TempID: config.templateId,
          Params: [code],
          SmsType: '24',
          SendingMode: '1',
        },
        {
          Content: `Ma xac thuc HRP: ${code}. Ma co hieu luc trong 5 phut.`,
          IsUnicode: 1,
          SmsType: 2,
          Brandname: config.brandname.trim(),
          RequestId: randomUUID(),
        },
      ],
    });
    if (step4.ok) return step4;
    attempts.push(step4);
  }

  console.error(
    '[ETrust OTP Failed]',
    attempts.map((a) => ({
      endpoint: a.endpoint,
      codeResult: a.codeResult,
      errorMessage: a.errorMessage,
    })),
  );

  return attempts.find((a) => a.codeResult !== 'UNKNOWN' && a.codeResult !== 'NETWORK_ERROR') ?? attempts[0]!;
}

export async function sendEtrustOtp(
  config: EtrustOtpConfig,
  phone: string,
  code: string,
): Promise<boolean> {
  const result = await sendEtrustOtpWithDetails(config, phone, code);
  return result.ok;
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
