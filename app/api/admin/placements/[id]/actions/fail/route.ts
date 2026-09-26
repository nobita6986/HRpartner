/**
 * POST /api/admin/placements/[id]/actions/fail — placement.fail
 * (RQ-01..RQ-19, contract v1.1 §4.1.1).
 *
 * SELECTED | CONFIRMED → FAILED. Service builds `failureReason` server-side;
 * route MUST NOT accept or silently ignore `reason` (C-06). Body must be `{}`.
 *
 * Single transaction boundary (C-03) via `runPlacementCommand`.
 */
import { NextRequest } from 'next/server';
import { placementFail, PLACEMENT_COMMAND_ROUTES } from '@/src/domains/talent/placement.commands';
import { isUuidV4, runPlacementCommand } from '@/src/domains/talent/placement.route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function validateEmptyBody(raw: unknown):
  | { ok: true; value: Record<string, never> }
  | { ok: false; error: string; message: string } {
  if (raw === undefined) return { ok: true, value: {} };
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'VALIDATION', message: 'Body phải là {} hoặc empty' };
  }
  const keys = Object.keys(raw as Record<string, unknown>);
  if (keys.length > 0) {
    return {
      ok: false,
      error: 'VALIDATION',
      message: `Body phải là {}; received unknown field(s): ${keys.join(', ')} (no free-text reason accepted; service builds failureReason server-side)`,
    };
  }
  return { ok: true, value: {} };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: placementId } = await params;
  if (!isUuidV4(placementId)) {
    return new Response(
      JSON.stringify({ error: 'VALIDATION', message: 'placementId phải là UUID v4' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  return runPlacementCommand(req, {
    route: PLACEMENT_COMMAND_ROUTES.fail,
    statusCode: 200,
    parseBody: validateEmptyBody,
    run: (tx, ctx) => placementFail(tx, { actorId: ctx.userId, placementId }),
  });
}
