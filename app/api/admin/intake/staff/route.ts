/**
 * POST /api/admin/intake/staff — N1 intake writer (STEP-08, TASK hrp-v6-n1-intake-writer).
 *
 * ADMIN/HR_STAFF endpoint (auth required). Staff nhập liệu candidate vào hệ thống.
 *
 * SECURITY:
 *   - Auth bắt buộc (getAuthContext). Role gate ADMIN/HR_MANAGER/HR_STAFF.
 *   - RLS context = actor thật qua withDbContext (RLS cho INSERT placement_case).
 *   - actorId = ctx.userId (audit); KHÔNG set referrer.
 *   - Idempotency-Key BẮT BUỘC.
 *
 * Response:
 *   - 201/200 với `{ verdict, laborProfileId, placementCaseId, candidateSubmissionId }`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { withIdempotency, IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import { warn, info } from '@/src/shared/observability/logger';
import {
  createCandidateSubmissionFromIntake,
  PossibleMatchNotResolvedError,
} from '@/src/domains/talent/intake-writer.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/intake/staff';

const STAFF_INTAKE_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'] as const);

const StaffIntakeBodySchema = z.object({
  fullName: z.string().min(1).max(255),
  phone: z.string().min(1).max(20),
  cccdNumber: z.string().max(20).optional(),
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  jobOpeningId: z.string().optional(),
  projectId: z.string().optional(),
  intent: z.enum(['JOB_INTEREST', 'GENERAL_INTEREST']),
  consentAt: z.string().datetime().optional(),
});

type StaffIntakeBody = z.infer<typeof StaffIntakeBodySchema>;

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: 'INVALID_INPUT', message }, { status: 400 });
}

function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth.
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  // 2. Role gate.
  if (!STAFF_INTAKE_ROLES.has(ctx.role as 'ADMIN')) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: `Role ${ctx.role} không có quyền staff intake` },
      { status: 403 },
    );
  }

  // 3. Idempotency-Key bắt buộc.
  const idempotencyKey = (req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? '').trim();
  if (!idempotencyKey || !isUuidLike(idempotencyKey)) {
    return badRequest('Header Idempotency-Key (UUID) is required');
  }

  // 4. Parse body.
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return badRequest('Body không phải JSON hợp lệ');
  }
  const parsed = StaffIntakeBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return badRequest(`Body không hợp lệ: ${parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`);
  }
  const body: StaffIntakeBody = parsed.data;

  const canonicalBody = {
    fullName: body.fullName,
    phone: body.phone,
    cccdNumber: body.cccdNumber ?? null,
    dateOfBirth: body.dateOfBirth ?? null,
    jobOpeningId: body.jobOpeningId ?? null,
    projectId: body.projectId ?? null,
    intent: body.intent,
  };

  const prisma = getPrisma();

  try {
    const result = await withIdempotency({
      prisma,
      route: ROUTE_KEY,
      actorId: ctx.userId,
      key: idempotencyKey,
      requestBody: canonicalBody,
      handler: async () => {
        const outcome = await withDbContext(prisma, ctx, async (tx) =>
          createCandidateSubmissionFromIntake(tx, {
            applicant: {
              fullName: body.fullName,
              phone: body.phone,
              cccdNumber: body.cccdNumber ?? null,
              dateOfBirth: body.dateOfBirth ?? null,
            },
            channel: 'STAFF_INTAKE',
            intent: body.intent,
            projectId: body.projectId ?? null,
            actorId: ctx.userId,
            partnerRef: null,
            consentAt: body.consentAt ? new Date(body.consentAt) : null,
          }),
        );

        info('talent.intake.create', null, {
          route: ROUTE_KEY,
          actorRole: ctx.role,
          resourceType: 'candidate_submission',
          outcome: outcome.match.verdict,
        });

        return {
          body: {
            verdict: outcome.match.verdict,
            laborProfileId: outcome.match.verdict === 'NEW_PROFILE' || outcome.match.verdict === 'EXACT_MATCH'
              ? outcome.match.laborProfileId
              : null,
            placementCaseId: outcome.placementCase.placementCaseId,
            candidateSubmissionId: outcome.candidateSubmission.id,
            signalsMatched: outcome.match.verdict === 'EXACT_MATCH' ? outcome.match.signalsMatched : undefined,
            possibleMatchCandidates: outcome.match.verdict === 'POSSIBLE_MATCH' ? outcome.match.candidates : undefined,
          },
          statusCode: 201,
        };
      },
    });

    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (err) {
    if (err instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: err.message }, { status: 409 });
    }
    if (err instanceof PossibleMatchNotResolvedError) {
      return NextResponse.json(
        {
          error: 'POSSIBLE_MATCH_NOT_RESOLVED',
          message: 'Có candidate phù hợp, vui lòng xác nhận thủ công.',
          candidates: err.match.verdict === 'POSSIBLE_MATCH' ? err.match.candidates : undefined,
          hasConflict: err.match.verdict === 'POSSIBLE_MATCH' ? err.match.hasConflict : undefined,
        },
        { status: 409 },
      );
    }
    if (err instanceof z.ZodError) {
      return badRequest(err.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; '));
    }
    warn('talent.intake.error', null, {
      route: ROUTE_KEY,
      actorRole: ctx.role,
      outcome: 'unhandled',
      errorCode:
        typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : 'UNCLASSIFIED',
    });
    return NextResponse.json({ error: 'INTERNAL', message: 'Staff intake failed' }, { status: 500 });
  }
}
