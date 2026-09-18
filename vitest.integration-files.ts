/**
 * vitest.integration-files.ts — SINGLE SOURCE OF TRUTH for the DB-touching lane (G0-04 / RQ-05).
 *
 * These are the ONLY test files that open a real database connection. The list was derived
 * EMPIRICALLY, not by filename suffix: the full suite was run once with an unreachable sentinel
 * DATABASE_URL (`postgresql://blocked:blocked@127.0.0.1:1/blocked`) and the files that errored
 * with "Can't reach database server" were recorded. The `.integration` suffix is NOT a reliable
 * signal here — several `*.integration.test.ts` files are fully mocked and make no connection,
 * while `4role-staffing.integration.test.ts` connects transitively via
 * requireTalentPoolAccess → resolveEffectivePermissions → getPrisma().
 *
 *   - 4 files connect via getPrisma() → process.env.DATABASE_URL (RLS-enforcing writer).
 *   - 2 `*.mp2.test.ts` files are LIVE harnesses gated by describe.skipIf(!MP2_LIVE_SECURITY_CHECK);
 *     they self-skip unless that flag is set, so they are safe in this lane and skip otherwise.
 *   - `live-integration.ops06a.test.ts` (V5-OPS-06A) is gated by describe.skipIf on
 *     OPS06A_LIVE_CHECK=1 plus TEST-only Upstash/DB inputs; registered here so the unit lane
 *     never picks it up.
 *
 * Consumers:
 *   - vitest.unit.config.ts       → EXCLUDES these (unit lane must touch NO DB; fail-closed sentinel).
 *   - vitest.integration.config.ts → INCLUDES only these (DATABASE_URL from DATABASE_URL_TEST only).
 *
 * Re-derive after adding DB tests: run the sentinel classification again (see HANDOFF ops notes).
 */
export const INTEGRATION_TEST_FILES: string[] = [
  'src/shared/auth/rls-context.test.ts',
  'src/shared/auth/matrix-scope.test.ts',
  'src/domains/security/security-matrix.integration.test.ts',
  'src/domains/staffing/4role-staffing.integration.test.ts',
  'src/domains/applications/live-integration.mp2.test.ts',
  'src/domains/applications/security-boundary.mp2.test.ts',
  'src/domains/applications/live-integration.mp3b.test.ts',
  'src/domains/applications/live-integration.mp3c.test.ts',
  'src/domains/applications/live-integration.ops06a.test.ts',
  'src/shared/auth/live-auth-scope.m1-06a.test.ts',
  'src/shared/auth/live-vendor-worker-scope.m1-06b.test.ts',
  'src/shared/auth/live-ticket-rls-scope.m1-07a.test.ts',
  'src/shared/auth/live-rls-posture.m1-07b.test.ts',
  'src/shared/auth/live-ticket-route-boundary.m1-06d.test.ts',
  'src/shared/auth/live-vendor-idor.m1-08.test.ts',
  'src/shared/auth/live-public-read-rls.go-live-04.test.ts',
  // go-live-05 / RQ-13 / STEP-08: LIVE evidence cho projection card (seed thật + cleanup thật).
  'src/domains/job-board/public-card-truth.integration.test.ts',
  // hrp-v6-n3-service-model-placement: DB-touching proof for ServiceModel taxonomy +
  // Placement lifecycle + RLS/GRANT + unique partial index anti-race + FK chain resolve.
  // Self-skips when DATABASE_URL_TEST absent (ENV_BLOCKED — Tier 0/Owner cung cấp DB trước khi xét merge).
  'tests/db/placement-lifecycle-integration.test.ts',
  'src/domains/admin-demand-tree.integration.test.ts',
  'tests/db/referral-attribution-foundation.integration.test.ts',
  // hrp-v6-n2-aff-02-link-capture (Decision A): GET /r/[code] canonical redirect.
  // Validates affCode + job allowlist + hrp_aff cookie + engine context.
  // RUNs (not SKIPs) against live container DB; fails explicitly if DB unavailable.
  'tests/db/attribution-redirect.integration.test.ts',
  // hrp-v6-n2-aff-03-apply-attribution: POST /api/public/intake. Validates cookie
  // → ReferralAttribution lookup, server-clock + status guards, consumption,
  // and LaborProfileHandlingAssignment creation. Requires the additive
  // migration `20260918100000_aff03_writer_select_on_referral_attributions`
  // to be applied (CI Integration lane applies via the standard pipeline).
  'tests/db/aff03-public-intake.integration.test.ts',
];
