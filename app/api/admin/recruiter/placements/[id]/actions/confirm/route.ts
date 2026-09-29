/**
 * POST /api/admin/recruiter/placements/[id]/actions/confirm
 *
 * P1-A0.4 R3-B08 — Recruiter-scoped Placement confirm. HR_STAFF only.
 *
 * The canonical route (`/api/admin/placements/[id]/actions/confirm`) is
 * gated to ADMIN/HR_MANAGER. This dedicated surface lets an HR_STAFF
 * recruiter with an ACTIVE `StaffingOrderRecruiterAssignment` AND an
 * ACTIVE `LaborProfileHandlingAssignment` complete the canonical flow.
 *
 * Server-derived canonical anchors (B-08, DEC-01): the adapter
 * `recruiterPlacementConfirm` re-reads the placement row inside the same
 * tx to derive `staffingOrderId`, `laborProfileId`, `jobOpeningId`,
 * `placementCaseId`, and fires the dual-authority predicate BEFORE the
 * canonical `confirmPlacement` runs (defense in depth). The canonical
 * service fires the predicate AGAIN under the same order advisory lock.
 *
 * ADMIN/HR_MANAGER MUST continue to use `/api/admin/placements/...`.
 */
import { NextRequest } from 'next/server';
import {
  recruiterPlacementConfirm,
  type RecruiterPlacementTransitionInput,
} from '@/src/domains/talent/recruiter-placement.adapter';
import { runRecruiterPlacementCommand } from '@/src/domains/talent/recruiter-placement.route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/recruiter/placements/[id]/actions/confirm';
const COMMAND_NAME = 'recruiter_placement.confirm';

interface ConfirmBodyShape {
  [key: string]: unknown;
}

function validateEmptyBody(raw: unknown):
  | { ok: true; value: Record<string, never> }
  | { ok: false; error: string; message: string } {
  if (raw === undefined || raw === null) return { ok: true, value: {} };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'VALIDATION', message: 'Body phải là {} hoặc empty' };
  }
  const keys = Object.keys(raw as ConfirmBodyShape);
  if (keys.length > 0) {
    return {
      ok: false,
      error: 'VALIDATION',
      message: `Body phải là {}; received unknown field(s): ${keys.join(', ')}`,
    };
  }
  return { ok: true, value: {} };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: placementId } = await params;

  return runRecruiterPlacementCommand(req, {
    route: ROUTE_KEY,
    command: COMMAND_NAME,
    placementId,
    statusCode: 200,
    parseBody: validateEmptyBody,
    run: (tx, ctx) => {
      const input: RecruiterPlacementTransitionInput = {
        placementId,
        actorId: ctx.userId,
        actorRole: 'HR_STAFF',
      };
      return recruiterPlacementConfirm(tx, input);
    },
  });
}