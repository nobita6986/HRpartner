/**
 * POST /api/public/referrals/[affCode]/capture — hrp-v6-n2-aff-02-link-capture (N2-2).
 *
 * Public unauthenticated WRITE that records a referral-link click as a
 * `referral_attributions` row. All design decisions are pinned in
 * docs/tasks/hrp-v6-n2-aff-02-link-capture/TASK.md §3 / §4.
 *
 * Order of guards (each one fail-closed):
 *   1. Rate-limit (DUAL bucket: IP + canonical affCode HMAC). Rejects 429 / 503.
 *   2. `Idempotency-Key` header (UUID v4). Rejects 400 if absent/malformed.
 *   3. Body parse (`{ source?: string }`). Rejects 400 on schema fail.
 *   4. Service `captureReferralLink()` — typed outcome mapped to HTTP per DEC-16.
 *
 * SECURITY:
 *   - The writer-vs-engine separation lives in the service: this handler
 *     only references `getPrisma()` for the writer side and `getEnginePrisma()`
 *     for the engine side (fail-closed on missing URL).
 *   - Idempotency is wrapped around the engine write to dedup double-clicks.
 *     Race / concurrent distinct-key inserts are handled via the engine-side
 *     advisory lock (service-level).
 *   - The handler NEVER logs the `affCode` value, idempotency key, raw IP, or
 *     user-agent. Only typed allow-list meta is passed to the structured logger.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { getEnginePrisma } from '@/src/db/engine-client';
import { withIdempotency, IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import {
  canonicalTrackingCode,
  clientIpFromHeaders,
  hashRateLimitIdentifier,
} from '@/src/shared/security/rate-limit-identity';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';
import { enforceRateLimits } from '@/src/shared/security/rate-limit-guard';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { info, warn } from '@/src/shared/observability/logger';
import { getRateLimitRuntime } from '@/src/shared/security/rate-limit-provider';
import {
  captureReferralLink,
  derivePublicActorId,
  type LinkCaptureOutcome,
} from '@/src/domains/referrals/link-capture.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ affCode: string }> };

const ROUTE_CLASS = 'POST /api/public/referrals/[affCode]/capture';

const CaptureBodySchema = z
  .object({
    source: z.string().max(64).optional(),
  })
  .strict()
  .nullable()
  .optional();

function badRequest(error: string, message: string): NextResponse {
  return NextResponse.json({ error, message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
}

function serverError(error: string, message: string): NextResponse {
  return NextResponse.json({ error, message }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}

function iso8601(d: Date): string {
  return d.toISOString();
}

/**
 * Translate the typed LinkCaptureOutcome to an HTTP envelope. Centralized so
 * the contract in TASK §4.4 has exactly one source of truth.
 */
