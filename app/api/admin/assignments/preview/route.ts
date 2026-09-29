/**
 * POST /api/admin/assignments/preview — MP-3C STEP-03 (RQ-02, DEC-01/03/04).
 *
 * READ-ONLY placement preflight. ADMIN/HR_MANAGER only (DEC-04 — RLS also allows
 * DIRECTOR to write assignments, the app gate is deliberately narrower). Runs
 * inside `withDbContext` so every read is RLS-scoped to the caller.
 *
 * P1-A0.4 (R3-F03): HR_STAFF with active recruiter assignment on the order is
 * admitted only after the dual-authority predicate passes:
 *   (a) ACTIVE StaffingOrderRecruiterAssignment on the derived order, AND
 *   (b) ACTIVE LaborProfileHandlingAssignment for the LaborProfile.
 * ADMIN/HR_MANAGER bypass per DEC-25. The preview itself remains READ-ONLY —
 * it writes NOTHING (DEC-03) so a stale preview can never authorise a write.
 *
 * The client sends ONLY `submissionId` + assignment attributes; workerId, slotId,
 * staffingOrderId and projectId are derived server-side from the submission
 * (DEC-01). The response is advisory: activation re-checks everything under lock,
 * so a stale preview can never authorise a write (DEC-03).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext, type AuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  previewPlacement,
  PlacementError,
  type PlacementAttributes,
} from '@/src/domains/staffing/assignment-placement.service';
import {
  assertRecruiterAndHandlingDualAuthorityForPlacement,
  RecruiterAssignmentError,
} from '@/src/domains/talent/recruiter-assignment.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let ctx: AuthContext;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  let body: Partial<PlacementAttributes>;
  try {
    body = (await req.json()) as Partial<PlacementAttributes>;
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const prisma = getPrisma();
    const preview = await withDbContext(prisma, ctx, async (tx) => {
      // P1-A0.4 (R3-F03): dual-authority preflight for HR_STAFF callers.
      // We must (1) look up the submission + slot to derive the order and the
      // labor profile, then (2) verify both authority rows under the order
      // advisory lock. A preview is read-only — we never INSERT anything, but
      // the authority check is identical to the activatePlacement path so
      // callers can trust the projection.
      const submission = await tx.candidateSubmission.findUnique({
        where: { id: String(body.submissionId ?? '') },
        select: {
          id: true,
          laborProfileId: true,
          slot: { select: { staffingOrderId: true } },
        },
      });
      if (submission && ctx.role === 'HR_STAFF' && submission.slot && submission.laborProfileId) {
        await assertRecruiterAndHandlingDualAuthorityForPlacement(tx, {
          actorId: ctx.userId,
          actorRole: ctx.role,
          staffingOrderId: submission.slot.staffingOrderId,
          laborProfileId: submission.laborProfileId,
        });
      }
      return previewPlacement(tx, ctx, {
        submissionId: String(body.submissionId ?? ''),
        employeeCode: String(body.employeeCode ?? ''),
        employmentType: String(body.employmentType ?? ''),
        workSetting: body.workSetting ?? null,
        validFrom: String(body.validFrom ?? ''),
        validTo: body.validTo ?? null,
      });
    });
    return NextResponse.json({ preview });
  } catch (error) {
    if (error instanceof RecruiterAssignmentError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    if (error instanceof PlacementError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/assignments/preview] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to preview placement' }, { status: 500 });
  }
}
