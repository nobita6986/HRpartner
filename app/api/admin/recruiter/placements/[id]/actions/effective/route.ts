/**
 * POST /api/admin/recruiter/placements/[id]/actions/effective
 *
 * P1-A0.4 R3-B08 — Recruiter-scoped Placement effective. HR_STAFF only.
 *
 * Confirms the placement reached EFFECTIVE (client-managed acknowledgement).
 * The canonical service `markPlacementEffective` enforces:
 *   - managementMode=CLIENT_MANAGED — HRP-managed REJECT (DEC-07);
 *   - evidence.clientAcknowledgedAt + clientAcknowledgedByUserId +
 *     acknowledgementRef required (AC-07);
 *   - atomic PlacementCase SUCCESS closure on success (DEC-08).
 *
 * The adapter `recruiterPlacementEffective` re-reads the placement row
 * server-side, derives canonical anchors, fires the dual-authority
 * predicate, and only THEN delegates to `markPlacementEffective` — the
 * canonical service fires the predicate AGAIN under the same lock.
 *
 * ADMIN/HR_MANAGER MUST continue to use `/api/admin/placements/...`.
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  recruiterPlacementEffective,
  type RecruiterPlacementTransitionInput,
} from '@/src/domains/talent/recruiter-placement.adapter';
import {
  runRecruiterPlacementCommand,
  parseStrictIso8601Date,
  isUuidV4,
} from '@/src/domains/talent/recruiter-placement.route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/recruiter/placements/[id]/actions/effective';
const COMMAND_NAME = 'recruiter_placement.effective';

const EvidenceSchema = z.object({
  clientAcknowledgedAt: z.string().datetime({
    offset: true,
    message: 'evidence.clientAcknowledgedAt phải là ISO-8601 nghiêm ngặt (RFC 3339)',
  }),
  clientAcknowledgedByUserId: z.string().refine(isUuidV4, {
    message: 'evidence.clientAcknowledgedByUserId phải là UUID v4',
  }),
  acknowledgementRef: z.string().min(1).max(256),
});

interface EffectiveBodyShape {
  evidence?: unknown;
}

function validateEffectiveBody(raw: unknown):
  | {
      ok: true;
      value: { evidence: { clientAcknowledgedAt: Date; clientAcknowledgedByUserId: string; acknowledgementRef: string } };
    }
  | { ok: false; error: string; message: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'VALIDATION', message: 'Body phải là JSON object' };
  }
  const r = raw as EffectiveBodyShape;
  if (!r.evidence || typeof r.evidence !== 'object') {
    return {
      ok: false,
      error: 'VALIDATION',
      message: 'evidence là bắt buộc cho placement.effective',
    };
  }
  const result = EvidenceSchema.safeParse(r.evidence);
  if (!result.success) {
    return {
      ok: false,
      error: 'VALIDATION',
      message: result.error.issues.map((i) => i.message).join('; '),
    };
  }
  return {
    ok: true,
    value: {
      evidence: {
        clientAcknowledgedAt: parseStrictIso8601Date(result.data.clientAcknowledgedAt),
        clientAcknowledgedByUserId: result.data.clientAcknowledgedByUserId,
        acknowledgementRef: result.data.acknowledgementRef,
      },
    },
  };
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
    parseBody: validateEffectiveBody,
    run: (tx, ctx, value) => {
      const input: RecruiterPlacementTransitionInput = {
        placementId,
        actorId: ctx.userId,
        actorRole: 'HR_STAFF',
        evidence: value.evidence,
      };
      return recruiterPlacementEffective(tx, input);
    },
  });
}