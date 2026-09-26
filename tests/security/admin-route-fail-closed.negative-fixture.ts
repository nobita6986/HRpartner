/**
 * admin-route-fail-closed.negative-fixture.ts — C-04 NEGATIVE FIXTURE.
 *
 * This file is a NEGATIVE test fixture used by
 * `src/domains/applications/marketplace-inventory.static.test.ts` to prove
 * that the fail-closed delegation detector correctly identifies a
 * mutating admin route that does NOT delegate to `placement.route-helpers.ts`.
 *
 * Required properties of this fixture (asserted by the test):
 *   - It declares `export async function POST` (a mutating handler).
 *   - It does NOT import `placement.route-helpers`.
 *   - It does NOT call `runPlacementCommand`.
 *   - It does NOT match `AUTH_MARKER` directly (no `getAuthContext`, etc.).
 *   - It does NOT delegate to a sibling `handler` module.
 *
 * If a developer accidentally relaxes the detector, this fixture will
 * cause the static test to fail in CI. The fixture file lives OUTSIDE
 * `app/api/admin/` so it does not pollute the production route surface.
 *
 * The fixture is intentionally NOT executed — it is read by the static
 * detector only. It is written in valid TypeScript so the AST/static
 * guard can parse it without errors.
 */
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Intentionally unguarded mutating handler. The detector must flag this
 * pattern if it ever appears inside `app/api/admin/**` (it currently lives
 * in `tests/security/` only). If you copy this into `app/api/admin/`, the
 * marketplace-inventory.static.test.ts `C-04` assertion will fail.
 */
export async function POST(_req: Request, _ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  // No auth context is built. No `placement.route-helpers` import. This is
  // exactly the fail-closed violation the detector is designed to catch.
  const _tx = {} as Prisma.TransactionClient;
  return NextResponse.json({ error: 'NEGATIVE_FIXTURE_NOT_FOR_PRODUCTION' }, { status: 599 });
}
