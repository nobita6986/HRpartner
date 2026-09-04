/**
 * rate-limit-guard.ts — V5-OPS-06A / RQ-02/03/04/05 / STEP-01 (DEC-02/05/07/08/12).
 *
 * Hai điểm vào, MỘT bản logic (go-live-18 / DEC-01 / RQ-01):
 *   - `evaluateRateLimits()` trả QUYẾT ĐỊNH thuần (`allowed` / `rate-limited` /
 *     `unavailable`). Đây là bản duy nhất chứa canonicalize + HMAC + fail-closed + log,
 *     và là điểm vào dùng được từ Server Component — nơi `NextResponse` không phải
 *     giá trị trả hợp lệ.
 *   - `enforceRateLimits()` là vỏ mỏng HTTP của route, nguyên tên và nguyên tham số:
 *       - `null`      ⇒ được phép đi tiếp (mới được chạm DB),
 *       - `429`       ⇒ vượt limit (DEC-08 shape),
 *       - `503`       ⇒ limiter không khả dụng (DEC-02 fail-closed).
 *
 * Mọi bucket được canonicalize + HMAC TRƯỚC khi tới provider (DEC-05): raw IP /
 * phone / tracking code không ra khỏi process. Log chỉ mang route class, outcome,
 * status, surface, retryAfter, requestId (DEC-12) — KHÔNG identifier, KHÔNG digest.
 */
import { NextResponse } from 'next/server';

import { warn } from '@/src/shared/observability/logger';

import {
  canonicalTrackingCode,
  hashRateLimitIdentifier,
  UNKNOWN_CLIENT_BUCKET,
} from './rate-limit-identity';
import {
  RATE_LIMIT_UNAVAILABLE_RETRY_AFTER_SEC,
  RateLimitUnavailableError,
  tightenForUnknownSubject,
  type EnvLike,
  type RateLimitDecision,
  type RateLimitRule,
} from './rate-limit-port';
import { getRateLimitRuntime } from './rate-limit-provider';

/** Một bucket = rule + giá trị THÔ (chưa hash). Guard tự canonicalize + HMAC. */
export interface RateLimitBucket {
  readonly rule: RateLimitRule;
  readonly value: string;
}

export interface EnforceRateLimitsInput {
  readonly buckets: readonly RateLimitBucket[];
  /** Route class TĨNH (template), không phải URL thật — DEC-12. */
  readonly routeClass: string;
  readonly requestId?: string | null;
  readonly env?: EnvLike;
}

/**
 * Quyết định thuần của limiter — KHÔNG mang `NextResponse` (DEC-01/RQ-01), để một
 * Server Component cũng tiêu thụ được cùng một logic với route handler.
 */
export type RateLimitOutcome =
  | { readonly kind: 'allowed' }
  | { readonly kind: 'rate-limited'; readonly decision: RateLimitDecision }
  | { readonly kind: 'unavailable' };

export const RATE_LIMITED_MESSAGE = 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.';
export const RATE_LIMIT_UNAVAILABLE_MESSAGE =
  'Hệ thống đang tạm thời quá tải. Vui lòng thử lại sau ít phút.';

/** Canonicalize theo subject để case/space không lách được bucket (DEC-05/07). */
function canonicalValueFor(rule: RateLimitRule, rawValue: string): string {
  if (rule.subject === 'tracking-code') return canonicalTrackingCode(rawValue);
  return rawValue.trim();
}

/** IP không xác định ⇒ bucket `unknown` bị siết (DEC-07), không random key. */
function effectiveRule(rule: RateLimitRule, canonicalValue: string): RateLimitRule {
  if (rule.subject === 'ip' && canonicalValue === UNKNOWN_CLIENT_BUCKET) {
    return tightenForUnknownSubject(rule);
  }
  return rule;
}

/** Header công khai: chỉ số lượng, KHÔNG identifier/digest (DEC-08). */
function rateLimitHeaders(decision: RateLimitDecision): Record<string, string> {
  return {
    'Cache-Control': 'no-store',
    'X-RateLimit-Limit': String(decision.limit),
    'X-RateLimit-Remaining': String(decision.remaining),
    'X-RateLimit-Reset': String(Math.ceil(decision.resetAtMs / 1000)),
  };
}