function outcomeToResponse(outcome: LinkCaptureOutcome, requestId: string | null): NextResponse {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (requestId) headers['X-Request-Id'] = requestId;

  switch (outcome.kind) {
    case 'OK':
      return NextResponse.json(
        {
          captured: true,
          attributionId: outcome.attributionId,
          referrerUserId: outcome.referrerUserId,
          status: outcome.status,
          createdAt: iso8601(outcome.createdAt),
        },
        { status: 201, headers },
      );
    case 'INVALID_REFERRAL':
      return NextResponse.json(
        {
          error: 'INVALID_REFERRAL',
          message: 'Mã giới thiệu không hợp lệ hoặc đã hết hạn.',
        },
        { status: 400, headers },
      );
    case 'INVALID_INPUT':
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: outcome.reason },
        { status: 400, headers },
      );
    case 'IDEMPOTENCY_KEY_REQUIRED':
      return NextResponse.json(
        { error: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Header Idempotency-Key (UUID v4) is required.' },
        { status: 400, headers },
      );
    case 'RACE_RESOLVED':
      return NextResponse.json(
        { error: 'RACE_RESOLVED', message: 'Yêu cầu trùng lặp; vui lòng thử lại.' },
        { status: 409, headers },
      );
    case 'ENGINE_UNAVAILABLE':
      return serverError('ENGINE_UNAVAILABLE', 'Engine chưa sẵn sàng; thử lại sau ít phút.');
    case 'CAPTURE_FAILED':
      return serverError('CAPTURE_FAILED', 'Không thể ghi nhận click; thử lại sau ít phút.');
  }
}

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { affCode: rawAffCode } = await params;
  const requestId = getCorrelationId(req.headers);

  // Pre-decode for rate-limit bucket; full validation happens later in service.
  const canonicalAffCode = canonicalTrackingCode(rawAffCode ?? '');

  // 1. Rate-limit guard (DUAL bucket). Honor the existing helper's fail-closed
  //    semantics: 429/503 BEFORE any DB call.
  const clientIpBucket = clientIpFromHeaders(req.headers, process.env);
  let affCodeBucketHash: string;
  try {
    affCodeBucketHash = hashRateLimitIdentifier(
      RATE_LIMIT_RULES.REFERRAL_CAPTURE_CODE,
      canonicalAffCode,
      getRateLimitRuntime(process.env).hashSecret,
    );
  } catch {
    // Limiter not configured — same fail-closed semantics as enforceRateLimits.
    return NextResponse.json(
      { error: 'RATE_LIMIT_UNAVAILABLE', message: 'Rate limit provider unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const rateLimitResponse = await enforceRateLimits({
    buckets: [
      { rule: RATE_LIMIT_RULES.REFERRAL_CAPTURE_IP, value: clientIpBucket },
      // The affCode bucket uses the HMAC digest so we never feed the raw
      // affCode into the rate-limit provider. Bucket identity is opaque.
      { rule: RATE_LIMIT_RULES.REFERRAL_CAPTURE_CODE, value: affCodeBucketHash },
    ],
    routeClass: ROUTE_CLASS,
    requestId,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // 2. Idempotency-Key header.
  const idempotencyKey = (
    req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? ''
  ).trim();
  if (!idempotencyKey) {
    return badRequest('IDEMPOTENCY_KEY_REQUIRED', 'Header Idempotency-Key (UUID v4) is required.');
  }

  // 3. Body parse. The body is optional and currently accepts only `source`.
  let parsedBody: { source?: string } | null = null;
  const text = await req.text();
  if (text.length > 0) {
    let rawJson: unknown;
    try {
      rawJson = JSON.parse(text);
    } catch {
      return badRequest('INVALID_INPUT', 'Body không phải JSON hợp lệ.');
    }
    const parsed = CaptureBodySchema.safeParse(rawJson);
    if (!parsed.success) {
      return badRequest(
        'INVALID_INPUT',
        parsed.error.issues.map((i) => `${i.path.join('.') || '<root>'} ${i.message}`).join('; '),
      );
    }
    parsedBody = parsed.data ?? null;
  }

  // 4. Identity hashing for the public-actor scope (DEC-09). The raw IP and
  //    raw User-Agent are NEVER logged; only the hex digests are passed into
  //    the actor id derivation.
  const clientIpHash = hashClientIpForActor(clientIpBucket);
  const userAgentHash = hashUserAgentForActor(req.headers.get('user-agent') ?? '');

  // 5. Engine client — fail-closed if the URL is missing.
  let engine;
  try {
    engine = getEnginePrisma();
  } catch {
    warn('referral.link_capture.engine_unavailable', requestId, {
      route: ROUTE_CLASS,
      status: 503,
      outcome: 'engine_unavailable',
      errorCode: 'ENGINE_UNAVAILABLE',
    });
    return outcomeToResponse({ kind: 'ENGINE_UNAVAILABLE' }, requestId);
  }

  const writer = getPrisma();
  const actorId = derivePublicActorId({
    affCode: canonicalAffCode,
    idempotencyKey,
    body: parsedBody,
    clientIpHash,
    userAgentHash,
    requestId,
  });

  // 6. Idempotency wrapper — keyed on (actorId, route, key). Replays the
  //    stored response on duplicate keys within TTL.
  try {
    const result = await withIdempotency({
      prisma: writer,
      route: `${ROUTE_CLASS}/${canonicalAffCode}`,
      actorId,
      key: idempotencyKey,
      requestBody: parsedBody ?? null,
      handler: async () => {
        const outcome = await captureReferralLink(
          {
            affCode: canonicalAffCode,
            idempotencyKey,
            body: parsedBody,
            clientIpHash,
            userAgentHash,
            requestId,
          },
          { writer, engine },
        );
        if (outcome.kind === 'OK') {
          return {
            body: {
              captured: true,
              attributionId: outcome.attributionId,
              referrerUserId: outcome.referrerUserId,
              status: outcome.status,
              createdAt: iso8601(outcome.createdAt),
            },
            statusCode: 201,
          };
        }
        // For non-OK outcomes we DO NOT want to cache the failure (a 400
        // should not be deduped across minutes — the client can retry with
        // corrected input). Bubble the typed outcome up via marker error.
        throw new NonReplayableOutcome(outcome);
      },
    });

    info('referral.link_capture.replayed', requestId, {
      route: ROUTE_CLASS,
      status: result.statusCode,
      outcome: 'replayed',
      detail: { replayed: result.replayed },
    });
    return NextResponse.json(
      result.body,
      {
        status: result.statusCode,
        headers: {
          'Cache-Control': 'no-store',
          ...(requestId ? { 'X-Request-Id': requestId } : {}),
        },
      },
    );
  } catch (err) {
    if (err instanceof NonReplayableOutcome) {
      return outcomeToResponse(err.outcome, requestId);
    }
    if (err instanceof IdempotencyConflictError) {
      return NextResponse.json(
        { error: 'IDEMPOTENCY_CONFLICT', message: err.message },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (err instanceof z.ZodError) {
      return badRequest(
        'INVALID_INPUT',
        err.issues.map((i) => `${i.path.join('.') || '<root>'} ${i.message}`).join('; '),
      );
    }
    warn('referral.link_capture.unhandled', requestId, {
      route: ROUTE_CLASS,
      status: 500,
      outcome: 'unhandled',
    });
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Internal error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

/**
 * Marker error — used internally to bubble non-OK outcomes out of the
 * idempotency handler WITHOUT being persisted to the replay cache.
 */
class NonReplayableOutcome extends Error {
  readonly outcome: LinkCaptureOutcome;
  constructor(outcome: LinkCaptureOutcome) {
    super('non-replayable outcome');
    this.name = 'NonReplayableOutcome';
    this.outcome = outcome;
  }
}

/* ─── Identity hashing for the public-actor scope (DEC-09) ─────────────────── */

function hashClientIpForActor(ipHash: string): string {
  // `ipHash` is already the canonical (UNKNOWN_CLIENT_BUCKET = 'unknown' or
  // a raw IPv4/IPv6 string). For the actor scope we never use the raw IP —
  // we hash again to make the scope derivation independent of the rate-limit
  // domain. Truncated to 32 chars to match the project's existing convention.
  return Buffer.from(ipHash, 'utf8').toString('hex').slice(0, 32);
}

function hashUserAgentForActor(ua: string): string {
  if (ua.length === 0) return 'ua-unknown';
  return Buffer.from(ua, 'utf8').toString('hex').slice(0, 32);
}
