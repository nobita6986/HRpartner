/**
 * POST /api/admin/placements/[id]/actions/effective — placement.effective
 * (RQ-01..RQ-19, contract v1.2 §4.1.1).
 *
 * Client-managed only (DEC-07). HRP-managed → service throws
 * `PlacementValidationError` → route maps HTTP 400 (C-07 — NO 422; taxonomy
 * freeze; no synthetic HRP-rejection code).
 *
 * Evidence shape (strict — C-02 round 2):
 *   { clientAcknowledgedAt: strict ISO-8601 (RFC 3339) string,
 *     clientAcknowledgedByUserId: string,
 *     acknowledgementRef: string }
 * Reject unknown fields and non-ISO timestamps. The Zod schema lives in
 * the helper (`STRICT_ISO8601`) and the route uses `parseStrictIso8601Date`
 * so we never reach for `Date.parse` (which accepts loose strings).
 *
 * Single transaction boundary (C-03) via `runPlacementCommand`.
 */
import { NextRequest } from 'next/server';
import { placementEffective, PLACEMENT_COMMAND_ROUTES } from '@/src/domains/talent/placement.commands';
import { parseStrictIso8601Date, runPlacementCommand } from '@/src/domains/talent/placement.route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface EffectiveBodyShape {
  evidence?: {
    clientAcknowledgedAt?: unknown;
    clientAcknowledgedByUserId?: unknown;
    acknowledgementRef?: unknown;
  };
}

function validateEvidence(raw: unknown):
  | {
      ok: true;
      value: {
        evidence: {
          clientAcknowledgedAt: Date;
          clientAcknowledgedByUserId: string;
          acknowledgementRef: string;
        };
      };
    }
  | { ok: false; error: string; message: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'VALIDATION', message: 'Body phải là JSON object' };
  }
  const r = raw as EffectiveBodyShape;

  // Strict allowlist (C-06) — only `evidence` is allowed.
  const allowed = new Set(['evidence']);
  for (const k of Object.keys(r)) {
    if (!allowed.has(k)) {
      return { ok: false, error: 'VALIDATION', message: `Unknown field: ${k}` };
    }
  }
  if (typeof r.evidence !== 'object' || r.evidence === null || Array.isArray(r.evidence)) {
    return { ok: false, error: 'VALIDATION', message: 'evidence bắt buộc và phải là object' };
  }

  const e = r.evidence;
  const allowedEvidenceFields = new Set(['clientAcknowledgedAt', 'clientAcknowledgedByUserId', 'acknowledgementRef']);
  for (const k of Object.keys(e)) {
    if (!allowedEvidenceFields.has(k)) {
      return { ok: false, error: 'VALIDATION', message: `Unknown evidence field: ${k}` };
    }
  }

  // C-02 round 2: strict ISO-8601 via Zod. Reject loose `Date.parse`-able strings.
  if (typeof e.clientAcknowledgedAt !== 'string') {
    return { ok: false, error: 'VALIDATION', message: 'evidence.clientAcknowledgedAt phải là ISO-8601 string' };
  }
  let ts: Date;
  try {
    ts = parseStrictIso8601Date(e.clientAcknowledgedAt);
  } catch {
    return { ok: false, error: 'VALIDATION', message: 'evidence.clientAcknowledgedAt không phải ISO-8601 nghiêm ngặt (RFC 3339)' };
  }

  if (typeof e.clientAcknowledgedByUserId !== 'string' || !e.clientAcknowledgedByUserId.trim()) {
    return { ok: false, error: 'VALIDATION', message: 'evidence.clientAcknowledgedByUserId bắt buộc' };
  }
  if (typeof e.acknowledgementRef !== 'string' || !e.acknowledgementRef.trim()) {
    return { ok: false, error: 'VALIDATION', message: 'evidence.acknowledgementRef bắt buộc' };
  }

  return {
    ok: true,
    value: {
      evidence: {
        clientAcknowledgedAt: ts,
        clientAcknowledgedByUserId: e.clientAcknowledgedByUserId,
        acknowledgementRef: e.acknowledgementRef,
      },
    },
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: placementId } = await params;

  return runPlacementCommand(req, {
    route: PLACEMENT_COMMAND_ROUTES.effective,
    command: 'placement.effective',
    placementId,
    statusCode: 200,
    parseBody: validateEvidence,
    run: (tx, ctx, value) =>
      placementEffective(tx, {
        actorId: ctx.userId,
        placementId,
        evidence: value.evidence,
      }),
  });
}
