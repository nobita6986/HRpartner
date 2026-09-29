/**
 * POST /api/admin/assignments/preview — MP-3C STEP-03 (RQ-02, DEC-01/03/04).
 *
 * READ-ONLY placement preflight. ADMIN/HR_MANAGER reach `previewPlacement`
 * directly. HR_STAFF recruiters reach it only when the dual-authority
 * predicate can be FULLY EVALUATED under `withDbContext`:
 *
 *   (a) `submissionId` resolves to an existing submission,
 *   (b) that submission's `slot` exists and exposes `staffingOrderId`,
 *   (c) the submission has a `laborProfileId`,
 *   (d) an ACTIVE `StaffingOrderRecruiterAssignment` exists for the
 *       recruiter on the derived order,
 *   (e) an ACTIVE `LaborProfileHandlingAssignment` exists for the
 *       recruiter on the derived `LaborProfile`.
 *
 * For HR_STAFF callers, ANY missing condition MUST fail closed with the
 * canonical safe envelope (404 NOT_FOUND or 403 FORBIDDEN depending on
 * which condition fails) — and `previewPlacement` MUST NEVER be invoked
 * when the predicate is not fully evaluated. This avoids leaking
 * existence-oracle information through the preview surface.
 *
 * ADMIN/HR_MANAGER bypass per DEC-25 — the predicate is skipped and the
 * service is called directly. The preview remains READ-ONLY (DEC-03):
 * no INSERT, no UPDATE; a stale preview cannot authorise a write.
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

  const submissionId = String(body.submissionId ?? '');

  try {
    const prisma = getPrisma();
    const preview = await withDbContext(prisma, ctx, async (tx) => {
      if (ctx.role === 'HR_STAFF') {
        // B-02: HR_STAFF callers MUST clear the dual-authority predicate in
        // FULL before `previewPlacement` is ever invoked. ANY missing link
        // returns the safe envelope; the canonical service is NEVER reached
        // for an HR_STAFF caller that fails this gate.
        if (!submissionId) {
          const err = new RecruiterAssignmentError(
            'NO_ACTIVE_ASSIGNMENT',
            'Submission không tồn tại',
            404,
            { reason: 'submission_not_found' },
          );
          throw err;
        }
        const submission = await tx.candidateSubmission.findUnique({
          where: { id: submissionId },
          select: {
            id: true,
            laborProfileId: true,
            slot: { select: { staffingOrderId: true } },
          },
        });
        if (!submission) {
          throw new RecruiterAssignmentError(
            'NO_ACTIVE_ASSIGNMENT',
            'Submission không tồn tại',
            404,
            { reason: 'submission_not_found' },
          );
        }
        if (!submission.slot) {
          throw new RecruiterAssignmentError(
            'NO_ACTIVE_ASSIGNMENT',
            'Submission thiếu slot anchor',
            404,
            { reason: 'slot_missing' },
          );
        }
        if (!submission.laborProfileId) {
          throw new RecruiterAssignmentError(
            'NO_ACTIVE_ASSIGNMENT',
            'Submission thiếu LaborProfile anchor',
            404,
            { reason: 'labor_profile_missing' },
          );
        }
        // Both authority checks fire inside the same tx under the order
        // advisory lock. Either fails closed with NO_ACTIVE_ORDER_ASSIGNMENT
        // or NO_ACTIVE_ASSIGNMENT.
        await assertRecruiterAndHandlingDualAuthorityForPlacement(tx, {
          actorId: ctx.userId,
          actorRole: ctx.role,
          staffingOrderId: submission.slot.staffingOrderId,
          laborProfileId: submission.laborProfileId,
        });
        // Dual-authority cleared → safe to invoke the preview service.
        return previewPlacement(tx, ctx, {
          submissionId,
          employeeCode: String(body.employeeCode ?? ''),
          employmentType: String(body.employmentType ?? ''),
          workSetting: body.workSetting ?? null,
          validFrom: String(body.validFrom ?? ''),
          validTo: body.validTo ?? null,
        });
      }
      // ADMIN/HR_MANAGER bypass per DEC-25 — predicate skipped.
      return previewPlacement(tx, ctx, {
        submissionId,
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
