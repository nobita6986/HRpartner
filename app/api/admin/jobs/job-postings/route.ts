/**
 * POST /api/admin/jobs/job-postings — P1-A0 admin authoring endpoint.
 *
 * Body schema (strict allowlist — only these keys are accepted):
 *   - slotId: string (UUID of an existing StaffingOrderSlot) — required
 *   - idempotency-key: provided as header `Idempotency-Key` (UUID required)
 *
 * Algorithm (DEC-07 + C-02 correction batch 1/1):
 *   1. withDbContext(prisma, ctx, ...) for RLS GUC.
 *   2. assertSlotEligibleForNewJobPosting — re-read + revalidate eligibility INSIDE the
 *      transaction (selector client is NEVER the authorization authority).
 *   3. withIdempotency → wrap the create-or-reuse chain (JobOpening + JobPosting DRAFT).
 *   4. createOrReuseJobOpeningForSlot → idempotent at service layer (race-safe).
 *   5. createOrReuseJobPostingDraftForOpening → idempotent.
 *   6. Return {jobOpening, jobPosting, slotRevalidation} where slotRevalidation carries
 *      the LIVE orderStatus so the client can render the correct chip without
 *      hard-coding.
 *
 * Auth (DEC-09): mutation roles = ADMIN/HR_MANAGER/HR_STAFF. Read stays in
 * the admin list route (`job-postings/route.ts` GET — A1 future).
 *
 * Forbidden:
 *   - No raw HTML persistence (validator on subsequent PATCH).
 *   - No anonymous route.
 *   - No bypass role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { IdempotencyConflictError, withIdempotency } from '@/src/shared/integrity/idempotency';
import {
  assertSlotEligibleForNewJobPosting,
  AuthoringError,
  createOrReuseJobOpeningForSlot,
  createOrReuseJobPostingDraftForOpening,
  type SlotRevalidationContext,
} from '@/src/domains/staffing/job-posting-authoring.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/jobs/job-postings';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const idempotencyKey = (
    req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? ''
  ).trim();
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_REQUIRED', message: 'Header Idempotency-Key is required to create a JobPosting draft' },
      { status: 400 },
    );
  }

  // Strict body allowlist — reject unknown keys at the boundary.
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'Body không phải JSON hợp lệ.' }, { status: 400 });
  }
  for (const key of Object.keys(body)) {
    if (key !== 'slotId') {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: `Trường không cho phép: ${key}.` },
        { status: 400 },
      );
    }
  }
  const slotId = typeof body.slotId === 'string' ? body.slotId : '';
  if (slotId.length === 0) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', message: 'slotId là bắt buộc.' },
      { status: 400 },
    );
  }

  const requestBody = [slotId];

  try {
    // C-02: eligibility revalidation runs INSIDE the same transaction as the
    // idempotent create-or-reuse chain. If eligibility fails, `assertSlotEligible...`
    // throws BEFORE any mutation → 400 + zero side effects. The selector dropdown
    // is informational only.
    const outcome = await withDbContext(getPrisma(), ctx, async (tx) => {
      const slotRevalidation: SlotRevalidationContext = await assertSlotEligibleForNewJobPosting(
        tx,
        slotId,
      );
      return withIdempotency({
        prisma: tx,
        route: ROUTE_KEY,
        actorId: ctx.userId,
        key: idempotencyKey,
        requestBody,
        handler: async () => {
          const jobOpening = await createOrReuseJobOpeningForSlot(tx, ctx, { slotId });
          const jobPosting = await createOrReuseJobPostingDraftForOpening(tx, ctx, {
            jobOpeningId: jobOpening.id,
          });
          return {
            body: { jobOpening, jobPosting, slotRevalidation },
          };
        },
      });
    });
    return NextResponse.json(
      { ...(outcome.body as Record<string, unknown>), replayed: outcome.replayed },
      { status: outcome.statusCode },
    );
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: error.message }, { status: 409 });
    }
    if (error instanceof AuthoringError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/jobs/job-postings POST] error:', error);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to create-or-reuse JobPosting draft' },
      { status: 500 },
    );
  }
}
