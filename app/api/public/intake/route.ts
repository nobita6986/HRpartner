/**
 * POST /api/public/intake — AFF-03B public anon N1 apply boundary (STEP-03).
 *
 * Canonical public anon N1 apply path. Reads signed `hrp_aff` cookie →
 * service-level pre-filter (`resolveActiveAttributionId`) →
 * delegates the entire write chain to the SECURITY DEFINER RPC
 * `hrp_public_intake_submission(p_payload jsonb)` (migration
 * `20260919100000_aff03b_public_intake_rpc`). The RPC owns:
 *
 *   - signal normalization + PL/pgSQL `scoreAndClassify` mirror (≥2-signal
 *     EXACT_MATCH rule preserved from src/domains/talent/labor-profile.service.ts:164-168)
 *   - INSERT labor_profiles (verdict='NEW_PROFILE' only)
 *   - INSERT placement_cases
 *   - INSERT candidate_submissions (vendor_id=NULL, ctv_id=NULL per DEC-13)
 *   - (when attribution id is non-null) UPDATE referral_attributions
 *     SET status='CONSUMED', consumed_at=now(), labor_profile_id=<lp_id>
 *     with the WHERE predicate
 *     AND status='ACTIVE' AND expires_at > now() AND labor_profile_id IS NULL
 *     as the DB-level guard (DEC-11 (c); RLS does NOT apply to the definer
 *     path because hrp_public_rpc is NOLOGIN BYPASSRLS — DEC-14)
 *   - (when the UPDATE consumed exactly one row) INSERT labor_profile_handling_assignments
 *     (source='AFF_INITIAL', assignee_user_id=<referrer_user_id>)
 *
 * The Prisma writer `createCandidateSubmissionFromIntake` is NOT called from
 * this route. It is preserved for non-anon flows (staff intake, admin tools)
 * that run under app_user_writer with the 2 writer policies from
 * `20260918100000_aff03_writer_select_on_referral_attributions`.
 *
 * Silent fail-safe: forged / expired / missing cookie or TOKEN_SIGNING_ERROR
 * (missing/short `RATE_LIMIT_HASH_SECRET`) → `referralAttributionId = null`;
 * the RPC still runs in non-attributed mode and returns 201 with the standard
 * DTO; no identity leak; no log line that distinguishes forged from missing.
 *
 * SECURITY:
 *   - Anonymous route; no auth. Auth comes from the signed cookie.
 *   - APPLY_IP rate-limit BEFORE parse (existing util).
 *   - Body shape CHẶT (RQ-09 RQ-06): only accepted fields; non-string rejected.
 *   - CV non-null → 422 CV_UPLOAD_DISABLED (matches legacy public apply).
 *   - APPLY_PHONE rate-limit BEFORE transaction (matches legacy pattern).
 *   - Idempotency-Key (UUID v4) REQUIRED.
 *   - 16 KiB body cap.
 *
 * BOUNDARY:
 *   - Does NOT set `app.role` (writer role default; relies on N2-1 + AFF-03 RLS).
 *   - Does NOT touch `prisma/schema.prisma`, `prisma/migrations/N2-*` (foundation
 *     and pre-existing AFF-* migrations are read-only).
 *   - Does NOT touch `src/domains/talent/**` (read-only: the writer is consumed
 *     for non-anon paths; not modified here).
 *   - Does NOT touch `src/domains/referrals/**` (read-only: the verify util is
 *     consumed, not modified).
 *   - Does NOT touch `/api/jobs/apply` (DEC-10 retired stub).
 *
 * RESPONSE:
 *   201 with `{ candidateSubmissionId, laborProfileId, placementCaseId, verdict }`.
 *   NEVER `referrerUserId`, NEVER `attributionId`, NEVER any referrer identity.
 *
 * ERROR MAP:
 *   400 INVALID_INPUT — body shape / type
 *   400 IDEMPOTENCY_KEY_REQUIRED — header missing
 *   413 PAYLOAD_TOO_LARGE — body > 16 KiB
 *   415 UNSUPPORTED_MEDIA_TYPE — content-type not application/json
 *   422 CV_UPLOAD_DISABLED — cv non-null
 *   409 POSSIBLE_MATCH_NOT_RESOLVED — possible-match from RPC (verified by AC-09 integration test)
 *   429 RATE_LIMITED — IP or phone bucket exceeded
 *   503 RATE_LIMIT_UNAVAILABLE — rate-limit provider down
 *   500 INTERNAL — unclassified
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { clientIpFromHeaders } from '@/src/shared/security/rate-limit-identity';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';
import { enforceRateLimits } from '@/src/shared/security/rate-limit-guard';
import { readCappedJson } from '@/src/shared/security/request-body';
import { withIdempotency, IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import { info, warn } from '@/src/shared/observability/logger';
import {
  submitPublicIntake,
  HRP_AFF_COOKIE,
  PossibleMatchNotResolvedError,
} from '@/src/domains/applications/aff03-public-intake.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/public/intake';
const ROUTE_CLASS = 'POST /api/public/intake';
/** Anonymous actor id for audit metadata. Stable, system-prefixed. */
const ANON_ACTOR_ID = 'system:public-intake';

