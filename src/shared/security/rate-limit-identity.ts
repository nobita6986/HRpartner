/**
 * rate-limit-identity.ts — V5-OPS-06A / RQ-02 / STEP-01 (DEC-05/07/12).
 *
 * Canonicalize + HMAC mọi identifier TRƯỚC khi chạm provider. Raw IP / raw phone /
 * raw tracking code KHÔNG bao giờ ra khỏi process: chỉ digest HMAC-SHA256 (namespaced
 * theo key-version + surface + subject) đi vào Redis key, và không có gì đi vào log.
 */
import { createHmac } from 'node:crypto';

import {
  RATE_LIMIT_KEY_VERSION,
  type EnvLike,
  type RateLimitRule,
} from './rate-limit-port';

/** Bucket opaque cho client IP missing/malformed (DEC-07) — KHÔNG random key. */
export const UNKNOWN_CLIENT_BUCKET = 'unknown';

const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const IPV6_RE = /^[0-9a-f:]{2,45}$/i;

export function isPlausibleIp(value: string): boolean {
  if (IPV4_RE.test(value)) return value.split('.').every((octet) => Number(octet) <= 255);
  return value.includes(':') && IPV6_RE.test(value);
}

/**
 * DEC-07 / EV-11: `x-forwarded-for` first value CHỈ được trust khi Vercel production
 * overwrite header (VERCEL_ENV === 'production'). Ngoài đó — kể cả preview/dev/test —
 * header do client kiểm soát nên gom hết vào `unknown` bucket (siết bởi
 * `tightenForUnknownSubject`), không tin, không random.
 */
export function clientIpFromHeaders(headers: Headers, env: EnvLike): string {
  if (env.VERCEL_ENV !== 'production') return UNKNOWN_CLIENT_BUCKET;
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (forwarded.length > 0 && isPlausibleIp(forwarded)) return forwarded;
  const realIp = headers.get('x-real-ip')?.trim() ?? '';
  if (realIp.length > 0 && isPlausibleIp(realIp)) return realIp;
  return UNKNOWN_CLIENT_BUCKET;
}

/** Tracking code case/space không được dùng để lách bucket. */
export function canonicalTrackingCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * DEC-05: HMAC-SHA256(secret, keyVersion|surface|subject|value) → 32 hex chars.
 * Namespace nằm TRONG material nên cùng một giá trị ở 2 surface cho 2 digest khác nhau.
 */
export function hashRateLimitIdentifier(rule: RateLimitRule, rawValue: string, hashSecret: string): string {
  const material = `${RATE_LIMIT_KEY_VERSION}|${rule.surface}|${rule.subject}|${rawValue}`;
  return createHmac('sha256', hashSecret).update(material, 'utf8').digest('hex').slice(0, 32);
}
