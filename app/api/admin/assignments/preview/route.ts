/**
 * POST /api/admin/assignments/preview — MP-3C STEP-03 (RQ-02, DEC-01/03/04).
 *
 * READ-ONLY placement preflight. ADMIN/HR_MANAGER only (DEC-04 — RLS also allows
 * DIRECTOR to write assignments, the app gate is deliberately narrower). Runs
 * inside `withDbContext` so every read is RLS-scoped to the caller.
 *
 * The client sends ONLY `submissionId` + assignment attributes; workerId, slotId,
 * staffingOrderId and projectId are derived server-side from the submission
 * (DEC-01). The response is advisory: activation re-checks everything under lock,
 * so a stale preview can never authorise a write (DEC-03).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  previewPlacement,
  PlacementError,
  type PlacementAttributes,
} from '@/src/domains/staffing/assignment-placement.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let ctx;
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
    const preview = await withDbContext(getPrisma(), ctx, (tx) =>
      previewPlacement(tx, ctx, {
        submissionId: String(body.submissionId ?? ''),
        employeeCode: String(body.employeeCode ?? ''),
        employmentType: String(body.employmentType ?? ''),
        workSetting: body.workSetting ?? null,
        validFrom: String(body.validFrom ?? ''),
        validTo: body.validTo ?? null,
      }),
    );
    return NextResponse.json({ preview });
  } catch (error) {
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