interface ApplyBody {
  fullName?: string;
  phone?: string;
  cccdNumber?: string | null;
  dateOfBirth?: string | null;
  consentAt?: string | null;
  consent?: boolean;
  jobOpeningId?: string | null;
  projectId?: string | null;
  intent?: 'JOB_INTEREST' | 'GENERAL_INTEREST';
  idempotencyKey?: string;
  cv?: unknown;
}

const ACCEPTED_FIELDS = new Set([
  'fullName',
  'phone',
  'cccdNumber',
  'dateOfBirth',
  'consentAt',
  'consent',
  'jobOpeningId',
  'projectId',
  'intent',
  'idempotencyKey',
  'cv',
]);

const STRING_FIELDS = [
  'fullName',
  'phone',
  'cccdNumber',
  'dateOfBirth',
  'consentAt',
  'jobOpeningId',
  'projectId',
  'intent',
  'idempotencyKey',
] as const;

function badRequest(message: string): NextResponse {
  return NextResponse.json(
    { error: 'INVALID_INPUT', message },
    { status: 400, headers: { 'Cache-Control': 'no-store' } },
  );
}

function shapeViolation(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (!ACCEPTED_FIELDS.has(key)) return `Body chứa field không được hỗ trợ: ${key}`;
  }
  for (const key of STRING_FIELDS) {
    const v = body[key];
    if (v !== undefined && v !== null && typeof v !== 'string') {
      return `Field ${key} phải là chuỗi.`;
    }
  }
  if (body.consent !== undefined && typeof body.consent !== 'boolean') {
    return 'Field consent phải là boolean.';
  }
  if (
    body.intent !== undefined &&
    body.intent !== null &&
    body.intent !== 'JOB_INTEREST' &&
    body.intent !== 'GENERAL_INTEREST'
  ) {
    return 'Field intent phải là JOB_INTEREST hoặc GENERAL_INTEREST.';
  }
  return null;
}

function extractIdempotencyKey(req: NextRequest, body: ApplyBody): string {
  return (
    req.headers.get('idempotency-key') ??
    req.headers.get('x-idempotency-key') ??
    body.idempotencyKey ??
    ''
  ).trim();
}

