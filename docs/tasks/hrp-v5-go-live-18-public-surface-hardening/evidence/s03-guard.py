# -*- coding: utf-8 -*-
import io

P = "src/shared/security/rate-limit-guard.ts"
t0 = io.open(P, encoding="utf-8").read()

OLD_DOC = u""" * Điểm vào DUY NHẤT của route: `enforceRateLimits()` trả
 *   - `null`      ⇒ được phép đi tiếp (mới được chạm DB),
 *   - `429`       ⇒ vượt limit (DEC-08 shape),
 *   - `503`       ⇒ limiter không khả dụng (DEC-02 fail-closed).
"""
NEW_DOC = u""" * Hai điểm vào, MỘT bản logic (go-live-18 / DEC-01 / RQ-01):
 *   - `evaluateRateLimits()` trả QUYẾT ĐỊNH thuần (`allowed` / `rate-limited` /
 *     `unavailable`). Đây là bản duy nhất chứa canonicalize + HMAC + fail-closed + log,
 *     và là điểm vào dùng được từ Server Component — nơi `NextResponse` không phải
 *     giá trị trả hợp lệ.
 *   - `enforceRateLimits()` là vỏ mỏng HTTP của route, nguyên tên và nguyên tham số:
 *       - `null`      ⇒ được phép đi tiếp (mới được chạm DB),
 *       - `429`       ⇒ vượt limit (DEC-08 shape),
 *       - `503`       ⇒ limiter không khả dụng (DEC-02 fail-closed).
"""

OLD_FN = u"""/**
 * Đánh giá TUẦN TỰ từng bucket; bucket đầu tiên deny thắng và các bucket sau
 * KHÔNG được đếm (không phóng đại counter cho subject vô can).
 *
 * Trả `null` khi mọi bucket cho qua. KHÔNG throw: mọi lỗi limiter thành 503.
 */
export async function enforceRateLimits(input: EnforceRateLimitsInput): Promise<NextResponse | null> {
  const env = input.env ?? process.env;
  const requestId = input.requestId ?? null;

  let runtime: ReturnType<typeof getRateLimitRuntime>;
  try {
    runtime = getRateLimitRuntime(env);
  } catch (err) {
    logUnavailable(input.routeClass, requestId, err);
    return unavailable();
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
      return unavailable();
    }

    if (!decision.allowed) {
      warn('rate_limit.denied', requestId, {
        route: input.routeClass,
        status: 429,
        outcome: 'rate_limited',
        detail: { surface: rule.surface, retryAfterSec: decision.retryAfterSec },
      });
      return tooManyRequests(decision);
    }
  }

  return null;
}
"""

NEW_FN = u"""/**
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
"""

OLD_MSG = u"""export const RATE_LIMITED_MESSAGE = 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.';"""
NEW_MSG = OLD_MSG + u"""
"""

OUTCOME = u"""/**
 * Quyết định thuần của limiter — KHÔNG mang `NextResponse` (DEC-01/RQ-01), để một
 * Server Component cũng tiêu thụ được cùng một logic với route handler.
 */
export type RateLimitOutcome =
  | { readonly kind: 'allowed' }
  | { readonly kind: 'rate-limited'; readonly decision: RateLimitDecision }
  | { readonly kind: 'unavailable' };

"""

edits = [
    (OLD_DOC, NEW_DOC),
    (u"export const RATE_LIMITED_MESSAGE", OUTCOME + u"export const RATE_LIMITED_MESSAGE"),
    (OLD_FN, NEW_FN),
]

t = t0
for old, new in edits:
    n = t.count(old)
    assert n == 1, "count=%d for %r" % (n, old[:60])
    t = t.replace(old, new, 1)

assert t.count(u"export async function enforceRateLimits(input: EnforceRateLimitsInput): Promise<NextResponse | null> {") == 1
assert t.count(u"hashRateLimitIdentifier(rule, canonical, runtime.hashSecret)") == 1, "HMAC must exist once"
assert t.count(u"canonicalValueFor(bucket.rule, bucket.value)") == 1, "canonicalize must exist once"
assert t.count(u"logUnavailable(") == 3, "2 call sites + 1 definition"
assert t.count(u"warn('rate_limit.denied'") == 1
assert t.count(u"console.") == 0
io.open(P, "w", encoding="utf-8", newline="\n").write(t)
print("STEP-03 OK", len(t0), "->", len(t))
