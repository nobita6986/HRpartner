/**
 * POST /api/admin/recruiter/placements/[id]/actions/fail
 *
 * P1-A0.4 R3-B08 — Recruiter-scoped Placement fail. HR_STAFF only.
 *
 * Adapter derives canonical anchors server-side, fires the dual-authority
 * predicate, then delegates to `failPlacement`. Service writes
 * `failureReason` server-side; route layer MUST NOT accept or silently
 * ignore client-supplied `reason` (C-06).
 */
import { NextRequest } from 'next/server';
import {
  recruiterPlacementFail,
  type RecruiterPlacementTransitionInput,
} from '@/src/domains/talent/recruiter-placement.adapter';
import { runRecruiterPlacementCommand } from '@/src/domains/talent/recruiter-placement.route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/recruiter/placements/[id]/actions/fail';
const COMMAND_NAME = 'recruiter_placement.fail';

interface FailBodyShape {
  [key: string]: unknown;
}

function validateEmptyBody(raw: unknown):
  | { ok: true; value: Record<string, never> }
  | { ok: false; error: string; message: string } {
  if (raw === undefined || raw === null) return { ok: true, value: {} };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'VALIDATION', message: 'Body phải là {} hoặc empty' };
  }
  const keys = Object.keys(raw as FailBodyShape);
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
      return recruiterPlacementFail(tx, input);
    },
  });
}