function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/** Idempotency-Key closure: returns a stable body hash. */
function canonicalBody(body: ApplyBody) {
  return {
    fullName: body.fullName ?? '',
    phone: body.phone ?? '',
    cccdNumber: body.cccdNumber ?? null,
    dateOfBirth: body.dateOfBirth ?? null,
    consentAt: body.consentAt ?? null,
    intent: body.intent ?? null,
    jobOpeningId: body.jobOpeningId ?? null,
    projectId: body.projectId ?? null,
    cv: null,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = getCorrelationId(req.headers);

  // 1. APPLY_IP rate-limit BEFORE parse (R7 / DEC-09 pattern).
  const ipDenied = await enforceRateLimits({
    buckets: [{ rule: RATE_LIMIT_RULES.APPLY_IP, value: clientIpFromHeaders(req.headers, process.env) }],
    routeClass: ROUTE_CLASS,
    requestId,
  });
  if (ipDenied) return ipDenied;

  // 2. Body cap + media-type gate.
  const read = await readCappedJson<ApplyBody & Record<string, unknown>>(req);
  if (!read.ok) return read.response;
  const body = read.value;

  // 3. Shape chặt.
  const violation = shapeViolation(body);
  if (violation) return badRequest(violation);

  // 4. CV_UPLOAD_DISABLED (DEC-09): non-null cv rejected; null accepted for legacy compat.
  if (body.cv !== undefined && body.cv !== null) {
    return NextResponse.json(
      {
        error: 'CV_UPLOAD_DISABLED',
        message: 'Tính năng tải CV hiện đang tắt. Vui lòng gửi hồ sơ không kèm CV.',
      },
      { status: 422, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // 5. APPLY_PHONE rate-limit BEFORE transaction.
  const phone = body.phone ?? '';
  if (phone.length > 0) {
    const phoneDenied = await enforceRateLimits({
      buckets: [{ rule: RATE_LIMIT_RULES.APPLY_PHONE, value: phone }],
      routeClass: ROUTE_CLASS,
      requestId,
    });
    if (phoneDenied) return phoneDenied;
  }

  // 6. Idempotency-Key required (UUID).
  const idempotencyKey = extractIdempotencyKey(req, body);
  if (!idempotencyKey || !isUuidLike(idempotencyKey)) {
    return badRequest('Header Idempotency-Key (UUID) is required');
  }

  // 7. Consent timestamp.
  const consentAt = body.consentAt ?? (body.consent === true ? new Date().toISOString() : null);

  // 8. Read hrp_aff cookie (silent fail-safe; never logged).
  const hrpAffCookie = req.cookies.get(HRP_AFF_COOKIE)?.value ?? null;

  // 9. Service invocation, wrapped in withIdempotency.
  const prisma = getPrisma();
  const cBody = canonicalBody(body);

  try {
    const result = await withIdempotency({
      prisma,
      route: ROUTE_KEY,
      actorId: ANON_ACTOR_ID,
      key: idempotencyKey,
      requestBody: cBody,
      handler: async () => {
        const outcome = await prisma.$transaction(async (tx) => {
          const dto = await submitPublicIntake(tx, {
            applicant: {
              fullName: body.fullName ?? '',
              phone: body.phone ?? '',
              cccdNumber: body.cccdNumber ?? null,
              dateOfBirth: body.dateOfBirth ?? null,
              consentAt,
            },
            channel: 'PUBLIC_MARKETPLACE',
            intent: body.intent ?? 'JOB_INTEREST',
            projectId: body.projectId ?? null,
            jobOpeningId: body.jobOpeningId ?? null,
            hrpAffCookie,
            actorId: ANON_ACTOR_ID,
          });
          return dto;
        });

        info('talent.intake.public.create', requestId, {
          route: ROUTE_KEY,
          outcome: outcome.verdict,
          detail: { attributionBound: hrpAffCookie !== null }, // coarse flag; never logs cookie value
        });

        return { body: outcome, statusCode: 201 };
      },
    });

    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (err) {
    if (err instanceof IdempotencyConflictError) {
      return NextResponse.json(
        { error: 'IDEMPOTENCY_CONFLICT', message: err.message },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (err instanceof PossibleMatchNotResolvedError) {
      return NextResponse.json(
        {
          error: 'POSSIBLE_MATCH_NOT_RESOLVED',
          message: 'Có candidate phù hợp, vui lòng xác nhận thủ công.',
          candidates: err.match.verdict === 'POSSIBLE_MATCH' ? err.match.candidates : undefined,
        },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (err instanceof z.ZodError) {
      return badRequest(err.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; '));
    }
    warn('talent.intake.public.error', requestId, {
      route: ROUTE_KEY,
      outcome: 'unhandled',
      errorCode:
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : 'UNCLASSIFIED',
    });
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Public intake failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
