/**
 * POST /api/admin/placements/[id]/actions/confirm — placement.confirm
 * (RQ-01..RQ-19, contract v1.2 §4.1.1).
 *
 * SELECTED → CONFIRMED. Service writes `confirmedAt` only (C-01).
 * Body must be `{}` — any field is rejected (C-06 strict allowlist).
 *
 * Single transaction boundary (C-03) via `runPlacementCommand`.
 *
 * Round-2 (C-02): auth + role + placementId validation all live in the
 * helper. This route just extracts the URL param and forwards to the
 * pipeline so an unauthenticated request with a malformed id yields 401.
 */
import { NextRequest } from 'next/server';
import { placementConfirm, PLACEMENT_COMMAND_ROUTES } from '@/src/domains/talent/placement.commands';
import { runPlacementCommand } from '@/src/domains/talent/placement.route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ConfirmBodyShape {
  // intentionally empty — body must be `{}`.
  [key: string]: unknown;
}

function validateEmptyBody(raw: unknown):
  | { ok: true; value: Record<string, never> }
  | { ok: false; error: string; message: string } {
  // Allow truly empty body (some clients send no body), or `{}`. Anything else → 400.
  if (raw === undefined) return { ok: true, value: {} };
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
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

  return runPlacementCommand(req, {
    route: PLACEMENT_COMMAND_ROUTES.confirm,
    command: 'placement.confirm',
    placementId,
    statusCode: 200,
    parseBody: validateEmptyBody,
    run: (tx, ctx) => placementConfirm(tx, { actorId: ctx.userId, placementId }),
  });
}
