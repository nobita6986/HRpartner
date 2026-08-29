/**
 * rate-limit-port.ts — V5-OPS-06A / RQ-01/02 / STEP-01 (DEC-01..07).
 *
 * Provider-neutral async rate-limit port + launch rule matrix (DEC-04) + lazy config
 * resolution. KHÔNG đọc env ở module scope: `npm run build` không cần secret (RQ-01).
 * Production KHÔNG có in-memory fallback (DEC-02) — thiếu/sai env ⇒ RateLimitUnavailableError
 * ⇒ caller trả 503 `RATE_LIMIT_UNAVAILABLE` + `Retry-After: 5`, zero DB call.
 *
 * File này KHÔNG import adapter nào (tránh cycle): adapter import port, registry import cả hai.
 */

// ─── Rule matrix (DEC-04) ─────────────────────────────────────────────────────

export type RateLimitSurface =
  | 'JOB_BROWSE'
  | 'TRACKING_IP'
  | 'TRACKING_CODE'
  | 'APPLY_IP'
  | 'APPLY_PHONE';

export type RateLimitSubject = 'ip' | 'tracking-code' | 'phone';

export interface RateLimitRule {
  readonly surface: RateLimitSurface;
  readonly subject: RateLimitSubject;
  readonly limit: number;
  readonly windowSec: number;
}

/**
 * DEC-04 launch baseline. `JOB_BROWSE` dùng CHUNG cho list + detail (contract ghi
 * "browse list+detail 120/60s/IP" ⇒ một bucket, không phải 2×120). Tune chỉ qua spec revision.
 */
export const RATE_LIMIT_RULES = {
  JOB_BROWSE: { surface: 'JOB_BROWSE', subject: 'ip', limit: 120, windowSec: 60 },
  TRACKING_IP: { surface: 'TRACKING_IP', subject: 'ip', limit: 20, windowSec: 60 },
  TRACKING_CODE: { surface: 'TRACKING_CODE', subject: 'tracking-code', limit: 10, windowSec: 60 },
  APPLY_IP: { surface: 'APPLY_IP', subject: 'ip', limit: 10, windowSec: 600 },
  APPLY_PHONE: { surface: 'APPLY_PHONE', subject: 'phone', limit: 5, windowSec: 3600 },
} as const satisfies Record<RateLimitSurface, RateLimitRule>;

/**
 * DEC-07: client IP missing/malformed ⇒ gom vào opaque bucket `unknown` GIỚI HẠN CHẶT
 * (không tạo random key để bypass). Divisor áp cho IP bucket khi value = unknown.
 */
export const UNKNOWN_BUCKET_DIVISOR = 4;

export function tightenForUnknownSubject(rule: RateLimitRule): RateLimitRule {
  return { ...rule, limit: Math.max(1, Math.floor(rule.limit / UNKNOWN_BUCKET_DIVISOR)) };
}

// ─── Port ─────────────────────────────────────────────────────────────────────

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAtMs: number;
  readonly retryAfterSec: number;
}

/** Async port: adapter nào cũng phải trả decision hoặc throw RateLimitUnavailableError. */
export interface RateLimitProvider {
  readonly kind: 'upstash' | 'memory';
  limit(rule: RateLimitRule, identifier: string): Promise<RateLimitDecision>;
}

export type RateLimitUnavailableReason =
  | 'CONFIG_MISSING'
  | 'CONFIG_INVALID'
  | 'PROVIDER_ERROR'
  | 'PROVIDER_TIMEOUT'
  | 'MEMORY_IN_PRODUCTION';

/** DEC-12: message = reason code. KHÔNG bao giờ mang raw provider error/URL/token. */
export class RateLimitUnavailableError extends Error {
  readonly code = 'RATE_LIMIT_UNAVAILABLE';
  readonly reason: RateLimitUnavailableReason;
  constructor(reason: RateLimitUnavailableReason) {
    super(reason);
    this.name = 'RateLimitUnavailableError';
    this.reason = reason;
  }
}

export const RATE_LIMIT_UNAVAILABLE_RETRY_AFTER_SEC = 5;

export function retryAfterSecFrom(resetAtMs: number, nowMs: number): number {
  if (!Number.isFinite(resetAtMs)) return 1;
  return Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
}

// ─── Env + lazy config ────────────────────────────────────────────────────────

export type EnvLike = Record<string, string | undefined>;

export function isProductionEnv(env: EnvLike): boolean {
  return env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production';
}

export function envLabel(env: EnvLike): string {
  return env.VERCEL_ENV ?? env.NODE_ENV ?? 'unknown';
}

export const RATE_LIMIT_KEY_VERSION = 'v1';
export const MIN_HASH_SECRET_LENGTH = 32;

/** Pepper CHỈ dùng ngoài production để dev/unit không cần secret thật (DEC-02/03). */
export const DEV_ONLY_HASH_SECRET = 'hrp-dev-only-rate-limit-pepper-not-production';

export interface RateLimitConfig {
  readonly restUrl: string;
  readonly restToken: string;
  readonly hashSecret: string;
  readonly keyPrefixBase: string;
}

/** HMAC pepper. Production: bắt buộc `RATE_LIMIT_HASH_SECRET` ≥32 chars. */
export function resolveHashSecret(env: EnvLike): string {
  const raw = env.RATE_LIMIT_HASH_SECRET?.trim() ?? '';
  if (raw.length > 0) {
    if (raw.length < MIN_HASH_SECRET_LENGTH) throw new RateLimitUnavailableError('CONFIG_INVALID');
    return raw;
  }
  if (isProductionEnv(env)) throw new RateLimitUnavailableError('CONFIG_MISSING');
  return DEV_ONLY_HASH_SECRET;
}

/** Throws CONFIG_MISSING (chưa cấu hình) / CONFIG_INVALID (cấu hình sai) — không log giá trị. */
export function resolveRateLimitConfig(env: EnvLike): RateLimitConfig {
  const restUrl = env.UPSTASH_REDIS_REST_URL?.trim() ?? '';
  const restToken = env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? '';
  if (restUrl.length === 0 || restToken.length === 0) throw new RateLimitUnavailableError('CONFIG_MISSING');
  if (!restUrl.startsWith('https://')) throw new RateLimitUnavailableError('CONFIG_INVALID');
  return {
    restUrl,
    restToken,
    hashSecret: resolveHashSecret(env),
    keyPrefixBase: `hrp:rl:${RATE_LIMIT_KEY_VERSION}:${envLabel(env)}`,
  };
}

/** Redis key namespace: version + env + surface. KHÔNG chứa identifier (DEC-05/RQ-02). */
export function keyPrefixFor(config: RateLimitConfig, rule: RateLimitRule): string {
  return `${config.keyPrefixBase}:${rule.surface}`;
}