function tooManyRequests(decision: RateLimitDecision): NextResponse {
  return NextResponse.json(
    { error: 'RATE_LIMITED', message: RATE_LIMITED_MESSAGE },
    {
      status: 429,
      headers: { ...rateLimitHeaders(decision), 'Retry-After': String(decision.retryAfterSec) },
    },
  );
}

function unavailable(): NextResponse {
  return NextResponse.json(
    { error: 'RATE_LIMIT_UNAVAILABLE', message: RATE_LIMIT_UNAVAILABLE_MESSAGE },
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(RATE_LIMIT_UNAVAILABLE_RETRY_AFTER_SEC),
      },
    },
  );
}

/**
 * Đánh giá TUẦN TỰ từng bucket; bucket đầu tiên deny thắng và các bucket sau
 * KHÔNG được đếm (không phóng đại counter cho subject vô can).
 *
 * Điểm vào CHỈ-TRẢ-QUYẾT-ĐỊNH (DEC-01): không dựng `NextResponse`, nên gọi được từ
 * Server Component. KHÔNG throw: mọi lỗi limiter thành `unavailable`. Đây là bản DUY
 * NHẤT của canonicalize + HMAC + fail-closed + log trong tệp này.
 */
export async function evaluateRateLimits(input: EnforceRateLimitsInput): Promise<RateLimitOutcome> {
  const env = input.env ?? process.env;
  const requestId = input.requestId ?? null;

  let runtime: ReturnType<typeof getRateLimitRuntime>;
  try {
    runtime = getRateLimitRuntime(env);
  } catch (err) {
    logUnavailable(input.routeClass, requestId, err);
    return { kind: 'unavailable' };
  }

  for (const bucket of input.buckets) {
    const canonical = canonicalValueFor(bucket.rule, bucket.value);
    const rule = effectiveRule(bucket.rule, canonical);
    const identifier = hashRateLimitIdentifier(rule, canonical, runtime.hashSecret);

    let decision: RateLimitDecision;
    try {
      decision = await runtime.provider.limit(rule, identifier);
    } catch (err) {
      logUnavailable(input.routeClass, requestId, err, rule.surface);
      return { kind: 'unavailable' };
    }

    if (!decision.allowed) {
      warn('rate_limit.denied', requestId, {
        route: input.routeClass,
        status: 429,
        outcome: 'rate_limited',
        detail: { surface: rule.surface, retryAfterSec: decision.retryAfterSec },
      });
      return { kind: 'rate-limited', decision };
    }
  }

  return { kind: 'allowed' };
}

/**
 * Điểm vào của ROUTE, giữ nguyên tên và nguyên danh sách tham số. Vỏ mỏng: dịch
 * quyết định của `evaluateRateLimits` sang HTTP, không lặp lại một dòng logic nào.
 *
 * Trả `null` khi mọi bucket cho qua. KHÔNG throw: mọi lỗi limiter thành 503.
 */
export async function enforceRateLimits(input: EnforceRateLimitsInput): Promise<NextResponse | null> {
  const outcome = await evaluateRateLimits(input);
  if (outcome.kind === 'rate-limited') return tooManyRequests(outcome.decision);
  if (outcome.kind === 'unavailable') return unavailable();
  return null;
}

/** DEC-12: chỉ reason code, KHÔNG raw provider error/URL/token. */
function logUnavailable(
  routeClass: string,
  requestId: string | null,
  err: unknown,
  surface?: string,
): void {
  const reason = err instanceof RateLimitUnavailableError ? err.reason : 'PROVIDER_ERROR';
  warn('rate_limit.unavailable', requestId, {
    route: routeClass,
    status: 503,
    outcome: 'fail_closed',
    errorCode: 'RATE_LIMIT_UNAVAILABLE',
    detail: { reason, retryAfterSec: RATE_LIMIT_UNAVAILABLE_RETRY_AFTER_SEC, ...(surface ? { surface } : {}) },
  });
}
